import secrets
import httpx
from datetime import datetime, timedelta
from jose import jwt, JWTError
from app.config import settings


def create_state_token(invite_code: str = "") -> str:
    """生成用于微信 OAuth state 参数的 JWT（防 CSRF）"""
    payload = {
        "nonce": secrets.token_urlsafe(16),
        "exp": datetime.utcnow() + timedelta(minutes=5),
    }
    if invite_code:
        payload["invite_code"] = invite_code
    return jwt.encode(payload, settings.SECRET_KEY, algorithm="HS256")


def verify_state_token(state: str) -> bool:
    try:
        jwt.decode(state, settings.SECRET_KEY, algorithms=["HS256"])
        return True
    except JWTError:
        return False


def get_wechat_auth_url(redirect_uri: str, invite_code: str = "") -> tuple[str, str]:
    """返回 (微信授权URL, state)"""
    state = create_state_token(invite_code=invite_code)
    url = (
        f"https://open.weixin.qq.com/connect/qrconnect"
        f"?appid={settings.WECHAT_APP_ID}"
        f"&redirect_uri={redirect_uri}"
        f"&response_type=code"
        f"&scope=snsapi_login"
        f"&state={state}"
        f"#wechat_redirect"
    )
    return url, state


def get_access_token(code: str) -> dict:
    url = (
        f"https://api.weixin.qq.com/sns/oauth2/access_token"
        f"?appid={settings.WECHAT_APP_ID}"
        f"&secret={settings.WECHAT_APP_SECRET}"
        f"&code={code}"
        f"&grant_type=authorization_code"
    )
    with httpx.Client() as client:
        resp = client.get(url, timeout=30)
        return resp.json()


def get_user_info(access_token: str, openid: str) -> dict:
    url = (
        f"https://api.weixin.qq.com/sns/userinfo"
        f"?access_token={access_token}"
        f"&openid={openid}"
    )
    with httpx.Client() as client:
        resp = client.get(url, timeout=30)
        return resp.json()
