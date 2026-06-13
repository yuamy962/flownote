"""
邀请奖励体系
"""
import random
import string
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.models import User, InviteReward
from app.services.credits import add_permanent_minutes


def generate_invite_code(length: int = 8) -> str:
    """生成随机邀请码：字母+数字，排除易混淆字符"""
    chars = string.ascii_uppercase + string.digits
    chars = chars.translate(str.maketrans("", "", "0O1I"))  # 排除 0,O,1,I
    return "".join(random.choices(chars, k=length))


def get_or_create_invite_code(db: Session, user: User) -> str:
    """获取或生成用户的邀请码"""
    if user.invite_code:
        return user.invite_code
    # 确保唯一
    for _ in range(10):
        code = generate_invite_code()
        exists = db.query(User).filter(User.invite_code == code).first()
        if not exists:
            user.invite_code = code
            db.flush()
            return code
    raise RuntimeError("无法生成唯一邀请码")


def bind_inviter(db: Session, invitee: User, invite_code: str) -> bool:
    """
    绑定邀请关系。
    返回是否成功绑定。
    """
    if not invite_code or invitee.invited_by:
        return False

    inviter = db.query(User).filter(User.invite_code == invite_code).first()
    if not inviter:
        return False
    if inviter.id == invitee.id:
        return False  # 不能邀请自己

    invitee.invited_by = inviter.id

    # 创建邀请奖励记录
    reward = InviteReward(
        inviter_id=inviter.id,
        invitee_id=invitee.id,
        status="registered",
    )
    db.add(reward)
    db.flush()
    return True


def reward_first_task(db: Session, invitee: User) -> dict:
    """
    被邀请人完成首次转录时，双方各 +30 永久分钟。
    返回奖励结果 {"inviter_rewarded": bool, "invitee_rewarded": bool}
    """
    reward = db.query(InviteReward).filter(
        InviteReward.invitee_id == invitee.id,
        InviteReward.status == "registered",
    ).first()

    if not reward:
        return {"inviter_rewarded": False, "invitee_rewarded": False}

    now = datetime.now(timezone.utc)
    desc = "邀请奖励-被邀请人完成首次转录"

    # 邀请人 +30
    add_permanent_minutes(
        db, reward.inviter_id, 30, "invite_first_task",
        reference_id=reward.id, description=desc
    )

    # 被邀请人 +30
    add_permanent_minutes(
        db, invitee.id, 30, "invite_first_task",
        reference_id=reward.id, description=desc
    )

    reward.status = "first_task_done"
    reward.first_task_rewarded_at = now
    db.flush()

    return {"inviter_rewarded": True, "invitee_rewarded": True}


def reward_purchase(db: Session, invitee: User, plan_id: str) -> dict:
    """
    被邀请人购买套餐时，邀请人获得额外奖励。
    返回 {"rewarded": bool, "minutes": int}
    """
    reward = db.query(InviteReward).filter(
        InviteReward.invitee_id == invitee.id,
        InviteReward.status.in_(["registered", "first_task_done"]),
    ).first()

    if not reward:
        return {"rewarded": False, "minutes": 0}

    # 奖励梯度
    reward_map = {
        "basic": 60,
        "basic_year": 120,
        "pro": 150,
        "pro_year": 300,
        "unlimited": 300,
    }
    minutes = reward_map.get(plan_id, 0)
    if minutes <= 0:
        return {"rewarded": False, "minutes": 0}

    now = datetime.now(timezone.utc)
    desc = f"邀请奖励-被邀请人购买{plan_id}套餐"

    add_permanent_minutes(
        db, reward.inviter_id, minutes, "invite_purchase",
        reference_id=reward.id, description=desc
    )

    reward.purchase_plan_id = plan_id
    reward.purchase_reward_minutes = minutes
    reward.purchase_rewarded_at = now
    reward.status = "purchased"
    db.flush()

    return {"rewarded": True, "minutes": minutes}
