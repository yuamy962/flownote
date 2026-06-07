from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import inspect, text
from app.database import engine, Base
# 先初始化 Celery app，确保 @shared_task 能正确注册
import celery_worker  # noqa: F401
from app.routers import auth, tasks, pay
# from app.routers import pan  # 网盘功能暂不启用

# 自动创建表
Base.metadata.create_all(bind=engine)

# 自动迁移：检查并添加缺失的列（避免重建数据库丢失数据）
def auto_migrate():
    try:
        inspector = inspect(engine)
        columns = {c["name"]: c for c in inspector.get_columns("users")}
        with engine.connect() as conn:
            # 1. 添加新列（如果不存在）
            if "openid" not in columns:
                conn.execute(text("ALTER TABLE users ADD COLUMN openid VARCHAR(128)"))
                print("[MIGRATE] Added column: users.openid")
            if "nickname" not in columns:
                conn.execute(text("ALTER TABLE users ADD COLUMN nickname VARCHAR(128)"))
                print("[MIGRATE] Added column: users.nickname")
            if "avatar" not in columns:
                conn.execute(text("ALTER TABLE users ADD COLUMN avatar VARCHAR(512)"))
                print("[MIGRATE] Added column: users.avatar")

            # 2. 旧的百度网盘列迁移（保留兼容）
            if "pan_baidu_token" not in columns:
                conn.execute(text("ALTER TABLE users ADD COLUMN pan_baidu_token VARCHAR(512)"))
                print("[MIGRATE] Added column: users.pan_baidu_token")
            if "pan_baidu_refresh" not in columns:
                conn.execute(text("ALTER TABLE users ADD COLUMN pan_baidu_refresh VARCHAR(512)"))
                print("[MIGRATE] Added column: users.pan_baidu_refresh")
            if "pan_baidu_expires" not in columns:
                conn.execute(text("ALTER TABLE users ADD COLUMN pan_baidu_expires DATETIME"))
                print("[MIGRATE] Added column: users.pan_baidu_expires")

            # 3. 重建表以修改 email/password_hash 的 nullable 约束
            # SQLite 不支持 ALTER COLUMN，需要重建表
            email_col = columns.get("email")
            if email_col and not email_col.get("nullable", True):
                print("[MIGRATE] Rebuilding users table to make email/password_hash nullable...")
                conn.execute(text("""
                    CREATE TABLE users_new (
                        id VARCHAR(36) PRIMARY KEY,
                        email VARCHAR(255) UNIQUE,
                        password_hash VARCHAR(255),
                        openid VARCHAR(128) UNIQUE,
                        nickname VARCHAR(128),
                        avatar VARCHAR(512),
                        plan VARCHAR(20) DEFAULT 'free',
                        monthly_minutes INTEGER DEFAULT 60,
                        plan_expires_at DATETIME,
                        pan_baidu_token VARCHAR(512),
                        pan_baidu_refresh VARCHAR(512),
                        pan_baidu_expires DATETIME,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                    )
                """))
                conn.execute(text("""
                    INSERT INTO users_new (
                        id, email, password_hash, openid, nickname, avatar,
                        plan, monthly_minutes, plan_expires_at,
                        pan_baidu_token, pan_baidu_refresh, pan_baidu_expires, created_at
                    ) SELECT
                        id, email, password_hash, openid, nickname, avatar,
                        plan, monthly_minutes, plan_expires_at,
                        pan_baidu_token, pan_baidu_refresh, pan_baidu_expires, created_at
                    FROM users
                """))
                conn.execute(text("DROP TABLE users"))
                conn.execute(text("ALTER TABLE users_new RENAME TO users"))
                print("[MIGRATE] Rebuilt users table successfully")

            # 4. 创建 openid 唯一索引（如果还没有）
            indexes = {idx["name"] for idx in inspector.get_indexes("users")}
            if "ix_users_openid" not in indexes:
                conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS ix_users_openid ON users (openid)"))
                print("[MIGRATE] Created unique index: ix_users_openid")

            conn.commit()
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
