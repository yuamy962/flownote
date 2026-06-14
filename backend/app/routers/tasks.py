import json
import math
import os
import shutil
import tempfile
from fastapi import APIRouter, Depends, HTTPException, Header, File, UploadFile
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Task, User
from app.services.bilibili import parse_bilibili_url
from app.services.deepseek import generate_notes
from app.services.auth import decode_token
from app.services.credits import deduct_minutes, get_user_balance
from app.services.invite import reward_first_task
from app.services.video_utils import get_video_duration
from app.tasks import transcribe_video
import math

router = APIRouter(prefix="/tasks", tags=["tasks"])


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


@router.get("/parse-bilibili")
async def parse_bilibili(
    url: str,
    user: User = Depends(get_current_user),
):
    """预览解析 B 站视频信息（不创建任务，不扣费）"""
    if not url:
        raise HTTPException(status_code=400, detail="缺少 url 参数")
    try:
        result = await parse_bilibili_url(url)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"解析失败: {str(e)}")
    return {
        "code": 0,
        "data": {
            "title": result["title"],
            "duration": result["duration"],
            "cover": result["pic"],
            "uploader": result["uploader"],
            "hasSubtitle": result["has_subtitle"],
        },
    }


@router.post("")
async def create_task(
    payload: dict,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    url = payload.get("url", "")
    if not url:
        raise HTTPException(status_code=400, detail="缺少 url 参数")

    try:
        result = await parse_bilibili_url(url)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"解析失败: {str(e)}")

    duration = result.get("duration", 0)
    estimated_minutes = math.ceil(duration / 60) if duration else 1

    if result["has_subtitle"]:
        # 有字幕：直接 AI 生成，按 B站时长扣费
        deduct_result = deduct_minutes(
            db, user, estimated_minutes,
            description=f"转录《{result['title'][:30]}》"
        )
        if not deduct_result["success"]:
            raise HTTPException(
                status_code=402,
                detail=f"时长不足，需要 {estimated_minutes} 分钟，当前余额 {get_user_balance(user)['total']} 分钟"
            )
        consumed_minutes = estimated_minutes
        cost_type = deduct_result["cost_type"]
        monthly_deducted = deduct_result["monthly_deducted"]
        permanent_deducted = deduct_result["permanent_deducted"]
    else:
        # 无字幕：需要 GPU 转录，创建时检查余额但不扣费，完成后按实际时长扣费
        balance = get_user_balance(user)
        if balance["total"] < estimated_minutes:
            raise HTTPException(
                status_code=402,
                detail=f"时长不足，预估需要 {estimated_minutes} 分钟，当前余额 {balance['total']} 分钟"
            )
        consumed_minutes = 0
        cost_type = "pending"
        monthly_deducted = 0
        permanent_deducted = 0

    task = Task(
        user_id=user.id,
        source_type="bilibili",
        source_url=url,
        title=result["title"],
        duration=duration,
        status="done" if result["has_subtitle"] else "pending",
        processing_path="subtitle" if result["has_subtitle"] else "gpu",
        transcript=result["subtitle_text"] if result["has_subtitle"] else None,
        consumed_minutes=consumed_minutes,
        cost_type=cost_type,
        monthly_deducted=monthly_deducted,
        permanent_deducted=permanent_deducted,
    )

    if result["has_subtitle"] and result["subtitle_text"]:
        try:
            ai_result = await generate_notes(result["subtitle_text"])
            task.summary = json.dumps(ai_result.get("summary", {}), ensure_ascii=False)
            task.notes = ai_result.get("notes", "")
        except Exception as e:
            task.error_message = f"AI 生成失败: {str(e)}"
            # AI 生成失败时返还已扣时长
            if task.consumed_minutes and task.consumed_minutes > 0:
                from app.services.credits import refund_task_minutes
                refund_task_minutes(
                    db, user,
                    monthly_refund=task.monthly_deducted or 0,
                    permanent_refund=task.permanent_deducted or 0,
                    task_id=task.id,
                    description=f"AI生成失败返还《{task.title[:30]}》"
                )
                task.consumed_minutes = 0
                task.monthly_deducted = 0
                task.permanent_deducted = 0
                task.cost_type = "refunded"

    db.add(task)
    db.commit()
    db.refresh(task)

    # 字幕直出且成功 → 触发首次转录邀请奖励
    if result["has_subtitle"] and task.status == "done" and not task.error_message:
        try:
            reward_first_task(db, user)
            db.commit()
        except Exception as e:
            print(f"[InviteReward] Error: {e}")
            db.rollback()

    # 无字幕视频触发 GPU 转录任务
    if not result["has_subtitle"]:
        transcribe_video.delay(task.id, url)

    return {
        "code": 0,
        "data": {
            "id": task.id,
            "title": task.title,
            "duration": task.duration,
            "status": task.status,
            "has_subtitle": result["has_subtitle"],
            "pic": result["pic"],
            "uploader": result["uploader"],
            "consumed_minutes": task.consumed_minutes,
            "created_at": task.created_at.isoformat() if task.created_at else None,
        },
    }


