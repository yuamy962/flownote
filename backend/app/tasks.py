import json
import os
import tempfile
import asyncio
from celery import shared_task
from app.database import SessionLocal
from app.models import Task
from app.services.deepseek import generate_notes
from app.services.whisper import transcribe_audio


def _get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _download_bilibili_audio(url: str, output_path: str):
    """使用 yt-dlp 下载 B站音频"""
    import yt_dlp
    ydl_opts = {
        "format": "bestaudio/best",
        "outtmpl": output_path,
        "quiet": True,
        "no_warnings": True,
        "headers": {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Referer": "https://www.bilibili.com",
        },
    }
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        ydl.download([url])


def _find_downloaded_file(output_path: str) -> str:
    """yt-dlp 可能会添加后缀，找到实际下载的文件"""
    if os.path.exists(output_path):
        return output_path
    base, _ = os.path.splitext(output_path)
    for ext in [".webm", ".m4a", ".mp4", ".flv", ".mkv", ".mp3", ".wav"]:
        candidate = base + ext
        if os.path.exists(candidate):
            return candidate
    # 尝试通配查找
    import glob
    files = glob.glob(base + ".*")
    if files:
        return files[0]
    raise FileNotFoundError(f"下载后未找到音频文件: {output_path}")


@shared_task(bind=True, max_retries=2, default_retry_delay=30)
def transcribe_video(self, task_id: str, source_url: str = None):
    """Celery 任务：下载音频 → GPU Whisper 转录 → DeepSeek 生成总结"""
    db = next(_get_db())
    try:
        task = db.query(Task).filter(Task.id == task_id).first()
        if not task:
            return {"task_id": task_id, "status": "not_found"}

        task.status = "processing"
        db.commit()

        if not source_url:
            task.status = "failed"
            task.error_message = "缺少视频地址"
            db.commit()
            return {"task_id": task_id, "status": "failed", "error": "missing url"}

        # 1. 下载音频
        with tempfile.TemporaryDirectory() as tmpdir:
            output_path = os.path.join(tmpdir, "audio.%(ext)s")
            try:
                _download_bilibili_audio(source_url, output_path)
                audio_file = _find_downloaded_file(os.path.join(tmpdir, "audio"))
            except Exception as e:
                task.status = "failed"
                task.error_message = f"音频下载失败: {str(e)}"
                db.commit()
                return {"task_id": task_id, "status": "failed", "error": str(e)}

            # 2. 调用 GPU Whisper 转录
            try:
                with open(audio_file, "rb") as f:
                    file_data = f.read()
                result = asyncio.run(transcribe_audio(file_data, os.path.basename(audio_file)))
                transcript = result.get("text", "")
                if not transcript:
                    transcript = result.get("transcript", "")
                task.transcript = transcript
            except Exception as e:
                task.status = "failed"
                task.error_message = f"Whisper 转录失败: {str(e)}"
                db.commit()
                return {"task_id": task_id, "status": "failed", "error": str(e)}

        # 3. 调用 DeepSeek 生成总结
        if task.transcript:
            try:
                ai_result = asyncio.run(generate_notes(task.transcript))
                task.summary = json.dumps(ai_result.get("summary", {}), ensure_ascii=False)
                task.notes = ai_result.get("notes", "")
            except Exception as e:
                task.error_message = f"AI 生成失败: {str(e)}"

        task.status = "done"
        from datetime import datetime
        task.completed_at = datetime.utcnow()
        db.commit()
        return {"task_id": task_id, "status": "done"}

    except Exception as e:
        db.rollback()
        try:
            task = db.query(Task).filter(Task.id == task_id).first()
            if task:
                task.status = "failed"
                task.error_message = f"任务异常: {str(e)}"
                db.commit()
        except:
            pass
        raise self.retry(exc=e)
    finally:
        db.close()
