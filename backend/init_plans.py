#!/usr/bin/env python3
"""初始化套餐数据到数据库"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app.models import Plan


def init_plans():
    db = SessionLocal()
    try:
        # 检查是否已有数据
        existing = db.query(Plan).count()
        if existing > 0:
            print(f"[INIT] Plans already exist ({existing}), skipping.")
            return

        plans = [
            Plan(id="basic", name="基础版", price_cent=1900, duration_minutes=300,
                 description="300分钟转录时长，适合轻度用户", sort_order=1),
            Plan(id="pro", name="专业版", price_cent=4900, duration_minutes=1000,
                 description="1000分钟转录时长，适合内容创作者", sort_order=2),
            Plan(id="unlimited", name="无限版", price_cent=9900, duration_minutes=999999,
                 description="不限转录时长，专业团队首选", sort_order=3),
        ]
        for p in plans:
            db.add(p)
        db.commit()
        print("[INIT] Plans initialized successfully.")
    except Exception as e:
        db.rollback()
        print(f"[INIT] Error: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    init_plans()
