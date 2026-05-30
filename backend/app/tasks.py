from celery import shared_task
import httpx
from app.config import settings


@shared_task(bind=True, max_retries=2)
def transcribe_video(self, task_id: str, audio_url: str = None):
    """
    Celery 任务：调用 HAI GPU 进行 Whisper 转录
    TODO: 实现音频下载 + Whisper 调用 + 结果回写数据库
    """
    # 占位实现，后续补充完整逻辑
    return {"task_id": task_id, "status": "placeholder"}


@shared_task(bind=True, max_retries=2)
def generate_ai_summary(self, task_id: str, transcript: str):
    """
    Celery 任务：调用 DeepSeek API 生成总结和笔记
    TODO: 实现 DeepSeek API 调用
    """
    # 占位实现
    return {"task_id": task_id, "status": "placeholder"}
