import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, DateTime, Text, Boolean
from app.database import Base


def gen_uuid():
    return str(uuid.uuid4())


def utc_now():
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    email = Column(String(255), unique=True, nullable=True)
    password_hash = Column(String(255), nullable=True)
    openid = Column(String(128), unique=True, nullable=True)
    nickname = Column(String(128), nullable=True)
    avatar = Column(String(512), nullable=True)

    plan = Column(String(20), default="free")
    plan_expires_at = Column(DateTime(timezone=True), nullable=True)
    auto_renew = Column(Boolean, default=False)

    monthly_minutes = Column(Integer, default=0)
    permanent_minutes = Column(Integer, default=60)

    invite_code = Column(String(16), unique=True, nullable=True)
    invited_by = Column(String(36), nullable=True)

    pan_baidu_token = Column(String(512), nullable=True)
    pan_baidu_refresh = Column(String(512), nullable=True)
    pan_baidu_expires = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)


class Task(Base):
    __tablename__ = "tasks"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    user_id = Column(String(36), nullable=False)
    source_type = Column(String(20), default="bilibili")
    source_url = Column(String(512), nullable=True)
    title = Column(String(255), nullable=True)
    duration = Column(Integer, default=0)
    status = Column(String(20), default="pending")
    processing_path = Column(String(20), default="subtitle")
    transcript = Column(Text, nullable=True)
    summary = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    error_message = Column(Text, nullable=True)

    consumed_minutes = Column(Integer, nullable=True)
    cost_type = Column(String(20), default="free")

    created_at = Column(DateTime(timezone=True), default=utc_now)
    completed_at = Column(DateTime(timezone=True), nullable=True)


class Plan(Base):
    __tablename__ = "plans"

    id = Column(String(20), primary_key=True)
    name = Column(String(50), nullable=False)
    price_cent = Column(Integer, nullable=False)
    duration_minutes = Column(Integer, default=0)
    description = Column(Text)
    sort_order = Column(Integer, default=0)


class Order(Base):
    __tablename__ = "orders"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    user_id = Column(String(36), nullable=False)
    plan_id = Column(String(20), nullable=True)
    out_trade_no = Column(String(32), unique=True, nullable=False)
    amount_cent = Column(Integer, nullable=False)
    status = Column(String(20), default="pending")
    pay_channel = Column(String(20), default="wx_native")
    channel_trade_no = Column(String(64), nullable=True)
    paid_at = Column(DateTime(timezone=True), nullable=True)

    is_subscription = Column(Boolean, default=False)
    subscription_months = Column(Integer, default=1)

    created_at = Column(DateTime(timezone=True), default=utc_now)


class PaymentLog(Base):
    __tablename__ = "payment_logs"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    order_id = Column(String(36), nullable=False)
    channel = Column(String(20))
    channel_trade_no = Column(String(64))
    amount_cent = Column(Integer)
    status = Column(String(20))
    notify_data = Column(Text)
    created_at = Column(DateTime(timezone=True), default=utc_now)


class CreditTransaction(Base):
    __tablename__ = "credit_transactions"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    user_id = Column(String(36), nullable=False, index=True)
    type = Column(String(30), nullable=False)
    amount = Column(Integer, nullable=False)
    balance_type = Column(String(20), default="permanent")
    balance_after = Column(Integer, nullable=False)
    reference_id = Column(String(36), nullable=True)
    description = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now)


class InviteReward(Base):
    __tablename__ = "invite_rewards"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    inviter_id = Column(String(36), nullable=False, index=True)
    invitee_id = Column(String(36), nullable=False, unique=True, index=True)
    status = Column(String(20), default="registered")

    first_task_rewarded_at = Column(DateTime(timezone=True), nullable=True)

    purchase_plan_id = Column(String(20), nullable=True)
    purchase_reward_minutes = Column(Integer, default=0)
    purchase_rewarded_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), default=utc_now)
