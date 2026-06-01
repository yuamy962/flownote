from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User
from app.services.auth import hash_password, verify_password, create_access_token, decode_token

router = APIRouter(prefix="/auth", tags=["auth"])


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
                "email": user.email,
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
    if not user or not verify_password(password, user.password_hash):
        raise HTTPException(status_code=401, detail="邮箱或密码错误")

    token = create_access_token({"sub": user.id})
    return {
        "code": 0,
        "data": {
            "token": token,
            "user": {
                "id": user.id,
                "email": user.email,
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
            "email": user.email,
            "plan": user.plan,
            "monthly_minutes": user.monthly_minutes,
            "used_minutes": used_minutes,
            "created_at": user.created_at.isoformat() if user.created_at else None,
        },
    }
