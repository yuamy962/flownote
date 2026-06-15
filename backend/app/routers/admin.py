import json
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, Header, Query
from sqlalchemy import func, text
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, Task, Order, Plan, CreditTransaction
from app.config import settings

router = APIRouter(prefix="/admin", tags=["admin"])


def verify_admin(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="未授权")
    token = authorization.replace("Bearer ", "")
    if token != settings.ADMIN_PASSWORD:
        raise HTTPException(status_code=401, detail="密码错误")
    return True


@router.get("/stats")
def get_stats(_: bool = Depends(verify_admin), db: Session = Depends(get_db)):
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_ago = now - timedelta(days=7)
    month_ago = now - timedelta(days=30)

    total_users = db.query(func.count(User.id)).scalar() or 0
    new_users_today = db.query(func.count(User.id)).filter(User.created_at >= today_start).scalar() or 0
    new_users_week = db.query(func.count(User.id)).filter(User.created_at >= week_ago).scalar() or 0

    total_tasks = db.query(func.count(Task.id)).scalar() or 0
    done_tasks = db.query(func.count(Task.id)).filter(Task.status == "done").scalar() or 0
    failed_tasks = db.query(func.count(Task.id)).filter(Task.status == "failed").scalar() or 0
    processing_tasks = db.query(func.count(Task.id)).filter(Task.status == "processing").scalar() or 0
    pending_tasks = db.query(func.count(Task.id)).filter(Task.status == "pending").scalar() or 0
    tasks_today = db.query(func.count(Task.id)).filter(Task.created_at >= today_start).scalar() or 0
    tasks_week = db.query(func.count(Task.id)).filter(Task.created_at >= week_ago).scalar() or 0

    success_rate = round(done_tasks / total_tasks * 100, 1) if total_tasks > 0 else 0

    total_revenue = db.query(func.sum(Order.amount_cent)).filter(Order.status == "paid").scalar() or 0
    revenue_today = db.query(func.sum(Order.amount_cent)).filter(
        Order.status == "paid", Order.paid_at >= today_start
    ).scalar() or 0
    revenue_week = db.query(func.sum(Order.amount_cent)).filter(
        Order.status == "paid", Order.paid_at >= week_ago
    ).scalar() or 0
    revenue_month = db.query(func.sum(Order.amount_cent)).filter(
        Order.status == "paid", Order.paid_at >= month_ago
    ).scalar() or 0

    paid_orders_count = db.query(func.count(Order.id)).filter(Order.status == "paid").scalar() or 0

    plan_distribution = db.query(User.plan, func.count(User.id)).group_by(User.plan).all()
    plan_dist = {p: c for p, c in plan_distribution}

    source_distribution = db.query(Task.source_type, func.count(Task.id)).group_by(Task.source_type).all()
    source_dist = {s: c for s, c in source_distribution}

    active_users_week = db.query(func.count(func.distinct(Task.user_id))).filter(
        Task.created_at >= week_ago
    ).scalar() or 0

    total_consumed_minutes = db.query(func.sum(Task.consumed_minutes)).filter(
        Task.consumed_minutes.isnot(None)
    ).scalar() or 0

    gpu_status = "unknown"
    try:
        import httpx
        resp = httpx.get(f"{settings.HAI_WHISPER_URL}/health", timeout=5.0)
        if resp.status_code == 200:
            gpu_status = "ok"
        else:
            gpu_status = f"error_{resp.status_code}"
    except Exception:
        gpu_status = "unreachable"

    recent_tasks = db.query(Task).order_by(Task.created_at.desc()).limit(10).all()
    recent_tasks_list = [
        {
            "id": t.id,
            "title": t.title,
            "status": t.status,
            "source_type": t.source_type,
            "duration": t.duration,
            "consumed_minutes": t.consumed_minutes,
            "created_at": t.created_at.isoformat() if t.created_at else None,
        }
        for t in recent_tasks
    ]

    recent_orders = db.query(Order).filter(Order.status == "paid").order_by(Order.paid_at.desc()).limit(10).all()
    recent_orders_list = [
        {
            "id": o.id,
            "plan_id": o.plan_id,
            "amount_yuan": round(o.amount_cent / 100, 2),
            "paid_at": o.paid_at.isoformat() if o.paid_at else None,
        }
        for o in recent_orders
    ]

    daily_stats = db.execute(text("""
        SELECT DATE(created_at AT TIME ZONE 'Asia/Shanghai') as day,
               COUNT(*) as tasks,
               COUNT(*) FILTER (WHERE status = 'done') as done,
               COUNT(*) FILTER (WHERE status = 'failed') as failed
        FROM tasks
        WHERE created_at >= :start
        GROUP BY day
        ORDER BY day DESC
        LIMIT 14
    """), {"start": now - timedelta(days=14)}).fetchall()

    daily_chart = [
        {"date": str(row[0]), "tasks": row[1], "done": row[2], "failed": row[3]}
        for row in daily_stats
    ]

    daily_revenue = db.execute(text("""
        SELECT DATE(paid_at AT TIME ZONE 'Asia/Shanghai') as day,
               SUM(amount_cent) as revenue,
               COUNT(*) as orders
        FROM orders
        WHERE status = 'paid' AND paid_at >= :start
        GROUP BY day
        ORDER BY day DESC
        LIMIT 14
    """), {"start": now - timedelta(days=14)}).fetchall()

    revenue_chart = [
        {"date": str(row[0]), "revenue_yuan": round(row[1] / 100, 2), "orders": row[2]}
        for row in daily_revenue
    ]

    return {
        "code": 0,
        "data": {
            "users": {
                "total": total_users,
                "new_today": new_users_today,
                "new_week": new_users_week,
                "active_week": active_users_week,
                "plan_distribution": plan_dist,
            },
            "tasks": {
                "total": total_tasks,
                "done": done_tasks,
                "failed": failed_tasks,
                "processing": processing_tasks,
                "pending": pending_tasks,
                "today": tasks_today,
                "week": tasks_week,
                "success_rate": success_rate,
                "source_distribution": source_dist,
                "total_consumed_minutes": total_consumed_minutes,
            },
            "revenue": {
                "total_yuan": round(total_revenue / 100, 2),
                "today_yuan": round(revenue_today / 100, 2),
                "week_yuan": round(revenue_week / 100, 2),
                "month_yuan": round(revenue_month / 100, 2),
                "paid_orders_count": paid_orders_count,
            },
            "system": {
                "gpu_status": gpu_status,
                "gpu_url": settings.HAI_WHISPER_URL,
            },
            "recent_tasks": recent_tasks_list,
            "recent_orders": recent_orders_list,
            "daily_chart": daily_chart,
            "revenue_chart": revenue_chart,
        },
    }


