import json
import os
import tempfile
import asyncio
import re
from celery import shared_task
from app.database import SessionLocal
from app.models import Task
from app.services.deepseek import generate_notes
from app.services.whisper import transcribe_audio
import httpx

BV_PATTERN = re.compile(r"BV[a-zA-Z0-9]{10}")


def _get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _extract_bvid(url: str) -> str | None:
    match = BV_PATTERN.search(url)
    return match.group(0) if match else None


def _download_bilibili_audio(url: str, output_path: str):
    """先尝试 yt-dlp，失败后用 B站 API 直接下载完整视频/音频"""
    # 方案 1：yt-dlp
    try:
        import yt_dlp
        ydl_opts = {
            "format": "bestaudio/best",
            "outtmpl": output_path + ".%(ext)s",
            "quiet": True,
            "no_warnings": True,
            "headers": {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Referer": "https://www.bilibili.com",
            },
        }
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])
        return _find_downloaded_file(output_path)
    except Exception:
        pass  # yt-dlp 失败，继续用 API 方案

    # 方案 2：B站 API 直接下载完整视频流（所有分片合并）
    bvid = _extract_bvid(url)
    if not bvid:
        raise ValueError("无法从链接中提取 BV 号")

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": "https://www.bilibili.com",
    }

    with httpx.Client(timeout=30.0, headers=headers) as client:
        # 1. 获取视频信息 -> cid
        resp = client.get(
            "https://api.bilibili.com/x/web-interface/view",
            params={"bvid": bvid},
        )
        resp.raise_for_status()
        data = resp.json()
        if data.get("code") != 0:
            raise Exception(f"获取视频信息失败: {data.get('message')}")
        cid = data["data"]["cid"]

        # 2. 获取普通格式视频流（fnval=0 返回完整 FLV/MP4 分片列表）
        resp = client.get(
            "https://api.bilibili.com/x/player/playurl",
            params={
                "bvid": bvid,
                "cid": cid,
                "fnval": 0,
                "platform": "html5",
                "high_quality": 1,
            },
        )
        resp.raise_for_status()
        data = resp.json()
        if data.get("code") != 0:
            raise Exception(f"获取视频流失败: {data.get('message')}")

        durl_list = data.get("data", {}).get("durl", [])
        if not durl_list:
            raise Exception("未找到视频流")

        print(f"[DEBUG] B站返回 {len(durl_list)} 个视频分片")
        for i, d in enumerate(durl_list):
            print(f"[DEBUG] 分片 {i+1}: size={d.get('size')}, length={d.get('length')}ms, url={d.get('url', '')[:80]}...")

        # 3. 下载所有分片并合并
        merged_file = output_path + ".mp4"
        total_size = 0
        with open(merged_file, "wb") as out_f:
            for idx, seg in enumerate(durl_list):
                seg_url = seg.get("url")
                if not seg_url:
                    continue
                resp = client.get(
                    seg_url,
                    headers=headers,
                    follow_redirects=True,
                    timeout=300.0,
                )
                resp.raise_for_status()
                chunk_size = len(resp.content)
                total_size += chunk_size
                out_f.write(resp.content)
                print(f"[DEBUG] 分片 {idx+1}/{len(durl_list)} 下载完成: {chunk_size} bytes")

        print(f"[DEBUG] 合并完成: {merged_file}, 总大小: {total_size} bytes, 分片数: {len(durl_list)}")
        if total_size == 0:
            raise Exception("下载的文件为空")

        return merged_file


def _find_downloaded_file(output_path: str) -> str:
    """找到实际下载的文件"""
    if os.path.exists(output_path):
        return output_path
    base, _ = os.path.splitext(output_path)
    for ext in [".webm", ".m4a", ".mp4", ".flv", ".mkv", ".mp3", ".wav", ".m4s"]:
        candidate = base + ext
        if os.path.exists(candidate):
            return candidate
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
            try:
                output_path = os.path.join(tmpdir, "video")
                audio_file = _download_bilibili_audio(source_url, output_path)
            except Exception as e:
                task.status = "failed"
                task.error_message = f"音频下载失败: {str(e)}"
                db.commit()
                return {"task_id": task_id, "status": "failed", "error": str(e)}

            # 2. 调用 GPU Whisper 转录
            try:
                with open(audio_file, "rb") as f:
                    file_data = f.read()
                print(f"[DEBUG] 上传 GPU: {audio_file}, 大小: {len(file_data)} bytes")
                result = asyncio.run(transcribe_audio(file_data, os.path.basename(audio_file)))
                print(f"[DEBUG] GPU 返回: {result}")
                transcript = result.get("text", "")
                if not transcript:
                    transcript = result.get("transcript", "")
                if not transcript:
                    transcript = result.get("result", "")
                task.transcript = transcript
                if not transcript:
                    task.error_message = f"Whisper 返回空转录，原始响应: {json.dumps(result, ensure_ascii=False)[:500]}"
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
