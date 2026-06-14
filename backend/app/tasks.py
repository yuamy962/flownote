import json
import os
import tempfile
import re
import shutil
import subprocess
import math
from celery import shared_task
from app.database import SessionLocal
from app.models import Task, User
from app.services.deepseek import generate_notes
from app.services.whisper import transcribe_audio
from app.services.credits import deduct_minutes, refund_task_minutes, get_user_balance
from app.services.invite import reward_first_task
import httpx

BV_PATTERN = re.compile(r"BV[a-zA-Z0-9]{10}")
PAGE_PATTERN = re.compile(r"[?&]p=(\d+)")


def _get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _extract_bvid(url: str) -> str | None:
    match = BV_PATTERN.search(url)
    return match.group(0) if match else None


def _extract_page(url: str) -> int:
    match = PAGE_PATTERN.search(url)
    return int(match.group(1)) if match else 1


def _merge_segments(segment_files: list, output_file: str):
    """合并视频分片：优先 ffmpeg，否则二进制追加"""
    try:
        list_file = output_file + ".txt"
        with open(list_file, "w") as f:
            for seg in segment_files:
                f.write(f"file '{seg}'\n")
        # 通过 shell 调用 ffmpeg，让 bash 加载用户 PATH
        subprocess.run(
            f"ffmpeg -y -f concat -safe 0 -i '{list_file}' -c copy '{output_file}'",
            shell=True, check=True, capture_output=True,
        )
        print(f"[DEBUG] ffmpeg 合并成功: {output_file}")
        return True
    except Exception as e:
        print(f"[DEBUG] ffmpeg 不可用，使用二进制追加合并: {e}")
        with open(output_file, "wb") as out:
            for seg in segment_files:
                with open(seg, "rb") as f:
                    out.write(f.read())
        print(f"[DEBUG] 二进制合并完成: {output_file}")
        return False


def _find_ffmpeg() -> str:
    """查找 ffmpeg 可执行文件（通过 bash 加载用户 PATH）"""
    import shutil
    path = shutil.which("ffmpeg")
    if path:
        return path
    for candidate in ["/usr/bin/ffmpeg", "/usr/local/bin/ffmpeg", "/bin/ffmpeg", "/snap/bin/ffmpeg"]:
        if os.path.exists(candidate):
            return candidate
    return "ffmpeg"


def _find_ffprobe() -> str:
    """查找 ffprobe 可执行文件"""
    import shutil
    path = shutil.which("ffprobe")
    if path:
        return path
    for candidate in ["/usr/bin/ffprobe", "/usr/local/bin/ffprobe", "/bin/ffprobe", "/snap/bin/ffprobe"]:
        if os.path.exists(candidate):
            return candidate
    return "ffprobe"


def _extract_audio_to_mp3(input_path: str) -> str:
    """用 ffmpeg 从视频/音频中提取纯音频 MP3，大幅减小文件体积"""
    base, _ = os.path.splitext(input_path)
    output_path = base + "_audio.mp3"
    if os.path.exists(output_path):
        return output_path
    try:
        # 通过 shell 调用 ffmpeg，让 bash 加载用户 PATH
        subprocess.run(
            f"ffmpeg -y -i '{input_path}' -vn -acodec libmp3lame -q:a 4 '{output_path}'",
            shell=True, check=True, capture_output=True, timeout=120
        )
        print(f"[DEBUG] ffmpeg 提取音频成功: {output_path}")
        return output_path
    except Exception as e:
        print(f"[DEBUG] ffmpeg 提取音频失败: {e}, 使用原文件")
        return input_path


