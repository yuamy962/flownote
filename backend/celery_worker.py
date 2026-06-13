from datetime import datetime, timezone, timedelta
from celery import Celery
from celery.signals import beat_init
from app.config import settings

celery_app = Celery(
    "flownote",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=["app.tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Asia/Shanghai",
    enable_utc=True,
    beat_schedule={
        "check-subscription-expiry": {
            "task": "celery_worker.check_expired_subscriptions",
            "schedule": 3600.0,  # 每小时检查一次
        },
    },
)


@celery_app.task
def check_expired_subscriptions():
    """检查套餐到期的用户，发送提醒或降级"""
    from app.database import SessionLocal
    from app.models import User
    from app.services.credits import _create_transaction

    db = SessionLocal()
    try:
        now = datetime.now(timezone.utc)

        # 1. 到期前3天提醒
        remind_threshold = now + timedelta(days=3)
        remind_users = db.query(User).filter(
            User.plan != "free",
            User.plan_expires_at <= remind_threshold,
            User.plan_expires_at > now,
        ).all()
        for user in remind_users:
            days_left = max(0, (user.plan_expires_at - now).days)
            print(f"[SubscriptionReminder] User {user.id} plan expires in {days_left} days")
            # TODO: 接入消息通知（微信模板消息/邮件/站内信）

        # 2. 今天到期且开启了 auto_renew → 生成续费订单
        renew_today = db.query(User).filter(
            User.plan != "free",
            User.auto_renew == True,
            User.plan_expires_at <= now,
            User.plan_expires_at > now - timedelta(days=1),
        ).all()
        for user in renew_today:
            print(f"[SubscriptionRenew] User {user.id} auto_renew, generating renewal order")
            # TODO: 生成续费订单并通知用户
            # 这里需要调用 pay 服务的 create_renewal_order，但由于循环导入，暂时用 print 占位

        # 3. 已到期超过48小时 → 降级
        expired = db.query(User).filter(
            User.plan != "free",
            User.plan_expires_at <= now - timedelta(hours=48),
        ).all()
        for user in expired:
            old_plan = user.plan
            old_monthly = user.monthly_minutes or 0

            user.plan = "free"
            user.monthly_minutes = 0
            user.auto_renew = False

            if old_monthly > 0:
                _create_transaction(
                    db, user.id, "subscription_expire", -old_monthly, "monthly",
                    0, description=f"{old_plan}套餐已到期，剩余{old_monthly}分钟已清零"
                )
            print(f"[SubscriptionExpire] User {user.id} downgraded from {old_plan} to free")

        db.commit()
    except Exception as e:
        print(f"[SubscriptionCheck] Error: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    celery_app.start()
