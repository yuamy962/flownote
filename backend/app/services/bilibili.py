import re
import httpx


BV_PATTERN = re.compile(r"BV[a-zA-Z0-9]{10}")
PAGE_PATTERN = re.compile(r"[?&]p=(\d+)")


def extract_bvid(url: str) -> str | None:
    match = BV_PATTERN.search(url)
    return match.group(0) if match else None


def extract_page(url: str) -> int:
    match = PAGE_PATTERN.search(url)
    return int(match.group(1)) if match else 1


async def fetch_video_info(bvid: str) -> dict:
    """获取 B 站视频基本信息"""
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.get(
            "https://api.bilibili.com/x/web-interface/view",
            params={"bvid": bvid},
            headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                "Referer": "https://www.bilibili.com",
            },
        )
        resp.raise_for_status()
        data = resp.json()
        if data.get("code") != 0:
            raise Exception(data.get("message", "B站 API 错误"))
        return data["data"]


async def fetch_subtitle_list(bvid: str, cid: int) -> list:
    """获取字幕列表（包含 AI 自动生成字幕）"""
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.get(
            "https://api.bilibili.com/x/player/v2",
            params={"cid": cid, "bvid": bvid},
            headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                "Referer": "https://www.bilibili.com",
            },
        )
        resp.raise_for_status()
        data = resp.json()
        if data.get("code") != 0:
            return []
        subtitle_data = data.get("data", {}).get("subtitle", {})
        # 合并人工字幕和 AI 自动生成字幕
        subtitles = subtitle_data.get("subtitles", [])
        ai_subtitles = subtitle_data.get("ai_subtitles", [])
        return subtitles + ai_subtitles


async def fetch_subtitle_content(subtitle_url: str) -> list[dict]:
    """下载并解析字幕内容"""
    # B 站返回的字幕 URL 有时是 // 开头的
    if subtitle_url.startswith("//"):
        subtitle_url = "https:" + subtitle_url

    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.get(subtitle_url)
        resp.raise_for_status()
        data = resp.json()
        return data.get("body", [])


def format_subtitle(body: list[dict]) -> str:
    """将字幕 body 格式化为带时间戳的文本"""
    lines = []
    for item in body:
        ts = item.get("from", 0)
        mins = int(ts // 60)
        secs = int(ts % 60)
        time_str = f"{mins:02d}:{secs:02d}"
        lines.append(f"[{time_str}] {item.get('content', '')}")
    return "\n".join(lines)


async def parse_bilibili_url(url: str) -> dict:
    """
    解析 B 站链接，支持选集/多 P 视频
    返回视频信息 + 字幕文本（如果有）
    """
    bvid = extract_bvid(url)
    if not bvid:
        raise ValueError("无法从链接中提取 BV 号")

    page_num = extract_page(url)
    info = await fetch_video_info(bvid)

    # 处理选集：根据 p 参数找到对应分 P 的 cid
    pages = info.get("pages", [])
    target_page = None
    for p in pages:
        if p.get("page") == page_num:
            target_page = p
            break

    if target_page:
        cid = target_page["cid"]
        part_title = target_page.get("part", "")
        duration = target_page.get("duration", 0)
    else:
        #  fallback：取第一个
        cid = info["cid"]
        part_title = ""
        duration = info.get("duration", 0)

    title = info.get("title", "")
    if part_title:
        title = f"{title} - {part_title}"

    pic = info.get("pic", "")
    uploader = info.get("owner", {}).get("name", "")

    # 获取字幕
    subtitles = await fetch_subtitle_list(bvid, cid)
    subtitle_text = ""
    if subtitles:
        sub_url = subtitles[0].get("subtitle_url", "")
        if sub_url:
            body = await fetch_subtitle_content(sub_url)
            subtitle_text = format_subtitle(body)

    return {
        "bvid": bvid,
        "cid": cid,
        "title": title,
        "duration": duration,
        "pic": pic,
        "uploader": uploader,
        "has_subtitle": bool(subtitle_text),
        "subtitle_text": subtitle_text,
    }