def _get_audio_duration(file_path: str) -> float:
    """使用 ffprobe 获取音频/视频时长（秒）"""
    try:
        result = subprocess.run(
            f"ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 '{file_path}'",
            shell=True, capture_output=True, text=True, timeout=30
        )
        duration = float(result.stdout.strip())
        return duration
    except Exception as e:
        print(f"[DEBUG] ffprobe 获取时长失败: {e}")
        return 0.0


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

    page_num = _extract_page(url)
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": "https://www.bilibili.com",
    }

    with httpx.Client(timeout=30.0, headers=headers) as client:
        # 1. 获取视频信息，根据 p 参数找对应分 P 的 cid
        resp = client.get(
            "https://api.bilibili.com/x/web-interface/view",
            params={"bvid": bvid},
        )
        resp.raise_for_status()
        data = resp.json()
        if data.get("code") != 0:
            raise Exception(f"获取视频信息失败: {data.get('message')}")

        # 选集处理：根据 p 参数找对应 cid
        pages = data.get("data", {}).get("pages", [])
        cid = None
        for p in pages:
            if p.get("page") == page_num:
                cid = p["cid"]
                break
        if not cid:
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
            print(f"[DEBUG] 分片 {i+1}: size={d.get('size')}, length={d.get('length')}ms")

        # 3. 下载所有分片
        segment_files = []
        for idx, seg in enumerate(durl_list):
            seg_url = seg.get("url")
            if not seg_url:
                continue
            seg_file = output_path + f"_seg{idx}.mp4"
            resp = client.get(
                seg_url,
                headers=headers,
                follow_redirects=True,
                timeout=300.0,
            )
            resp.raise_for_status()
            with open(seg_file, "wb") as f:
                f.write(resp.content)
            segment_files.append(seg_file)
            print(f"[DEBUG] 分片 {idx+1}/{len(durl_list)} 下载完成: {len(resp.content)} bytes")

        # 4. 合并分片
        merged_file = output_path + ".mp4"
        _merge_segments(segment_files, merged_file)

        total_size = os.path.getsize(merged_file)
        print(f"[DEBUG] 合并文件总大小: {total_size} bytes")
        if total_size == 0:
            raise Exception("合并后的文件为空")

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


def _update_task_status(task_id: str, **kwargs):
    """短数据库操作：更新任务状态后立即关闭连接"""
    db = next(_get_db())
    try:
        task = db.query(Task).filter(Task.id == task_id).first()
        if task:
            for key, value in kwargs.items():
                setattr(task, key, value)
            db.commit()
    finally:
        db.close()


def _get_task_field(task_id: str, field: str):
    """短数据库操作：获取任务指定字段值"""
    db = next(_get_db())
    try:
        task = db.query(Task).filter(Task.id == task_id).first()
        return getattr(task, field, None) if task else None
    finally:
        db.close()


