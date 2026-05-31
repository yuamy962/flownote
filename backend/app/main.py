from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.database import engine, Base
from app.routers import auth, tasks

# 自动创建表
Base.metadata.create_all(bind=engine)

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
