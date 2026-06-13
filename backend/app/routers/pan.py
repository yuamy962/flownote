from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User
from app.services.auth import decode_token
from app.services.pan_baidu import (
    get_auth_url,
    get_token_by_code,
    list_files,
    get_download_link,
    download_file,
)
from app.tasks import transcribe_video
import os
import tempfile

router = APIRouter(prefix="/pan", tags=["pan"])


def get_current_user(authorization: str = None, db: Session = Depends(get_db)) -> User:
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


@router.get("/baidu/auth-url")
def baidu_auth_url(user: User = Depends(get_current_user)):
    """获取百度网盘 OAuth 授权 URL"""
    url = get_auth_url(state=user.id)
    return {"code": 0, "data": {"auth_url": url}}


@router.get("/baidu/callback")
async def baidu_callback(code: str, state: str = "", db: Session = Depends(get_db)):
    """百度网盘 OAuth 回调"""
    if not code:
        raise HTTPException(status_code=400, detail="缺少 code 参数")

    try:
        token_data = await get_token_by_code(code)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"获取 Token 失败: {str(e)}")

    if "access_token" not in token_data:
        raise HTTPException(status_code=400, detail=f"百度网盘返回错误: {token_data}")

    user_id = state
    user = db.query(User).filter(User.id == user_id).first() if user_id else None
    if user:
        user.pan_baidu_token = token_data.get("access_token")
        user.pan_baidu_refresh = token_data.get("refresh_token")
        from datetime import datetime, timezone, timedelta
        expires = token_data.get("expires_in", 2592000)
        user.pan_baidu_expires = datetime.now(timezone.utc) + timedelta(seconds=expires)
        db.commit()

    # 返回一个简单页面，通知前端授权成功
    return {
        "code": 0,
        "message": "百度网盘授权成功，请关闭此窗口并刷新页面",
        "data": {"connected": True},
    }


@router.get("/baidu/files")
async def baidu_files(
    path: str = "/",
    authorization: str = None,
    db: Session = Depends(get_db),
):
    """获取百度网盘文件列表"""
    user = get_current_user(authorization, db)
    if not user or not user.pan_baidu_token:
        raise HTTPException(status_code=401, detail="未绑定百度网盘")

    try:
        files = await list_files(user.pan_baidu_token, path)
        return {
            "code": 0,
            "data": {
                "files": [
                    {
                        "fsid": f.get("fs_id"),
                        "name": f.get("server_filename"),
                        "path": f.get("path"),
                        "size": f.get("size"),
                        "is_dir": f.get("isdir") == 1,
                        "modified": f.get("server_mtime"),
                    }
                    for f in files
                ],
            },
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/baidu/download")
async def baidu_download(
    payload: dict,
    authorization: str = None,
    db: Session = Depends(get_db),
):
    """从百度网盘下载文件并创建转录任务"""
    user = get_current_user(authorization, db)
    if not user or not user.pan_baidu_token:
        raise HTTPException(status_code=401, detail="未绑定百度网盘")

    fsid = payload.get("fsid")
    filename = payload.get("filename", "网盘视频")
    if not fsid:
        raise HTTPException(status_code=400, detail="缺少 fsid")

    try:
        metas = await get_download_link(user.pan_baidu_token, [int(fsid)])
        if not metas:
            raise HTTPException(status_code=400, detail="无法获取下载链接")

        dlink = metas[0].get("dlink")
        if not dlink:
            raise HTTPException(status_code=400, detail="文件无下载链接")

        # 下载文件
        suffix = os.path.splitext(filename)[1] or ".mp4"
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp_path = tmp.name

        await download_file(dlink, tmp_path)

        # 创建任务
        from app.models import Task
        task = Task(
            user_id=user.id,
            source_type="baidu_pan",
            source_url="",
            title=filename,
            duration=0,
            status="pending",
            processing_path="gpu",
        )
        db.add(task)
        db.commit()
        db.refresh(task)

        # 触发 Celery
        transcribe_video.delay(task.id, "", tmp_path)

        return {
            "code": 0,
            "data": {
                "id": task.id,
                "title": task.title,
                "status": task.status,
            },
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
