import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime, Text, UniqueConstraint
from app.database import Base


def gen_uuid():
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    email = Column(String(255), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    plan = Column(String(20), default="free")  # free, basic, pro, unlimited
    monthly_minutes = Column(Integer, default=60)
    plan_expires_at = Column(DateTime, nullable=True)
    pan_baidu_token = Column(String(512), nullable=True)
    pan_baidu_refresh = Column(String(512), nullable=True)
    pan_baidu_expires = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Task(Base):
    __tablename__ = "tasks"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    user_id = Column(String(36), nullable=False)
    source_type = Column(String(20), default="bilibili")  # bilibili, upload
    source_url = Column(String(512), nullable=True)
    title = Column(String(255), nullable=True)
    duration = Column(Integer, default=0)
    status = Column(String(20), default="pending")  # pending, processing, done, failed
    processing_path = Column(String(20), default="subtitle")  # subtitle, cpu, gpu
    transcript = Column(Text, nullable=True)
    summary = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)


class Plan(Base):
    __tablename__ = "plans"

    id = Column(String(20), primary_key=True)  # basic, pro, unlimited
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
    status = Column(String(20), default="pending")  # pending, paid, closed
    pay_channel = Column(String(20), default="wx_native")
    channel_trade_no = Column(String(64), nullable=True)
    paid_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class PaymentLog(Base):
    __tablename__ = "payment_logs"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    order_id = Column(String(36), nullable=False)
    channel = Column(String(20))
    channel_trade_no = Column(String(64))
    amount_cent = Column(Integer)
    status = Column(String(20))
    notify_data = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