@shared_task(bind=True, max_retries=2, default_retry_delay=30)
def transcribe_video(self, task_id: str, source_url: str = None, file_path: str = None):
    """Celery 任务：下载音频 / 读取本地文件 → GPU Whisper 转录 → DeepSeek 生成总结"""
    audio_file = None
    tmpdir = None

    # 1. 更新状态为 processing（短连接）
    _update_task_status(task_id, status="processing", error_message=None)

    try:
        # 2. 获取音频文件（长时间操作，无数据库连接）
        if file_path and os.path.exists(file_path):
            audio_file = file_path
            print(f"[DEBUG] 使用本地文件: {audio_file}, 大小: {os.path.getsize(audio_file)} bytes")
        elif source_url:
            tmpdir = tempfile.mkdtemp()
            try:
                output_path = os.path.join(tmpdir, "video")
                audio_file = _download_bilibili_audio(source_url, output_path)
                print(f"[DEBUG] B站下载完成: {audio_file}")
            except Exception as e:
                shutil.rmtree(tmpdir, ignore_errors=True)
                _update_task_status(task_id, status="failed", error_message=f"音频下载失败: {str(e)}")
                return {"task_id": task_id, "status": "failed", "error": str(e)}
        else:
            _update_task_status(task_id, status="failed", error_message="缺少视频地址或文件")
            return {"task_id": task_id, "status": "failed", "error": "missing source"}

        # 3. 提取纯音频（长时间操作，无数据库连接）
        audio_only_file = _extract_audio_to_mp3(audio_file)
        print(f"[DEBUG] 提取音频: {audio_only_file}, 大小: {os.path.getsize(audio_only_file)} bytes")

        # 4. 获取实际音频时长并更新（短连接）
        actual_duration = _get_audio_duration(audio_only_file)
        if actual_duration > 0:
            _update_task_status(task_id, duration=int(actual_duration))
        else:
            actual_duration = _get_audio_duration(audio_file)
            if actual_duration > 0:
                _update_task_status(task_id, duration=int(actual_duration))

        # 5. 调用 GPU Whisper 转录（长时间操作，无数据库连接）
        try:
            result = transcribe_audio(audio_only_file)
            print(f"[DEBUG] GPU 返回: {result}")
            transcript = result.get("text", "")
            if not transcript:
                transcript = result.get("transcript", "")
            if not transcript:
                transcript = result.get("result", "")
            if not transcript and "segments" in result:
                lines = []
                for seg in result["segments"]:
                    ts = seg.get("start", 0)
                    mins = int(ts // 60)
                    secs = int(ts % 60)
                    text = seg.get("text", "").strip()
                    if text:
                        lines.append(f"[{mins:02d}:{secs:02d}] {text}")
                transcript = "\n".join(lines)
            if not transcript:
                _update_task_status(
                    task_id, status="failed",
                    error_message=f"Whisper 返回空转录，原始响应: {json.dumps(result, ensure_ascii=False)[:500]}"
                )
                return {"task_id": task_id, "status": "failed", "error": "empty transcript"}
        except Exception as e:
            _update_task_status(task_id, status="failed", error_message=f"Whisper 转录失败: {str(e)}")
            return {"task_id": task_id, "status": "failed", "error": str(e)}

        # 6. 调用 DeepSeek 生成总结（长时间操作，无数据库连接）
        try:
            ai_result = generate_notes(transcript)
            summary = json.dumps(ai_result.get("summary", {}), ensure_ascii=False)
            notes = ai_result.get("notes", "")
        except Exception as e:
            _update_task_status(task_id, status="failed", error_message=f"AI 生成失败: {str(e)}")
            return {"task_id": task_id, "status": "failed", "error": str(e)}

        # 7. 更新任务为完成状态（短连接）
        from datetime import datetime, timezone
        _update_task_status(
            task_id, status="done", transcript=transcript,
            summary=summary, notes=notes,
            completed_at=datetime.now(timezone.utc)
        )

        # 8. GPU 转录完成后按实际时长一次性扣费（短连接）
        task_duration = _get_task_field(task_id, "duration")
        if task_duration and task_duration > 0:
            actual_minutes = math.ceil(task_duration / 60)
            db = next(_get_db())
            try:
                task = db.query(Task).filter(Task.id == task_id).first()
                if not task:
                    return {"task_id": task_id, "status": "done"}

                user = db.query(User).filter(User.id == task.user_id).first()
                if user and (task.consumed_minutes or 0) == 0:
                    source_label = "上传视频" if task.source_type == "upload" else "B站视频"
                    deduct_result = deduct_minutes(
                        db, user, actual_minutes,
                        task_id=task.id,
                        description=f"{source_label}《{task.title[:30]}》"
                    )
                    if deduct_result["success"]:
                        task.consumed_minutes = actual_minutes
                        task.cost_type = deduct_result["cost_type"]
                        task.monthly_deducted = deduct_result["monthly_deducted"]
                        task.permanent_deducted = deduct_result["permanent_deducted"]
                        db.commit()
                    else:
                        print(f"[{source_label}] 扣费失败，余额不足。用户ID={user.id}, 需要={actual_minutes}分钟")
                        task.status = "failed"
                        task.error_message = f"转录完成但余额不足，需要 {actual_minutes} 分钟，当前余额 {get_user_balance(user)['total']} 分钟"
                        db.commit()
                        return {"task_id": task_id, "status": "failed", "error": task.error_message}

                # 触发首次转录邀请奖励
                try:
                    reward_first_task(db, user)
                    db.commit()
                except Exception as e:
                    print(f"[InviteReward] Error in transcribe_video: {e}")
                    db.rollback()
            finally:
                db.close()

        # 9. 清理临时文件
        if audio_file and os.path.exists(audio_file):
            try:
                os.remove(audio_file)
                print(f"[DEBUG] 已删除临时文件: {audio_file}")
            except Exception:
                pass
        if tmpdir:
            shutil.rmtree(tmpdir, ignore_errors=True)

        return {"task_id": task_id, "status": "done"}

    except Exception as e:
        # 异常处理：更新任务状态并返还时长（短连接）
        db = next(_get_db())
        try:
            task = db.query(Task).filter(Task.id == task_id).first()
            if task:
                task.status = "failed"
                task.error_message = f"任务异常: {str(e)}"
                db.commit()
                if (task.consumed_minutes or 0) > 0 and task.cost_type not in ("refunded", "pending"):
                    user = db.query(User).filter(User.id == task.user_id).first()
                    if user:
                        refund_task_minutes(
                            db, user,
                            monthly_refund=task.monthly_deducted or 0,
                            permanent_refund=task.permanent_deducted or 0,
                            task_id=task.id,
                            description=f"任务异常返还《{task.title[:30]}》"
                        )
                        task.consumed_minutes = 0
                        task.monthly_deducted = 0
                        task.permanent_deducted = 0
                        task.cost_type = "refunded"
                        db.commit()
        finally:
            db.close()
        raise self.retry(exc=e)