@router.get("/{task_id}")
def get_task(task_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id, Task.user_id == user.id).first()
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")
    return {
        "code": 0,
        "data": {
            "id": task.id,
            "title": task.title,
            "duration": task.duration,
            "status": task.status,
            "processing_path": task.processing_path,
            "transcript": task.transcript,
            "summary": json.loads(task.summary) if task.summary else None,
            "notes": task.notes,
            "error_message": task.error_message,
            "consumed_minutes": task.consumed_minutes,
            "cost_type": task.cost_type,
            "created_at": task.created_at.isoformat() if task.created_at else None,
            "completed_at": task.completed_at.isoformat() if task.completed_at else None,
        },
    }


@router.get("")
def list_tasks(
    page: int = 1,
    size: int = 20,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    offset = (page - 1) * size
    tasks = (
        db.query(Task)
        .filter(Task.user_id == user.id)
        .order_by(Task.created_at.desc())
        .offset(offset)
        .limit(size)
        .all()
    )
    total = db.query(Task).filter(Task.user_id == user.id).count()
    return {
        "code": 0,
        "data": {
            "total": total,
            "page": page,
            "size": size,
            "items": [
                {
                    "id": t.id,
                    "title": t.title,
                    "duration": t.duration,
                    "status": t.status,
                    "source_type": t.source_type,
                    "consumed_minutes": t.consumed_minutes,
                    "cost_type": t.cost_type,
                    "created_at": t.created_at.isoformat() if t.created_at else None,
                }
                for t in tasks
            ],
        },
    }


@router.post("/upload")
async def upload_task(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """上传本地视频文件，创建转录任务。上传时获取时长并检查余额，转录完成后按实际时长一次性扣费。"""
    suffix = os.path.splitext(file.filename or "video.mp4")[1]
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        shutil.copyfileobj(file.file, tmp)
        tmp_path = tmp.name

    # 获取视频时长并检查余额
    duration = get_video_duration(tmp_path)
    if duration > 0:
        estimated_minutes = math.ceil(duration / 60)
        balance = get_user_balance(user)
        if balance["total"] < estimated_minutes:
            os.remove(tmp_path)
            raise HTTPException(
                status_code=402,
                detail=f"时长不足，需要 {estimated_minutes} 分钟，当前余额 {balance['total']} 分钟"
            )

    task = Task(
        user_id=user.id,
        source_type="upload",
        source_url="",
        title=file.filename or "上传视频",
        duration=int(duration) if duration > 0 else 0,
        status="pending",
        processing_path="gpu",
        consumed_minutes=0,
        cost_type="pending",
    )
    db.add(task)
    db.commit()
    db.refresh(task)

    transcribe_video.delay(task.id, "", tmp_path)

    return {
        "code": 0,
        "data": {
            "id": task.id,
            "title": task.title,
            "status": task.status,
            "consumed_minutes": task.consumed_minutes,
            "created_at": task.created_at.isoformat() if task.created_at else None,
        },
    }


@router.delete("/{task_id}")
def delete_task(task_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id, Task.user_id == user.id).first()
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")
    db.delete(task)
    db.commit()
    return {"code": 0, "message": "已删除"}
