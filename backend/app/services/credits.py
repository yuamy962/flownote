"""
双轨时长管理：订阅时长(monthly) + 永久时长(permanent)
"""
import math
from datetime import datetime
from sqlalchemy.orm import Session
from app.models import User, CreditTransaction


TRANSACTION_TYPES = {
    "initial": "新用户初始赠送",
    "purchase_subscription": "购买订阅套餐",
    "purchase_permanent": "购买永久时长包",
    "invite_first_task": "邀请奖励-首次转录",
    "invite_purchase": "邀请奖励-被邀请人购买",
    "task_consume_monthly": "转录消耗-订阅时长",
    "task_consume_permanent": "转录消耗-永久时长",
    "task_refund": "转录失败-时长返还",
    "subscription_expire": "套餐到期-订阅时长清零",
    "admin_adjust": "管理员调整",
}


def _create_transaction(
    db: Session,
    user_id: str,
    tx_type: str,
    amount: int,
    balance_type: str,
    balance_after: int,
    reference_id: str = None,
    description: str = None,
):
    """写入流水记录"""
    tx = CreditTransaction(
        user_id=user_id,
        type=tx_type,
        amount=amount,
        balance_type=balance_type,
        balance_after=balance_after,
        reference_id=reference_id,
        description=description or TRANSACTION_TYPES.get(tx_type, ""),
    )
    db.add(tx)
    db.flush()
    return tx


def add_permanent_minutes(
    db: Session,
    user_id: str,
    minutes: int,
    tx_type: str,
    reference_id: str = None,
    description: str = None,
):
    """增加永久时长（用于奖励、购买永久包等）"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return None
    user.permanent_minutes = (user.permanent_minutes or 0) + minutes
    _create_transaction(
        db, user_id, tx_type, minutes, "permanent",
        user.permanent_minutes, reference_id, description
    )
    db.flush()
    return user


def add_monthly_minutes(
    db: Session,
    user_id: str,
    minutes: int,
    tx_type: str,
    reference_id: str = None,
    description: str = None,
):
    """增加订阅时长（用于购买套餐）"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return None
    user.monthly_minutes = (user.monthly_minutes or 0) + minutes
    _create_transaction(
        db, user_id, tx_type, minutes, "monthly",
        user.monthly_minutes, reference_id, description
    )
    db.flush()
    return user


def set_subscription_minutes(
    db: Session,
    user_id: str,
    minutes: int,
    reference_id: str = None,
    description: str = None,
):
    """
    设置订阅时长（购买套餐时覆盖，不是累加）
    返回变动量
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return None
    old = user.monthly_minutes or 0
    user.monthly_minutes = minutes
    delta = minutes - old
    _create_transaction(
        db, user_id, "purchase_subscription", delta, "monthly",
        user.monthly_minutes, reference_id, description
    )
    db.flush()
    return user


def deduct_minutes(
    db: Session,
    user: User,
    minutes_needed: int,
    task_id: str = None,
    description: str = None,
) -> dict:
    """
    扣费时优先扣 monthly，不足扣 permanent
    返回: {"success": bool, "monthly_deducted": int, "permanent_deducted": int, "cost_type": str}
    """
    now = datetime.utcnow()

    # unlimited 套餐且未过期 → 直接通过
    if user.plan == "unlimited" and user.plan_expires_at and user.plan_expires_at > now:
        return {
            "success": True,
            "monthly_deducted": 0,
            "permanent_deducted": 0,
            "cost_type": "unlimited",
        }

    total = (user.monthly_minutes or 0) + (user.permanent_minutes or 0)
    if total < minutes_needed:
        return {
            "success": False,
            "monthly_deducted": 0,
            "permanent_deducted": 0,
            "cost_type": "",
        }

    monthly_d = min(user.monthly_minutes or 0, minutes_needed)
    permanent_d = minutes_needed - monthly_d

    if monthly_d > 0:
        user.monthly_minutes = (user.monthly_minutes or 0) - monthly_d
        _create_transaction(
            db, user.id, "task_consume_monthly", -monthly_d, "monthly",
            user.monthly_minutes, task_id, description
        )

    if permanent_d > 0:
        user.permanent_minutes = (user.permanent_minutes or 0) - permanent_d
        _create_transaction(
            db, user.id, "task_consume_permanent", -permanent_d, "permanent",
            user.permanent_minutes, task_id, description
        )

    db.flush()

    cost_type = "monthly"
    if monthly_d == 0:
        cost_type = "permanent"
    elif permanent_d > 0:
        cost_type = "mixed"

    return {
        "success": True,
        "monthly_deducted": monthly_d,
        "permanent_deducted": permanent_d,
        "cost_type": cost_type,
    }


def refund_task_minutes(
    db: Session,
    user: User,
    monthly_refund: int,
    permanent_refund: int,
    task_id: str = None,
    description: str = None,
):
    """任务失败时返还时长"""
    if monthly_refund > 0:
        user.monthly_minutes = (user.monthly_minutes or 0) + monthly_refund
        _create_transaction(
            db, user.id, "task_refund", monthly_refund, "monthly",
            user.monthly_minutes, task_id, description
        )
    if permanent_refund > 0:
        user.permanent_minutes = (user.permanent_minutes or 0) + permanent_refund
        _create_transaction(
            db, user.id, "task_refund", permanent_refund, "permanent",
            user.permanent_minutes, task_id, description
        )
    db.flush()


def get_user_balance(user: User) -> dict:
    """获取用户余额摘要"""
    return {
        "monthly": user.monthly_minutes or 0,
        "permanent": user.permanent_minutes or 0,
        "total": (user.monthly_minutes or 0) + (user.permanent_minutes or 0),
        "plan": user.plan,
        "plan_expires_at": user.plan_expires_at.isoformat() if user.plan_expires_at else None,
        "auto_renew": user.auto_renew,
    }
