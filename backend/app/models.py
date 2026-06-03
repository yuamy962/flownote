import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime, Text, Enum, DECIMAL
from sqlalchemy.dialects.postgresql import UUID
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
