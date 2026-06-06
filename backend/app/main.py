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
        columns = [c["name"] for c in inspector.get_columns("users")]
        with engine.connect() as conn:
            if "pan_baidu_token" not in columns:
                conn.execute(text("ALTER TABLE users ADD COLUMN pan_baidu_token VARCHAR(512)"))
                print("[MIGRATE] Added column: users.pan_baidu_token")
            if "pan_baidu_refresh" not in columns:
                conn.execute(text("ALTER TABLE users ADD COLUMN pan_baidu_refresh VARCHAR(512)"))
                print("[MIGRATE] Added column: users.pan_baidu_refresh")
            if "pan_baidu_expires" not in columns:
                conn.execute(text("ALTER TABLE users ADD COLUMN pan_baidu_expires DATETIME"))
                print("[MIGRATE] Added column: users.pan_baidu_expires")
            conn.commit()
    except Exception as e:
        print(f"[MIGRATE] Skipped: {e}")

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
