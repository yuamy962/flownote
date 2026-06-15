'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Video, Check, Zap, ArrowRight } from 'lucide-react';
import PayModal from '@/components/PayModal';

interface Plan {
  id: string;
  name: string;
  price: number;
  price_yuan: number;
  duration_minutes: number;
  validity_days: number;
  description: string;
}

export default function Pricing() {
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [order, setOrder] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly');

  useEffect(() => {
    fetch('/api/pay/plans')
      .then((r) => r.json())
      .then((json) => {
        if (json.code === 0) {
          const active = (json.data || []).filter((p: Plan) => p.id !== 'unlimited');
          setPlans(active);
        }
      })
      .finally(() => setLoading(false));

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
    return `${m.toLocaleString('zh-CN')}分钟`;
  };

  const monthlyPlans = plans.filter((p) => p.validity_days && p.validity_days <= 31);
  const yearlyPlans = plans.filter((p) => p.validity_days && p.validity_days >= 365);
  const displayPlans = billing === 'monthly' ? monthlyPlans : yearlyPlans;

  // 竞品对比数据
  const competitorPrice: Record<string, { us: number; them: number; minutes: number }> = {
    basic: { us: 15, them: 31, minutes: 600 },
    pro: { us: 35, them: 71, minutes: 6000 },
    basic_year: { us: 69, them: 134, minutes: 7200 },
    pro_year: { us: 239, them: 478, minutes: 72000 },
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
            {user ? (
              <>
                <span className="text-gray-500 hidden sm:inline">
                  订阅：{formatMinutes(user.monthly_minutes || 0)} / 永久：{formatMinutes(user.permanent_minutes || 0)}
                </span>
                <a href="/pricing" className="text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg font-medium">升级</a>
              </>
            ) : (
              <>
                <a href="/login" className="text-gray-600 hover:text-gray-900">登录</a>
                <a href="/login" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
                  免费开始
                </a>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-12">
        {/* Hero */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-50 text-red-600 text-sm mb-4 font-medium">
            <Zap className="w-4 h-4" />
            比主流竞品便宜一半
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">B站学习者专属定价</h1>
          <p className="text-gray-500 max-w-2xl mx-auto">
            不玩积分换算，直接按分钟计费。同样的钱，FlowNote 给的转录时长是竞品的 2 倍。
          </p>
        </div>

        {/* 月付/年付切换 */}
        <div className="flex justify-center mb-10">
          <div className="inline-flex bg-gray-100 p-1 rounded-xl">
            <button
              onClick={() => setBilling('monthly')}
              className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${
                billing === 'monthly' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              月付
            </button>
            <button
              onClick={() => setBilling('yearly')}
              className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                billing === 'yearly' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              年付
              <span className="text-xs px-1.5 py-0.5 bg-green-100 text-green-700 rounded-full">更省</span>
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20 text-gray-400">加载中...</div>
        ) : (
          <>
            {/* 套餐卡片 */}
            <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto mb-16">
              {displayPlans.map((plan) => {
                const isPro = plan.id.includes('pro');
                const compare = competitorPrice[plan.id];
                const isYearly = plan.validity_days >= 365;
                // 年付显示月均价格
                const monthlyPrice = isYearly ? (plan.price_yuan / 12).toFixed(1) : null;
                return (
                  <div
                    key={plan.id}
                    className={`bg-white rounded-2xl border p-6 flex flex-col relative ${
                      isPro ? 'border-blue-200 shadow-lg' : 'border-gray-100'
                    }`}
                  >
                    {isPro && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-blue-600 text-white text-xs rounded-full font-medium flex items-center gap-1">
                        <Zap className="w-3 h-3" /> 推荐
                      </div>
                    )}

                    <h3 className="text-lg font-semibold text-gray-900 mb-1">{plan.name}</h3>
                    <p className="text-sm text-gray-500 mb-4">{plan.description}</p>

                    <div className="mb-4">
                      <span className="text-3xl font-bold text-gray-900">¥{plan.price_yuan}</span>
                      <span className="text-gray-400 text-sm">
                        {' '}
                        / {isYearly ? '年' : '月'}
                      </span>
                      {isYearly && monthlyPrice && (
                        <p className="text-sm text-gray-400 mt-1">
                          约 ¥{monthlyPrice}/月，年付更划算
                        </p>
                      )}
                    </div>

                    <div className="bg-green-50 rounded-lg p-3 mb-4">
                      <p className="text-sm text-green-700">
                        <span className="font-bold">{formatMinutes(plan.duration_minutes)}</span>
                        {isYearly ? ' / 全年可用' : ' / 30天有效'}
                      </p>
                      {compare && (
                        <p className="text-xs text-green-600 mt-1">
                          竞品同量约 ¥{compare.them}，立省 ¥{compare.them - compare.us}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2 mb-6 flex-1">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Check className="w-4 h-4 text-green-500" />
                        <span>B站链接一键转录</span>
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
                        isPro
                          ? 'bg-blue-600 text-white hover:bg-blue-700'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      } disabled:opacity-50`}
                    >
                      {paying ? '处理中...' : '立即购买'}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* 竞品对比 */}
            <div className="bg-white rounded-2xl border border-gray-100 p-8 mb-12">
              <h2 className="text-xl font-bold text-gray-900 mb-6 text-center">同样的钱，谁给的更多？</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-3 font-medium text-gray-500">对比项</th>
                      <th className="text-center py-3 font-medium text-gray-500">主流竞品</th>
                      <th className="text-center py-3 font-medium text-blue-600">FlowNote</th>
                      <th className="text-right py-3 font-medium text-gray-500">省钱</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    <tr>
                      <td className="py-4 font-medium">600 分钟月卡</td>
                      <td className="text-center text-gray-600">¥31</td>
                      <td className="text-center font-bold text-blue-600">¥15</td>
                      <td className="text-right text-green-600 font-medium">-52%</td>
                    </tr>
                    <tr>
                      <td className="py-4 font-medium">6000 分钟月卡</td>
                      <td className="text-center text-gray-600">¥71</td>
                      <td className="text-center font-bold text-blue-600">¥35</td>
                      <td className="text-right text-green-600 font-medium">-51%</td>
                    </tr>
                    <tr>
                      <td className="py-4 font-medium">7200 分钟年卡</td>
                      <td className="text-center text-gray-600">¥134</td>
                      <td className="text-center font-bold text-blue-600">¥69</td>
                      <td className="text-right text-green-600 font-medium">-49%</td>
                    </tr>
                    <tr>
                      <td className="py-4 font-medium">72000 分钟年卡</td>
                      <td className="text-center text-gray-600">¥478</td>
                      <td className="text-center font-bold text-blue-600">¥239</td>
                      <td className="text-right text-green-600 font-medium">-50%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* 免费额度 & 邀请 */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-blue-50 rounded-2xl p-6">
                <h3 className="font-bold text-gray-900 mb-2">注册即送 60 分钟</h3>
                <p className="text-sm text-gray-600 mb-4">永久有效，不用不扣。先体验，再决定。</p>
                <a href="/login" className="inline-flex items-center gap-1 text-sm text-blue-600 font-medium hover:underline">
                  免费登录 <ArrowRight className="w-4 h-4" />
                </a>
              </div>
              <div className="bg-amber-50 rounded-2xl p-6">
                <h3 className="font-bold text-gray-900 mb-2">邀请好友，双方各得 +30 分钟</h3>
                <p className="text-sm text-gray-600 mb-4">好友完成首次转录，你们各得 30 分钟永久额度。</p>
                <a href="/dashboard/profile" className="inline-flex items-center gap-1 text-sm text-amber-700 font-medium hover:underline">
                  去邀请 <ArrowRight className="w-4 h-4" />
                </a>
              </div>
            </div>
          </>
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
