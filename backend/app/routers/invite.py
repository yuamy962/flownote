from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, InviteReward
from app.services.auth import decode_token
from app.services.invite import get_or_create_invite_code

router = APIRouter(prefix="/invite", tags=["invite"])


def get_current_user(authorization: str = Header(None), db: Session = Depends(get_db)) -> User:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="缺少 Token")
    token = authorization.replace("Bearer ", "")
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Token 无效或已过期")
    user = db.query(User).filter(User.id == payload.get("sub")).first()
    if not user:
        raise HTTPException(status_code=401, detail="用户不存在")
    return user


@router.get("/info")
def get_invite_info(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """获取我的邀请信息"""
    code = get_or_create_invite_code(db, user)
    db.commit()

    rewards = db.query(InviteReward).filter(InviteReward.inviter_id == user.id).all()
    total_invited = len(rewards)
    first_task_rewarded = sum(1 for r in rewards if r.first_task_rewarded_at)
    purchase_rewarded = sum(1 for r in rewards if r.purchase_rewarded_at)
    total_reward_minutes = sum(
        (30 if r.first_task_rewarded_at else 0) + r.purchase_reward_minutes
        for r in rewards
    )

    return {
        "code": 0,
        "data": {
            "invite_code": code,
            "invite_url": f"https://flownote.cn?invite={code}",
            "total_invited": total_invited,
            "first_task_rewarded": first_task_rewarded,
            "purchase_rewarded": purchase_rewarded,
            "total_reward_minutes": total_reward_minutes,
        },
    }


@router.get("/list")
def list_invites(
    page: int = 1,
    size: int = 20,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """我邀请的人列表"""
    offset = (page - 1) * size
    rewards = (
        db.query(InviteReward)
        .filter(InviteReward.inviter_id == user.id)
        .order_by(InviteReward.created_at.desc())
        .offset(offset)
        .limit(size)
        .all()
    )
    total = db.query(InviteReward).filter(InviteReward.inviter_id == user.id).count()

    # 批量查询被邀请人信息
    invitee_ids = [r.invitee_id for r in rewards]
    invitees = {u.id: u for u in db.query(User).filter(User.id.in_(invitee_ids)).all()}

    return {
        "code": 0,
        "data": {
            "total": total,
            "page": page,
            "size": size,
            "items": [
                {
                    "invitee_id": r.invitee_id,
                    "invitee_nickname": invitees.get(r.invitee_id, {}).nickname or "未知用户",
                    "status": r.status,
                    "first_task_rewarded_at": r.first_task_rewarded_at.isoformat() if r.first_task_rewarded_at else None,
                    "purchase_plan_id": r.purchase_plan_id,
                    "purchase_reward_minutes": r.purchase_reward_minutes,
                    "created_at": r.created_at.isoformat() if r.created_at else None,
                }
                for r in rewards
            ],
        },
    }
