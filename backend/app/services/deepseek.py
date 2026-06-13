import json
import re
import httpx
from app.config import settings

SYSTEM_PROMPT = """你是一位专业的学习笔记助手。请根据用户提供的视频转录文本，生成一份高质量的学习总结和结构化笔记。

输出要求：
1. 必须使用 JSON 格式输出
2. summary.overview：用 2-3 句话精准概括视频核心内容，要具体到视频讲的知识点，不能泛泛而谈
3. summary.points：列出 4-6 个核心要点，每个要点要具体、有信息量
4. summary.audience：明确适合的学习人群
5. summary.suggestion：给出具体可操作的学习建议
6. notes：用标准 Markdown 格式写学习笔记，包含：
   - 一级标题 `#` 作为总标题
   - 二级标题 `##` 划分知识模块
   - 三级标题 `###` 细分知识点
   - 无序列表 `-` 列举要点
   - 代码块（如果涉及代码）
   - 笔记长度 2000-4000 字，内容要详细、有深度

注意：只输出 JSON，不要输出任何其他文字。"""


def generate_notes(transcript: str) -> dict:
    """
    调用 DeepSeek API 生成总结和笔记（同步版本，避免 Celery fork 环境中 asyncio 问题）
    返回: { "summary": {...}, "notes": "..." }
    """
    if not settings.DEEPSEEK_API_KEY:
        return _mock_result(transcript)

    # 转录文本截断到 12000 字符，保留更多内容
    trimmed = transcript[:12000] if transcript else ""

    with httpx.Client(timeout=180.0) as client:
        resp = client.post(
            settings.DEEPSEEK_API_URL,
            headers={
                "Authorization": f"Bearer {settings.DEEPSEEK_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": "deepseek-chat",
                "messages": [
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": f"以下是视频转录文本（可能截断），请生成高质量总结和笔记：\n\n{trimmed}"},
                ],
                "temperature": 0.5,
                "max_tokens": 4000,
                "response_format": {"type": "json_object"},
            },
        )
        resp.raise_for_status()
        data = resp.json()
        content = data["choices"][0]["message"]["content"]

        # 解析 JSON
        try:
            result = json.loads(content)
            return _normalize_result(result)
        except json.JSONDecodeError:
            return _parse_fallback(content)


def _normalize_result(result: dict) -> dict:
    """规范化 DeepSeek 返回的结果"""
    summary = result.get("summary", {})
    notes = result.get("notes", "")

    # 确保 summary 字段完整
    if isinstance(summary, dict):
        summary = {
            "overview": summary.get("overview", ""),
            "points": summary.get("points", []),
            "audience": summary.get("audience", ""),
            "suggestion": summary.get("suggestion", ""),
        }
    else:
        summary = {"overview": "", "points": [], "audience": "", "suggestion": ""}

    # 如果 notes 不是字符串，尝试转换
    if not isinstance(notes, str):
        notes = str(notes)

    return {"summary": summary, "notes": notes}


def _mock_result(transcript: str) -> dict:
    """Mock 结果，用于未配置 DeepSeek API Key 时"""
    title_hint = transcript[:30] if transcript else "本视频"
    return {
        "summary": {
            "overview": f"本视频深入讲解了{title_hint}的核心知识体系，从基础概念到进阶应用进行了系统梳理，内容详实且结构清晰。",
            "points": [
                f"理解{title_hint}的基本定义与核心原理",
                "掌握关键知识点与实战应用场景",
                "学会常见问题的分析与解决方法",
                "建立系统化的知识框架与思维模型",
            ],
            "audience": "对相关内容感兴趣的学习者和开发者",
            "suggestion": "建议边看边做笔记，结合实际案例反复练习巩固",
        },
        "notes": f"# {title_hint} 学习笔记\n\n## 一、核心概念\n\n{title_hint}的核心定义与基本原理...\n\n## 二、重点内容\n\n- 知识点一：详细说明...\n- 知识点二：详细说明...\n- 知识点三：详细说明...\n\n## 三、实战应用\n\n结合实际场景的应用方法...\n\n## 四、总结与建议\n\n建议多复习、多动手实践，加深理解。",
    }


def _parse_fallback(content: str) -> dict:
    """Fallback 解析，尝试从非 JSON 输出中提取内容"""
    # 尝试找 JSON 块
    json_blocks = re.findall(r'```json\s*(.*?)\s*```', content, re.DOTALL)
    if not json_blocks:
        json_blocks = re.findall(r'\{[\s\S]*"summary"[\s\S]*"notes"[\s\S]*\}', content)

    if json_blocks:
        try:
            result = json.loads(json_blocks[0])
            return _normalize_result(result)
        except Exception:
            pass

    # 智能提取：尝试从文本中直接提取 summary 和 notes
    summary = {"overview": "", "points": [], "audience": "", "suggestion": ""}
    notes = content

    # 提取 overview
    overview_match = re.search(r'(?:overview|摘要|概述)["\']?\s*[:：]\s*["\']?(.*?)(?:[\n",\}]|points|要点)', content, re.DOTALL | re.IGNORECASE)
    if overview_match:
        summary["overview"] = overview_match.group(1).strip().strip('"\',')

    # 提取 points
    points_matches = re.findall(r'["\']?(.*?)["\']?(?:,|\n|\})', content)
    summary["points"] = [p.strip().strip('"\'') for p in points_matches if len(p.strip()) > 10 and len(p.strip()) < 200][:6]

    # 如果还是空的，返回 mock
    if not summary["overview"] and not summary["points"]:
        return _mock_result(content)

    return {"summary": summary, "notes": notes}
