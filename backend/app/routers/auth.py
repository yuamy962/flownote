import json
from fastapi import APIRouter, Depends, HTTPException, Header
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User
from app.services.auth import hash_password, verify_password, create_access_token, decode_token
from app.services.wechat_auth import (
    get_wechat_auth_url,
    get_access_token,
    get_user_info,
    verify_state_token,
)
from app.config import settings

router = APIRouter(prefix="/auth", tags=["auth"])

WECHAT_REDIRECT_URI = "https://flownote.cn/api/auth/wechat/callback"


@router.post("/register")
def register(payload: dict, db: Session = Depends(get_db)):
    email = payload.get("email", "").strip().lower()
    password = payload.get("password", "")

    if not email or not password:
        raise HTTPException(status_code=400, detail="邮箱和密码不能为空")
    if len(password) < 8:
        raise HTTPException(status_code=400, detail="密码至少 8 位")

    existing = db.query(User).filter(User.email == email).first()
    if existing:
        raise HTTPException(status_code=400, detail="该邮箱已注册")

    user = User(
        email=email,
        password_hash=hash_password(password),
        plan="free",
        monthly_minutes=60,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token({"sub": user.id})
    return {
        "code": 0,
        "data": {
            "token": token,
            "user": {
                "id": user.id,
                "email": user.email or "",
                "nickname": user.nickname or "",
                "avatar": user.avatar or "",
                "plan": user.plan,
                "monthly_minutes": user.monthly_minutes,
            },
        },
    }


@router.post("/login")
def login(payload: dict, db: Session = Depends(get_db)):
    email = payload.get("email", "").strip().lower()
    password = payload.get("password", "")

    if not email or not password:
        raise HTTPException(status_code=400, detail="邮箱和密码不能为空")

    user = db.query(User).filter(User.email == email).first()
    if not user or not user.password_hash or not verify_password(password, user.password_hash):
        raise HTTPException(status_code=401, detail="邮箱或密码错误")

    token = create_access_token({"sub": user.id})
    return {
        "code": 0,
        "data": {
            "token": token,
            "user": {
                "id": user.id,
                "email": user.email or "",
                "nickname": user.nickname or "",
                "avatar": user.avatar or "",
                "plan": user.plan,
                "monthly_minutes": user.monthly_minutes,
            },
        },
    }


@router.get("/me")
def get_me(authorization: str = Header(None), db: Session = Depends(get_db)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="缺少 Token")

    token = authorization.replace("Bearer ", "")
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Token 无效或已过期")

    user_id = payload.get("sub")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="用户不存在")

    from app.models import Task
    total_duration = sum(t.duration or 0 for t in db.query(Task).filter(Task.user_id == user.id).all())
    used_minutes = total_duration // 60

    return {
        "code": 0,
        "data": {
            "id": user.id,
            "email": user.email or "",
            "nickname": user.nickname or "",
            "avatar": user.avatar or "",
            "plan": user.plan,
            "monthly_minutes": user.monthly_minutes,
            "used_minutes": used_minutes,
            "created_at": user.created_at.isoformat() if user.created_at else None,
        },
    }


# ==================== 微信登录 ====================

@router.get("/wechat/login")
def wechat_login():
    if not settings.WECHAT_APP_ID or not settings.WECHAT_APP_SECRET:
        raise HTTPException(status_code=500, detail="微信登录未配置")
    url, state = get_wechat_auth_url(WECHAT_REDIRECT_URI)
    return {"code": 0, "data": {"url": url}}


@router.get("/wechat/callback")
def wechat_callback(code: str = "", state: str = "", db: Session = Depends(get_db)):
    if not code:
        return HTMLResponse(content=_error_html("缺少 code 参数"))

    if not verify_state_token(state):
        return HTMLResponse(content=_error_html("state 验证失败，请重新登录"))

    # 1. 用 code 换 access_token
    token_data = get_access_token(code)
    if "errcode" in token_data:
        return HTMLResponse(
            content=_error_html(f"微信授权失败: {token_data.get('errmsg', '未知错误')}")
        )

    access_token = token_data.get("access_token")
    openid = token_data.get("openid")
    if not access_token or not openid:
        return HTMLResponse(content=_error_html("获取 access_token 失败"))

    # 2. 获取用户信息
    user_info = get_user_info(access_token, openid)
    if "errcode" in user_info:
        return HTMLResponse(
            content=_error_html(f"获取用户信息失败: {user_info.get('errmsg', '未知错误')}")
        )

    nickname = user_info.get("nickname", "")
    avatar = user_info.get("headimgurl", "")

    # 3. 查找或创建用户
    user = db.query(User).filter(User.openid == openid).first()
    if not user:
        user = User(
            openid=openid,
            nickname=nickname,
            avatar=avatar,
            plan="free",
            monthly_minutes=60,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        if nickname and user.nickname != nickname:
            user.nickname = nickname
        if avatar and user.avatar != avatar:
            user.avatar = avatar
        db.commit()
        db.refresh(user)

    # 4. 生成 JWT
    token = create_access_token({"sub": user.id})

    user_data = {
        "id": user.id,
        "email": user.email or "",
        "nickname": user.nickname or "",
        "avatar": user.avatar or "",
        "plan": user.plan,
        "monthly_minutes": user.monthly_minutes,
    }

    # 5. 返回 HTML，通过 postMessage 发送 token
    html = f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>微信登录</title></head>
<body style="font-family:sans-serif;text-align:center;color:#666;padding-top:80px;">
  <p>登录成功，正在跳转...</p>
  <script>
    window.opener.postMessage({{
      type: 'WECHAT_LOGIN_SUCCESS',
      token: {json.dumps(token)},
      user: {json.dumps(user_data)}
    }}, '*');
    setTimeout(function() {{ window.close(); }}, 800);
  </script>
</body>
</html>"""
    return HTMLResponse(content=html)


def _error_html(message: str) -> str:
    return f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>登录失败</title></head>
<body style="font-family:sans-serif;text-align:center;color:#666;padding-top:80px;">
  <h2 style="color:#c00;">登录失败</h2>
  <p>{message}</p>
  <p style="font-size:12px;color:#999;margin-top:20px;">请关闭此窗口，返回原页面重试。</p>
  <script>setTimeout(function() {{ window.close(); }}, 3000);</script>
</body>
</html>"""
