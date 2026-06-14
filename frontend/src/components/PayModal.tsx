'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, CheckCircle, Loader2 } from 'lucide-react';

interface PayModalProps {
  order: {
    order_id: string;
    out_trade_no: string;
    code_url: string;
    amount_yuan: number;
    plan_name: string;
  } | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function PayModal({ order, onClose, onSuccess }: PayModalProps) {
  const [status, setStatus] = useState<'pending' | 'paid' | 'timeout'>('pending');
  const [pollCount, setPollCount] = useState(0);

  // 当 order 变化时（创建了新订单），重置状态
  useEffect(() => {
    if (order) {
      setStatus('pending');
      setPollCount(0);
    }
  }, [order?.order_id]);

  const checkStatus = useCallback(async () => {
    if (!order || status !== 'pending') return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/pay/status/${order.order_id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const json = await res.json();
      if (json.code === 0 && json.data.status === 'paid') {
        setStatus('paid');
        onSuccess();
        return;
      }
    } catch (e) {
      console.error('Poll error:', e);
    }
    setPollCount((c) => c + 1);
  }, [order, status, onSuccess]);

  useEffect(() => {
    if (!order) return;
    if (status === 'pending' && pollCount < 100) {
      const timer = setTimeout(checkStatus, 3000);
      return () => clearTimeout(timer);
    }
    if (pollCount >= 100 && status === 'pending') {
      setStatus('timeout');
    }
  }, [order, status, pollCount, checkStatus]);

  if (!order) return null;

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(order.code_url)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-lg font-semibold text-center mb-4">
          {status === 'paid' ? '支付成功' : `支付 ${order.plan_name}`}
        </h3>

        {status === 'paid' ? (
          <div className="text-center py-6">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-3" />
            <p className="text-green-600 font-medium">支付成功！</p>
            <p className="text-sm text-gray-500 mt-1">时长已到账</p>
            <button onClick={onClose} className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg text-sm">确定</button>
          </div>
        ) : status === 'timeout' ? (
          <div className="text-center py-6">
            <p className="text-gray-600">支付超时，请重新下单</p>
            <button onClick={onClose} className="mt-4 px-6 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm">关闭</button>
          </div>
        ) : (
          <>
            <div className="flex justify-center mb-4">
              <div className="bg-gray-50 p-3 rounded-xl">
                <img src={qrUrl} alt="微信支付二维码" className="w-48 h-48" />
              </div>
            </div>
            <p className="text-center text-2xl font-bold text-gray-900 mb-1">¥{order.amount_yuan.toFixed(2)}</p>
            <p className="text-center text-sm text-gray-500 mb-4">请使用微信扫一扫支付</p>
            <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>等待支付...（{pollCount * 3}秒）</span>
            </div>
            <p className="text-xs text-gray-400 text-center mt-4">订单号：{order.out_trade_no}</p>
          </>
        )}
      </div>
    </div>
  );
}
