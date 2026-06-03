import httpx
from datetime import datetime, timedelta
from app.config import settings

AUTH_URL = "https://openapi.baidu.com/oauth/2.0/authorize"
TOKEN_URL = "https://openapi.baidu.com/oauth/2.0/token"
FILE_LIST_URL = "https://pan.baidu.com/rest/2.0/xpan/file"
FILE_META_URL = "https://pan.baidu.com/rest/2.0/xpan/multimedia"


def get_auth_url(state: str = "") -> str:
    """生成百度网盘 OAuth 授权 URL"""
    params = {
        "response_type": "code",
        "client_id": settings.BAIDU_PAN_APP_KEY,
        "redirect_uri": settings.BAIDU_PAN_REDIRECT_URI,
        "scope": "basic,netdisk",
        "display": "popup",
    }
    if state:
        params["state"] = state
    query = "&".join(f"{k}={v}" for k, v in params.items())
    return f"{AUTH_URL}?{query}"


async def get_token_by_code(code: str) -> dict:
    """用 code 换 access_token"""
    params = {
        "grant_type": "authorization_code",
        "code": code,
        "client_id": settings.BAIDU_PAN_APP_KEY,
        "client_secret": settings.BAIDU_PAN_SECRET_KEY,
        "redirect_uri": settings.BAIDU_PAN_REDIRECT_URI,
    }
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.get(TOKEN_URL, params=params)
        resp.raise_for_status()
        return resp.json()


async def refresh_token(refresh_token: str) -> dict:
    """刷新 access_token"""
    params = {
        "grant_type": "refresh_token",
        "refresh_token": refresh_token,
        "client_id": settings.BAIDU_PAN_APP_KEY,
        "client_secret": settings.BAIDU_PAN_SECRET_KEY,
    }
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.get(TOKEN_URL, params=params)
        resp.raise_for_status()
        return resp.json()


async def list_files(access_token: str, path: str = "/", order: str = "time") -> list:
    """获取网盘文件列表"""
    params = {
        "method": "list",
        "access_token": access_token,
        "dir": path,
        "order": order,
        "desc": "1",
        "limit": "100",
    }
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.get(FILE_LIST_URL, params=params)
        resp.raise_for_status()
        data = resp.json()
        if data.get("errno") != 0:
            raise Exception(f"百度网盘 API 错误: {data}")
        return data.get("list", [])


async def get_download_link(access_token: str, fsids: list[int]) -> list:
    """获取文件下载链接"""
    params = {
        "method": "filemetas",
        "access_token": access_token,
        "fsids": f"[{','.join(map(str, fsids))}]",
        "dlink": "1",
    }
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.get(FILE_META_URL, params=params)
        resp.raise_for_status()
        data = resp.json()
        if data.get("errno") != 0:
            raise Exception(f"百度网盘 API 错误: {data}")
        return data.get("list", [])


async def download_file(url: str, output_path: str):
    """下载文件到本地"""
    headers = {"User-Agent": "Mozilla/5.0"}
    async with httpx.AsyncClient(timeout=300.0, follow_redirects=True) as client:
        resp = await client.get(url, headers=headers)
        resp.raise_for_status()
        with open(output_path, "wb") as f:
            for chunk in resp.iter_bytes(chunk_size=65536):
                f.write(chunk)
