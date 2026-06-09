from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, CreditTransaction
from app.services.auth import decode_token
from app.services.credits import get_user_balance

router = APIRouter(prefix="/credits", tags=["credits"])


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


@router.get("/balance")
def get_balance(user: User = Depends(get_current_user)):
    return {"code": 0, "data": get_user_balance(user)}


@router.get("/transactions")
def list_transactions(
    page: int = 1,
    size: int = 20,
    tx_type: str = "",
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    offset = (page - 1) * size
    query = db.query(CreditTransaction).filter(CreditTransaction.user_id == user.id)
    if tx_type:
        query = query.filter(CreditTransaction.type == tx_type)

    total = query.count()
    items = (
        query.order_by(CreditTransaction.created_at.desc())
        .offset(offset)
        .limit(size)
        .all()
    )

    return {
        "code": 0,
        "data": {
            "total": total,
            "page": page,
            "size": size,
            "items": [
                {
                    "id": t.id,
                    "type": t.type,
                    "amount": t.amount,
                    "balance_type": t.balance_type,
                    "balance_after": t.balance_after,
                    "description": t.description,
                    "reference_id": t.reference_id,
                    "created_at": t.created_at.isoformat() if t.created_at else None,
                }
                for t in items
            ],
        },
    }
