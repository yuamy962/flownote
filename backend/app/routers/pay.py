import json
import time
import random
from fastapi import APIRouter, Depends, HTTPException, Header, Request
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Plan, Order, PaymentLog, User
from app.services.auth import decode_token
from app.services.wechat_pay import get_wechat_pay

router = APIRouter(prefix="/pay", tags=["pay"])


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


def _generate_out_trade_no() -> str:
    return f"FN{int(time.time())}{random.randint(1000, 9999)}"


# ==================== 套餐列表 ====================

@router.get("/plans")
def list_plans(db: Session = Depends(get_db)):
    plans = db.query(Plan).order_by(Plan.sort_order).all()
    return {
        "code": 0,
        "data": [
            {
                "id": p.id,
                "name": p.name,
                "price": p.price_cent,  # 单位：分
                "price_yuan": p.price_cent / 100,
                "duration_minutes": p.duration_minutes,
                "description": p.description,
            }
            for p in plans
        ],
    }


# ==================== 创建订单 + 获取支付二维码 ====================

@router.post("/create-order")
def create_order(
    payload: dict,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    plan_id = payload.get("plan_id", "")
    plan = db.query(Plan).filter(Plan.id == plan_id).first()
    if not plan:
        raise HTTPException(status_code=400, detail="套餐不存在")

    out_trade_no = _generate_out_trade_no()
    order = Order(
        user_id=user.id,
        plan_id=plan.id,
        out_trade_no=out_trade_no,
        amount_cent=plan.price_cent,
        status="pending",
        pay_channel="wx_native",
    )
    db.add(order)
    db.commit()
    db.refresh(order)

    # 调用微信支付统一下单
    try:
        wxpay = get_wechat_pay()
        result = wxpay.create_native_order(
            out_trade_no=out_trade_no,
            description=f"FlowNote {plan.name}",
            amount_cent=plan.price_cent,
        )
        code_url = result.get("code_url", "")
        if not code_url:
            raise HTTPException(status_code=500, detail="微信支付下单失败，未返回 code_url")
    except Exception as e:
        order.status = "failed"
        db.commit()
        raise HTTPException(status_code=500, detail=f"微信支付下单失败: {str(e)}")

    return {
        "code": 0,
        "data": {
            "order_id": order.id,
            "out_trade_no": out_trade_no,
            "code_url": code_url,
            "amount_cent": plan.price_cent,
            "amount_yuan": plan.price_cent / 100,
            "plan_name": plan.name,
        },
    }


# ==================== 查询订单状态 ====================

@router.get("/status/{order_id}")
def get_order_status(
    order_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    order = db.query(Order).filter(Order.id == order_id, Order.user_id == user.id).first()
    if not order:
        raise HTTPException(status_code=404, detail="订单不存在")
    return {
        "code": 0,
        "data": {
            "id": order.id,
            "status": order.status,
            "amount_cent": order.amount_cent,
            "plan_id": order.plan_id,
            "created_at": order.created_at.isoformat() if order.created_at else None,
            "paid_at": order.paid_at.isoformat() if order.paid_at else None,
        },
    }


# ==================== 微信支付回调（无需登录）====================

@router.post("/notify")
async def wechat_notify(request: Request, db: Session = Depends(get_db)):
    body_bytes = await request.body()
    body_str = body_bytes.decode("utf-8")
    # 保留原始 Headers 对象（大小写不敏感），不要转 dict
    headers = request.headers

    print(f"[PayNotify] Received callback, body={body_str[:500]}")
    print(f"[PayNotify] Headers: {dict(headers)}")

    # 1. 验签
    wxpay = get_wechat_pay()
    if not wxpay.verify_notify(headers, body_str):
        print("[PayNotify] Signature verification failed")
        raise HTTPException(status_code=400, detail="验签失败")

    # 2. 解密
    body_json = json.loads(body_str)
    decrypted = wxpay.decrypt_notify(body_json)
    if not decrypted:
        print("[PayNotify] Decrypt failed")
        raise HTTPException(status_code=400, detail="解密失败")

    print(f"[PayNotify] Decrypted: {json.dumps(decrypted, ensure_ascii=False)}")

    # 3. 处理订单
    out_trade_no = decrypted.get("out_trade_no", "")
    transaction_id = decrypted.get("transaction_id", "")
    trade_state = decrypted.get("trade_state", "")
    amount = decrypted.get("amount", {})
    total_cent = amount.get("total", 0)

    order = db.query(Order).filter(Order.out_trade_no == out_trade_no).first()
    if not order:
        print(f"[PayNotify] Order not found: {out_trade_no}")
        # 仍然返回成功，避免微信重复通知
        return {"code": "SUCCESS", "message": "OK"}

    # 幂等：已处理过的直接返回成功
    if order.status == "paid":
        return {"code": "SUCCESS", "message": "OK"}

    # 记录支付流水
    log = PaymentLog(
        order_id=order.id,
        channel="wx_native",
        channel_trade_no=transaction_id,
        amount_cent=total_cent,
        status=trade_state,
        notify_data=json.dumps(decrypted, ensure_ascii=False),
    )
    db.add(log)

    if trade_state == "SUCCESS":
        order.status = "paid"
        order.channel_trade_no = transaction_id
        from datetime import datetime
        order.paid_at = datetime.utcnow()

        # 给用户加时长
        plan = db.query(Plan).filter(Plan.id == order.plan_id).first()
        if plan:
            user = db.query(User).filter(User.id == order.user_id).first()
            if user:
                user.monthly_minutes += plan.duration_minutes
                print(f"[PayNotify] User {user.id} added {plan.duration_minutes} minutes, total={user.monthly_minutes}")

    db.commit()

    # 4. 返回成功（微信要求固定格式）
    return {"code": "SUCCESS", "message": "OK"}
