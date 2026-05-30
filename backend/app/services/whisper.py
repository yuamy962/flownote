import httpx
from app.config import settings


async def transcribe_audio(file_data: bytes, filename: str = "audio.wav") -> dict:
    """调用 HAI GPU 的 Whisper 服务"""
    async with httpx.AsyncClient(timeout=300.0) as client:
        files = {"file": (filename, file_data, "audio/wav")}
        resp = await client.post(
            f"{settings.HAI_WHISPER_URL}/transcribe",
            files=files,
        )
        resp.raise_for_status()
        return resp.json()


async def health_check() -> dict:
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(f"{settings.HAI_WHISPER_URL}/health")
        resp.raise_for_status()
        return resp.json()
