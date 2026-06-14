import json
import time
import random
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, Header, Request
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Plan, Order, PaymentLog, User
from app.services.auth import decode_token
from app.services.wechat_pay import get_wechat_pay
from app.services.credits import set_subscription_minutes, add_monthly_minutes, add_permanent_minutes
from app.services.invite import reward_purchase

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
                "price": p.price_cent,
                "price_yuan": p.price_cent / 100,
                "duration_minutes": p.duration_minutes,
                "validity_days": p.validity_days,
                "description": p.description,
            }
            for p in plans
        ],
    }


# ==================== 测试价映射（上线后删除）====================
TEST_PRICE_MAP = {
    "basic": 150,       # 标价¥15，测试扣¥1.5
    "pro": 350,         # 标价¥35，测试扣¥3.5
    "basic_year": 690,  # 标价¥69，测试扣¥6.9
    "pro_year": 2390,   # 标价¥239，测试扣¥23.9
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

    # 测试期间：实际扣款为测试价，但展示用原价
    actual_price_cent = TEST_PRICE_MAP.get(plan_id, plan.price_cent)

    out_trade_no = _generate_out_trade_no()
    order = Order(
        user_id=user.id,
        plan_id=plan.id,
        out_trade_no=out_trade_no,
        amount_cent=actual_price_cent,
        status="pending",
        pay_channel="wx_native",
        is_subscription=True,
        subscription_months=1,
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
            amount_cent=actual_price_cent,
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
            "amount_cent": actual_price_cent,
            "amount_yuan": actual_price_cent / 100,
            "display_amount_yuan": plan.price_cent / 100,
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


# ==================== 我的订单列表 ====================

@router.get("/orders")
def list_orders(
    page: int = 1,
    size: int = 20,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    offset = (page - 1) * size
    orders = (
        db.query(Order)
        .filter(Order.user_id == user.id)
        .order_by(Order.created_at.desc())
        .offset(offset)
        .limit(size)
        .all()
    )
    total = db.query(Order).filter(Order.user_id == user.id).count()
    return {
        "code": 0,
        "data": {
            "total": total,
            "page": page,
            "size": size,
            "items": [
                {
                    "id": o.id,
                    "plan_id": o.plan_id,
                    "status": o.status,
                    "amount_cent": o.amount_cent,
                    "amount_yuan": o.amount_cent / 100,
                    "paid_at": o.paid_at.isoformat() if o.paid_at else None,
                    "created_at": o.created_at.isoformat() if o.created_at else None,
                }
                for o in orders
            ],
        },
    }


# ==================== 微信支付回调（无需登录）====================

@router.post("/notify")
async def wechat_notify(request: Request, db: Session = Depends(get_db)):
    body_bytes = await request.body()
    body_str = body_bytes.decode("utf-8")
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
        order.paid_at = datetime.now(timezone.utc)

        # 给用户更新套餐
        plan = db.query(Plan).filter(Plan.id == order.plan_id).first()
        if plan:
            user = db.query(User).filter(User.id == order.user_id).first()
            if user:
                now = datetime.now(timezone.utc)

                # 判断是否为同档位续费（在修改 plan 之前判断）
                old_plan = user.plan
                old_monthly = user.monthly_minutes or 0
                old_plan_expired = not (user.plan_expires_at and user.plan_expires_at > now)
                is_renewal = old_plan == plan.id and not old_plan_expired

                user.plan = plan.id

                validity_days = plan.validity_days or 30
                if validity_days >= 9999:
                    user.plan_expires_at = now + timedelta(days=365*100)
                elif is_renewal:
                    # 续费叠加：从旧过期时间续加
                    user.plan_expires_at = user.plan_expires_at + timedelta(days=validity_days)
                else:
                    # 新购/升级/降级/过期续费：从现在开始算
                    user.plan_expires_at = now + timedelta(days=validity_days)

                # 套餐额度
                if plan.duration_minutes and plan.duration_minutes >= 999999:
                    minutes = 999999
                else:
                    minutes = plan.duration_minutes or 0

                validity_text = f"{validity_days}天" if validity_days < 9999 else "终身"

                # 同档位续费 → 分钟叠加；新购/升级/降级 → 覆盖
                if is_renewal:
                    add_monthly_minutes(
                        db, user.id, minutes,
                        tx_type="purchase_subscription",
                        reference_id=order.id,
                        description=f"续费{plan.name}，+{minutes}分钟，有效期延长{validity_text}"
                    )
                else:
                    # 升级/降级时，旧套餐剩余订阅分钟转为永久分钟（不丢失），但已过期的不转
                    if old_monthly > 0 and old_plan != "free" and not old_plan_expired:
                        add_permanent_minutes(
                            db, user.id, old_monthly,
                            tx_type="purchase_subscription",
                            reference_id=order.id,
                            description=f"升级套餐，旧套餐剩余{old_monthly}分钟转为永久时长"
                        )
                    set_subscription_minutes(
                        db, user.id, minutes,
                        reference_id=order.id,
                        description=f"购买{plan.name}，有效期{validity_text}"
                    )

                print(f"[PayNotify] User {user.id} upgraded to {plan.id}, expires_at={user.plan_expires_at}")

                # 触发邀请购买奖励
                reward_purchase(db, user, plan.id)

    db.commit()

    # 4. 返回成功（微信要求固定格式）
    return {"code": "SUCCESS", "message": "OK"}
