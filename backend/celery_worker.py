from celery import Celery
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
)

if __name__ == "__main__":
    celery_app.start()