@router.get("/users")
def list_users(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    _: bool = Depends(verify_admin),
    db: Session = Depends(get_db),
):
    offset = (page - 1) * size
    users = db.query(User).order_by(User.created_at.desc()).offset(offset).limit(size).all()
    total = db.query(func.count(User.id)).scalar() or 0

    items = []
    for u in users:
        task_count = db.query(func.count(Task.id)).filter(Task.user_id == u.id).scalar() or 0
        items.append({
            "id": u.id,
            "nickname": u.nickname,
            "plan": u.plan,
            "monthly_minutes": u.monthly_minutes,
            "permanent_minutes": u.permanent_minutes,
            "plan_expires_at": u.plan_expires_at.isoformat() if u.plan_expires_at else None,
            "task_count": task_count,
            "created_at": u.created_at.isoformat() if u.created_at else None,
        })

    return {"code": 0, "data": {"total": total, "page": page, "size": size, "items": items}}


@router.get("/health-detail")
def health_detail(_: bool = Depends(verify_admin), db: Session = Depends(get_db)):
    checks = {}

    try:
        db.execute(text("SELECT 1"))
        checks["database"] = "ok"
    except Exception as e:
        checks["database"] = f"error: {str(e)[:100]}"

    try:
        import redis
        r = redis.from_url(settings.REDIS_URL)
        r.ping()
        checks["redis"] = "ok"
    except Exception as e:
        checks["redis"] = f"error: {str(e)[:100]}"

    try:
        import httpx
        resp = httpx.get(f"{settings.HAI_WHISPER_URL}/health", timeout=5.0)
        checks["gpu_server"] = "ok" if resp.status_code == 200 else f"error_{resp.status_code}"
    except Exception as e:
        checks["gpu_server"] = f"unreachable: {str(e)[:100]}"

    try:
        from app.services.deepseek import generate_notes
        checks["deepseek_api"] = "configured" if settings.DEEPSEEK_API_KEY else "not_configured"
    except Exception:
        checks["deepseek_api"] = "error"

    all_ok = all(v == "ok" or v == "configured" for v in checks.values())

    return {
        "code": 0,
        "data": {
            "status": "healthy" if all_ok else "degraded",
            "checks": checks,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        },
    }
