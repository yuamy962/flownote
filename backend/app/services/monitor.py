import httpx
from app.config import settings
from app.database import SessionLocal
from sqlalchemy import text


def check_database() -> dict:
    try:
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
        return {"status": "ok"}
    except Exception as e:
        return {"status": "error", "detail": str(e)[:200]}


def check_redis() -> dict:
    try:
        import redis
        r = redis.from_url(settings.REDIS_URL)
        r.ping()
        return {"status": "ok"}
    except Exception as e:
        return {"status": "error", "detail": str(e)[:200]}


def check_gpu_server() -> dict:
    try:
        resp = httpx.get(f"{settings.HAI_WHISPER_URL}/health", timeout=5.0)
        if resp.status_code == 200:
            return {"status": "ok"}
        return {"status": "error", "detail": f"HTTP {resp.status_code}"}
    except Exception as e:
        return {"status": "error", "detail": str(e)[:200]}


def check_deepseek() -> dict:
    if not settings.DEEPSEEK_API_KEY:
        return {"status": "warn", "detail": "API Key 未配置"}
    return {"status": "ok"}


def run_all_checks() -> dict:
    results = {
        "database": check_database(),
        "redis": check_redis(),
        "gpu_server": check_gpu_server(),
        "deepseek_api": check_deepseek(),
    }
    has_error = any(v["status"] == "error" for v in results.values())
    results["overall"] = "degraded" if has_error else "healthy"
    return results


def send_serverchan(title: str, content: str) -> bool:
    if not settings.SERVERCHAN_KEY:
        print("[Monitor] SERVERCHAN_KEY 未配置，跳过通知")
        return False
    try:
        resp = httpx.post(
            f"https://sctapi.ftqq.com/{settings.SERVERCHAN_KEY}.send",
            data={"title": title, "desp": content},
            timeout=10.0,
        )
        if resp.status_code == 200 and resp.json().get("code") == 0:
            print(f"[Monitor] Server酱通知发送成功: {title}")
            return True
        print(f"[Monitor] Server酱通知发送失败: {resp.text[:200]}")
        return False
    except Exception as e:
        print(f"[Monitor] Server酱通知异常: {e}")
        return False


def check_and_notify():
    results = run_all_checks()
    if results["overall"] == "healthy":
        return results

    error_items = []
    for name, info in results.items():
        if name == "overall":
            continue
        if info["status"] == "error":
            error_items.append(f"- **{name}**: {info.get('detail', '异常')}")

    if not error_items:
        return results

    title = "⚠️ FlowNote 系统异常告警"
    content = f"## 系统异常\n\n以下组件出现问题：\n\n" + "\n".join(error_items)
    content += f"\n\n---\n检测时间: {__import__('datetime').datetime.now(__import__('datetime').timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}"

    send_serverchan(title, content)
    return results
