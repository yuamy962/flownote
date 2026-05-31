import json
import httpx
from app.config import settings

SYSTEM_PROMPT = """你是一位专业的学习笔记助手。请根据用户提供的视频转录文本，生成一份高质量的学习总结和结构化笔记。

你必须严格按照以下 JSON 格式输出，不要输出任何其他内容：

{
  "summary": {
    "overview": "用 2-3 句话概括视频核心内容",
    "points": ["核心要点1", "核心要点2", "核心要点3", "核心要点4"],
    "audience": "适合什么人群学习",
    "suggestion": "学习建议"
  },
  "notes": "# 学习笔记\\n\\n## 一、...\\n\\n正文内容..."
}

笔记要求：
- 使用标准 Markdown 格式
- 包含标题层级、要点列表、代码块（如有编程内容）
- 适合学生复习使用
- 笔记长度控制在 1500-3000 字
"""


async def generate_notes(transcript: str) -> dict:
    """
    调用 DeepSeek API 生成总结和笔记
    返回: { "summary": {...}, "notes": "..." }
    """
    if not settings.DEEPSEEK_API_KEY:
        # 没有配置 API Key，返回 mock 数据
        return _mock_result(transcript)

    async with httpx.AsyncClient(timeout=120.0) as client:
        resp = await client.post(
            settings.DEEPSEEK_API_URL,
            headers={
                "Authorization": f"Bearer {settings.DEEPSEEK_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": "deepseek-chat",
                "messages": [
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": f"以下是视频转录文本，请生成总结和笔记：\n\n{transcript[:8000]}"},
                ],
                "temperature": 0.7,
                "max_tokens": 4000,
            },
        )
        resp.raise_for_status()
        data = resp.json()
        content = data["choices"][0]["message"]["content"]

        # 解析 JSON
        try:
            result = json.loads(content)
            return {
                "summary": result.get("summary", {}),
                "notes": result.get("notes", ""),
            }
        except json.JSONDecodeError:
            # 如果模型没有严格按 JSON 输出，尝试提取
            return _parse_fallback(content)


def _mock_result(transcript: str) -> dict:
    """Mock 结果，用于未配置 DeepSeek API Key 时"""
    title_hint = transcript[:20] if transcript else "本视频"
    return {
        "summary": {
            "overview": f"本视频讲解了{title_hint}...的核心概念和实战技巧，内容系统全面，适合初学者入门。",
            "points": [
                "掌握了核心概念的基本原理",
                "学会了常见的实战方法和技巧",
                "了解了最佳实践和常见误区",
                "建立了系统的知识框架",
            ],
            "audience": "零基础想学习相关内容的学生和开发者",
            "suggestion": "建议边看边动手实践，跟着视频写一遍代码",
        },
        "notes": f"# 学习笔记\n\n## 一、核心概念\n\n{title_hint}...\n\n## 二、实战要点\n\n- 要点一\n- 要点二\n- 要点三\n\n## 三、总结\n\n建议多复习巩固。",
    }


def _parse_fallback(content: str) -> dict:
    """Fallback 解析，尝试从非 JSON 输出中提取内容"""
    summary = {
        "overview": "本视频内容丰富，建议结合实践加深理解。",
        "points": ["核心要点待整理"],
        "audience": "相关学习者",
        "suggestion": "建议多动手实践",
    }
    notes = content

    # 尝试找 JSON 块
    if "```json" in content:
        try:
            json_str = content.split("```json")[1].split("```")[0].strip()
            result = json.loads(json_str)
            summary = result.get("summary", summary)
            notes = result.get("notes", notes)
        except Exception:
            pass

    return {"summary": summary, "notes": notes}
