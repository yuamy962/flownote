from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import inspect, text
from app.database import engine, Base
# 先初始化 Celery app，确保 @shared_task 能正确注册
import celery_worker  # noqa: F401
from app.routers import auth, tasks, pay, credits, invite
# from app.routers import pan  # 网盘功能暂不启用

# 自动创建表
Base.metadata.create_all(bind=engine)


def _add_column_if_not_exists(conn, table, col_name, col_def):
    """辅助：如果列不存在则添加"""
    inspector = inspect(engine)
    cols = {c["name"] for c in inspector.get_columns(table)}
    if col_name not in cols:
        try:
            conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {col_name} {col_def}"))
            print(f"[MIGRATE] Added column: {table}.{col_name}")
        except Exception as e:
            print(f"[MIGRATE] Failed to add {table}.{col_name}: {e}")


def _create_index_if_not_exists(conn, table, idx_name, cols, unique=False):
    """辅助：如果索引不存在则创建"""
    inspector = inspect(engine)
    indexes = {idx["name"] for idx in inspector.get_indexes(table)}
    if idx_name not in indexes:
        u = "UNIQUE" if unique else ""
        conn.execute(text(f"CREATE {u} INDEX IF NOT EXISTS {idx_name} ON {table} ({cols})"))
        print(f"[MIGRATE] Created index: {idx_name}")


# 自动迁移：检查并添加缺失的列（避免重建数据库丢失数据）
def auto_migrate():
    try:
        with engine.connect() as conn:
            # ========== users 表 ==========
            _add_column_if_not_exists(conn, "users", "permanent_minutes", "INTEGER DEFAULT 60")
            _add_column_if_not_exists(conn, "users", "auto_renew", "BOOLEAN DEFAULT 0")
            _add_column_if_not_exists(conn, "users", "invite_code", "VARCHAR(16)")
            _add_column_if_not_exists(conn, "users", "invited_by", "VARCHAR(36)")

            _create_index_if_not_exists(conn, "users", "ix_users_invite_code", "invite_code", unique=True)
            _create_index_if_not_exists(conn, "users", "ix_users_invited_by", "invited_by")

            _add_column_if_not_exists(conn, "users", "openid", "VARCHAR(128)")
            _add_column_if_not_exists(conn, "users", "nickname", "VARCHAR(128)")
            _add_column_if_not_exists(conn, "users", "avatar", "VARCHAR(512)")
            _add_column_if_not_exists(conn, "users", "pan_baidu_token", "VARCHAR(512)")
            _add_column_if_not_exists(conn, "users", "pan_baidu_refresh", "VARCHAR(512)")
            _add_column_if_not_exists(conn, "users", "pan_baidu_expires", "DATETIME")

            _create_index_if_not_exists(conn, "users", "ix_users_openid", "openid", unique=True)

            # ========== tasks 表 ==========
            _add_column_if_not_exists(conn, "tasks", "consumed_minutes", "INTEGER")
            _add_column_if_not_exists(conn, "tasks", "cost_type", "VARCHAR(20) DEFAULT 'free'")

            # ========== orders 表 ==========
            _add_column_if_not_exists(conn, "orders", "is_subscription", "BOOLEAN DEFAULT 0")
            _add_column_if_not_exists(conn, "orders", "subscription_months", "INTEGER DEFAULT 1")

            # ========== plans 表 ==========
            _add_column_if_not_exists(conn, "plans", "validity_days", "INTEGER DEFAULT 30")

            # 同步已有 plan 的 validity_days
            conn.execute(text("UPDATE plans SET validity_days = 30 WHERE validity_days IS NULL OR validity_days = 0"))

            # 更新现有套餐为新的"便宜一半"定价
            # basic: 1500分/600分钟/30天
            conn.execute(text("""
                UPDATE plans SET
                    name = '轻量月卡',
                    price_cent = 1500,
                    duration_minutes = 600,
                    validity_days = 30,
                    description = '600分钟转录时长，适合轻度用户和新手体验',
                    sort_order = 1
                WHERE id = 'basic'
            """))

            # pro: 3500分/6000分钟/30天
            conn.execute(text("""
                UPDATE plans SET
                    name = '专业月卡',
                    price_cent = 3500,
                    duration_minutes = 6000,
                    validity_days = 30,
                    description = '6000分钟转录时长，适合内容创作者和学生党',
                    sort_order = 2
                WHERE id = 'pro'
            """))

            # 将 unlimited 下架（不再售卖，但不删除以免影响历史订单）
            conn.execute(text("""
                UPDATE plans SET
                    name = '已下架',
                    sort_order = 99
                WHERE id = 'unlimited'
            """))

            # 插入年付套餐（如果不存在）
            existing_plan_ids = {row[0] for row in conn.execute(text("SELECT id FROM plans")).fetchall()}
            if "basic_year" not in existing_plan_ids:
                conn.execute(text("""
                    INSERT INTO plans (id, name, price_cent, duration_minutes, validity_days, description, sort_order)
                    VALUES ('basic_year', '轻量年卡', 6900, 7200, 365, '7200分钟转录时长（600分钟/月×12），年付更划算', 3)
                """))
                print("[MIGRATE] Added plan: basic_year")
            if "pro_year" not in existing_plan_ids:
                conn.execute(text("""
                    INSERT INTO plans (id, name, price_cent, duration_minutes, validity_days, description, sort_order)
                    VALUES ('pro_year', '专业年卡', 23900, 72000, 365, '72000分钟转录时长（6000分钟/月×12），重度用户首选', 4)
                """))
                print("[MIGRATE] Added plan: pro_year")

            # 新表已自动创建
            conn.commit()
        print("[MIGRATE] Auto migration completed")
    except Exception as e:
        print(f"[MIGRATE] Error: {e}")


auto_migrate()

app = FastAPI(title="FlowNote API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(tasks.router, prefix="/api")
app.include_router(pay.router, prefix="/api")
app.include_router(credits.router, prefix="/api")
app.include_router(invite.router, prefix="/api")
# app.include_router(pan.router, prefix="/api")  # 网盘功能暂不启用


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "flownote-api"}


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """全局异常处理：确保所有异常都返回 JSON + CORS header"""
    import traceback
    print(f"[ERROR] {exc}")
    traceback.print_exc()
    return JSONResponse(
        status_code=500,
        content={"code": -1, "detail": str(exc)},
        headers={"Access-Control-Allow-Origin": "*"},
    )
