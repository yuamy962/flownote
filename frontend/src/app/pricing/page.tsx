'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Video, Check, Zap } from 'lucide-react';
import PayModal from '@/components/PayModal';

interface Plan {
  id: string;
  name: string;
  price: number;
  price_yuan: number;
  duration_minutes: number;
  description: string;
}

export default function Pricing() {
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [order, setOrder] = useState<any>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // 获取套餐列表
    fetch('/api/pay/plans')
      .then((r) => r.json())
      .then((json) => {
        if (json.code === 0) setPlans(json.data);
      })
      .finally(() => setLoading(false));

    // 获取当前用户
    const raw = localStorage.getItem('user');
    if (raw) {
      try {
        setUser(JSON.parse(raw));
      } catch {}
    }
  }, []);

  const handleBuy = async (planId: string) => {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('请先登录');
      router.push('/login');
      return;
    }
    setPaying(true);
    try {
      const res = await fetch('/api/pay/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ plan_id: planId }),
      });
      const json = await res.json();
      if (json.code !== 0) {
        alert(json.detail || '创建订单失败');
        return;
      }
      setOrder(json.data);
    } catch (e: any) {
      alert('下单失败: ' + e.message);
    } finally {
      setPaying(false);
    }
  };

  const handlePaySuccess = () => {
    // 刷新用户信息
    const token = localStorage.getItem('token');
    if (token) {
      fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.json())
        .then((json) => {
          if (json.code === 0) {
            localStorage.setItem('user', JSON.stringify(json.data));
            setUser(json.data);
          }
        });
    }
  };

  const formatMinutes = (m: number) => {
    if (m >= 999999) return '不限';
    if (m >= 60) return `${Math.floor(m / 60)}小时${m % 60}分钟`;
    return `${m}分钟`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b bg-white">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <a href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Video className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-lg">FlowNote</span>
            </a>
            <nav className="hidden sm:flex items-center gap-1 text-sm">
              <a href="/dashboard" className="px-3 py-1.5 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-50">工作台</a>
              <a href="/dashboard/history" className="px-3 py-1.5 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-50">历史记录</a>
              <a href="/dashboard/profile" className="px-3 py-1.5 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-50">用户中心</a>
            </nav>
          </div>
          <div className="flex items-center gap-4 text-sm">
            {user && (
              <span className="text-gray-500">
                剩余：{formatMinutes(user.monthly_minutes || 0)}
              </span>
            )}
            <a href="/pricing" className="text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg font-medium">升级</a>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-gray-900 mb-3">选择适合你的套餐</h1>
          <p className="text-gray-500">一次性购买，时长永久有效，用完即止</p>
        </div>

        {loading ? (
          <div className="text-center py-20 text-gray-400">加载中...</div>
        ) : (
          <div className="grid md:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`bg-white rounded-2xl border p-6 flex flex-col ${
                  plan.id === 'pro' ? 'border-blue-200 shadow-lg relative' : 'border-gray-100'
                }`}
              >
                {plan.id === 'pro' && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-blue-600 text-white text-xs rounded-full font-medium flex items-center gap-1">
                    <Zap className="w-3 h-3" /> 推荐
                  </div>
                )}

                <h3 className="text-lg font-semibold text-gray-900 mb-1">{plan.name}</h3>
                <p className="text-sm text-gray-500 mb-4">{plan.description}</p>

                <div className="mb-4">
                  <span className="text-3xl font-bold text-gray-900">¥{plan.price_yuan}</span>
                  <span className="text-gray-400 text-sm"> / {formatMinutes(plan.duration_minutes)}</span>
                </div>

                <div className="space-y-2 mb-6 flex-1">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Check className="w-4 h-4 text-green-500" />
                    <span>B站视频转录</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Check className="w-4 h-4 text-green-500" />
                    <span>本地上传转录</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Check className="w-4 h-4 text-green-500" />
                    <span>AI 智能总结</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Check className="w-4 h-4 text-green-500" />
                    <span>Markdown 导出</span>
                  </div>
                </div>

                <button
                  onClick={() => handleBuy(plan.id)}
                  disabled={paying}
                  className={`w-full py-2.5 rounded-xl text-sm font-medium transition-all ${
                    plan.id === 'pro'
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  } disabled:opacity-50`}
                >
                  {paying ? '处理中...' : '立即购买'}
                </button>
              </div>
            ))}
          </div>
        )}
      </main>

      <PayModal
        order={order}
        onClose={() => setOrder(null)}
        onSuccess={handlePaySuccess}
      />
    </div>
  );
}
