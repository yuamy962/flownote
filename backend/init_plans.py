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
            # 月付套餐
            Plan(id="basic", name="轻量月卡", price_cent=1500, duration_minutes=600,
                 validity_days=30,
                 description="600分钟转录时长，适合轻度用户和新手体验", sort_order=1),
            Plan(id="pro", name="专业月卡", price_cent=3500, duration_minutes=6000,
                 validity_days=30,
                 description="6000分钟转录时长，适合内容创作者和学生党", sort_order=2),

            # 年付套餐（均价更低）
            Plan(id="basic_year", name="轻量年卡", price_cent=6900, duration_minutes=7200,
                 validity_days=365,
                 description="7200分钟转录时长（600分钟/月×12），年付更划算", sort_order=3),
            Plan(id="pro_year", name="专业年卡", price_cent=23900, duration_minutes=72000,
                 validity_days=365,
                 description="72000分钟转录时长（6000分钟/月×12），重度用户首选", sort_order=4),
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
