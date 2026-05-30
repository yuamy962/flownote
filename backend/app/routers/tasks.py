from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Task
from app.services.bilibili import parse_bilibili_url

router = APIRouter(prefix="/tasks", tags=["tasks"])


@router.post("")
async def create_task(payload: dict, db: Session = Depends(get_db)):
    """
    提交视频处理任务
    payload: { "url": "https://www.bilibili.com/video/BVxxx" }
    """
    url = payload.get("url", "")
    if not url:
        raise HTTPException(status_code=400, detail="缺少 url 参数")

    try:
        result = await parse_bilibili_url(url)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"解析失败: {str(e)}")

    # 创建任务记录
    task = Task(
        user_id="anonymous",  # TODO: 接入 JWT 后改为真实 user_id
        source_type="bilibili",
        source_url=url,
        title=result["title"],
        duration=result["duration"],
        status="done" if result["has_subtitle"] else "pending",
        processing_path="subtitle" if result["has_subtitle"] else "gpu",
        transcript=result["subtitle_text"] if result["has_subtitle"] else None,
    )
    db.add(task)
    db.commit()
    db.refresh(task)

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
def get_task(task_id: str, db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id).first()
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
            "summary": task.summary,
            "notes": task.notes,
            "error_message": task.error_message,
            "created_at": task.created_at.isoformat() if task.created_at else None,
            "completed_at": task.completed_at.isoformat() if task.completed_at else None,
        },
    }


@router.get("")
def list_tasks(page: int = 1, size: int = 20, db: Session = Depends(get_db)):
    offset = (page - 1) * size
    tasks = db.query(Task).order_by(Task.created_at.desc()).offset(offset).limit(size).all()
    total = db.query(Task).count()
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


@router.delete("/{task_id}")
def delete_task(task_id: str, db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")
    db.delete(task)
    db.commit()
    return {"code": 0, "message": "已删除"}
