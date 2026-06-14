import subprocess
import shutil
import os


def _find_ffprobe() -> str:
    path = shutil.which("ffprobe")
    if path:
        return path
    for candidate in ["/usr/bin/ffprobe", "/usr/local/bin/ffprobe", "/bin/ffprobe", "/snap/bin/ffprobe"]:
        if os.path.exists(candidate):
            return candidate
    return "ffprobe"


def get_video_duration(file_path: str) -> float:
    """使用 ffprobe 获取视频/音频时长（秒），失败返回 0"""
    try:
        result = subprocess.run(
            f"ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 '{file_path}'",
            shell=True, capture_output=True, text=True, timeout=30
        )
        duration = float(result.stdout.strip())
        return duration
    except Exception:
        return 0.0
