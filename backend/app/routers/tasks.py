import json
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
from app.tasks import transcribe_video

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

    task = Task(
        user_id=user.id,
        source_type="bilibili",
        source_url=url,
        title=result["title"],
        duration=result["duration"],
        status="done" if result["has_subtitle"] else "pending",
        processing_path="subtitle" if result["has_subtitle"] else "gpu",
        transcript=result["subtitle_text"] if result["has_subtitle"] else None,
    )

    if result["has_subtitle"] and result["subtitle_text"]:
        try:
            ai_result = await generate_notes(result["subtitle_text"])
            task.summary = json.dumps(ai_result.get("summary", {}), ensure_ascii=False)
            task.notes = ai_result.get("notes", "")
        except Exception as e:
            task.error_message = f"AI 生成失败: {str(e)}"

    db.add(task)
    db.commit()
    db.refresh(task)

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
            "transcript": task.transcript,
            "summary": json.loads(task.summary) if task.summary else None,
            "notes": task.notes,
            "error_message": task.error_message,
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
    """上传本地视频文件，创建转录任务"""
    # 保存上传的文件到临时目录
    suffix = os.path.splitext(file.filename or "video.mp4")[1]
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        shutil.copyfileobj(file.file, tmp)
        tmp_path = tmp.name

    # 创建任务
    task = Task(
        user_id=user.id,
        source_type="upload",
        source_url="",
        title=file.filename or "上传视频",
        duration=0,  # 暂时不知道时长，转录后更新
        status="pending",
        processing_path="gpu",
    )
    db.add(task)
    db.commit()
    db.refresh(task)

    # 触发 Celery 任务（传本地文件路径）
    transcribe_video.delay(task.id, "", tmp_path)

    return {
        "code": 0,
        "data": {
            "id": task.id,
            "title": task.title,
            "status": task.status,
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
