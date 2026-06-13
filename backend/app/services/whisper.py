import os
import httpx
from app.config import settings


def transcribe_audio(file_path: str) -> dict:
    """调用 HAI GPU 的 Whisper 服务（同步版本 + 流式上传，避免大文件内存爆炸和超时）"""
    with httpx.Client(timeout=300.0) as client:
        with open(file_path, "rb") as f:
            files = {"file": (os.path.basename(file_path), f, "audio/mpeg")}
            resp = client.post(
                f"{settings.HAI_WHISPER_URL}/transcribe",
                files=files,
            )
        resp.raise_for_status()
        return resp.json()


def health_check() -> dict:
    with httpx.Client(timeout=10.0) as client:
        resp = client.get(f"{settings.HAI_WHISPER_URL}/health")
        resp.raise_for_status()
        return resp.json()
