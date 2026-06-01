'use client';

import { useState, useEffect } from 'react';
import { Video, User, Mail, Zap, Clock, Package, Crown, Loader2 } from 'lucide-react';

interface UserData {
  email: string;
  plan: string;
  monthly_minutes: number;
  used_minutes: number;
}

const plans: Record<string, { name: string; color: string; icon: typeof Package }> = {
  free: { name: '免费版', color: 'text-gray-600 bg-gray-100', icon: Package },
  pro: { name: '专业版', color: 'text-blue-600 bg-blue-50', icon: Zap },
  unlimited: { name: '无限版', color: 'text-amber-600 bg-amber-50', icon: Crown },
};

export default function ProfilePage() {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch('/api/auth/me', {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
    })
      .then((r) => r.json())
      .then((json) => {
        if (json.code === 0) {
          setUser(json.data);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const plan = user ? plans[user.plan] || plans.free : plans.free;
  const PlanIcon = plan.icon;
  const remaining = user ? user.monthly_minutes - user.used_minutes : 0;
  const usagePercent = user ? (user.used_minutes / user.monthly_minutes) * 100 : 0;

  return (
    <div className="min-h-screen bg-gray-50">
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
              <a href="/dashboard/profile" className="px-3 py-1.5 text-blue-600 bg-blue-50 rounded-lg font-medium">用户中心</a>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="text-xl font-semibold text-gray-900 mb-6">用户中心</h1>

        {loading ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
            <Loader2 className="w-6 h-6 text-gray-300 mx-auto mb-3 animate-spin" />
            <p className="text-gray-500">加载中...</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-sm font-medium text-gray-500 mb-4">基本信息</h2>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                    <User className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">账户邮箱</p>
                    <p className="text-sm font-medium text-gray-900">{user?.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${plan.color.split(' ')[1]}`}>
                    <PlanIcon className={`w-5 h-5 ${plan.color.split(' ')[0]}`} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">当前套餐</p>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${plan.color}`}>
                      {plan.name}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-sm font-medium text-gray-500 mb-4">用量统计</h2>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-500">本月时长</span>
                    <span className="text-sm font-medium text-gray-900">{user?.used_minutes} / {user?.monthly_minutes} 分钟</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${Math.min(usagePercent, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">剩余 {remaining} 分钟</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">处理任务</p>
                    <p className="text-lg font-semibold text-gray-900">--</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">转录时长</p>
                    <p className="text-lg font-semibold text-gray-900">{user?.used_minutes || 0} 分钟</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="md:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-sm font-medium text-gray-500 mb-4">套餐对比</h2>
              <div className="grid gap-4 md:grid-cols-3">
                <div className={`rounded-xl border-2 p-5 ${user?.plan === 'free' ? 'border-blue-200 bg-blue-50/50' : 'border-gray-100'}`}>
                  <div className="flex items-center gap-2 mb-3">
                    <Package className="w-5 h-5 text-gray-600" />
                    <span className="font-semibold text-gray-900">免费版</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 mb-1">¥0<span className="text-sm font-normal text-gray-500">/月</span></p>
                  <ul className="space-y-2 text-sm text-gray-600 mt-4">
                    <li className="flex items-center gap-2">每月60分钟转录时长</li>
                    <li className="flex items-center gap-2">基础字幕提取</li>
                    <li className="flex items-center gap-2">AI总结</li>
                  </ul>
                </div>
                <div className={`rounded-xl border-2 p-5 ${user?.plan === 'pro' ? 'border-blue-200 bg-blue-50/50' : 'border-gray-100'}`}>
                  <div className="flex items-center gap-2 mb-3">
                    <Zap className="w-5 h-5 text-blue-600" />
                    <span className="font-semibold text-gray-900">专业版</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 mb-1">¥49<span className="text-sm font-normal text-gray-500">/月</span></p>
                  <ul className="space-y-2 text-sm text-gray-600 mt-4">
                    <li className="flex items-center gap-2">每月300分钟转录时长</li>
                    <li className="flex items-center gap-2">GPU加速转录</li>
                    <li className="flex items-center gap-2">高清导出</li>
                  </ul>
                </div>
                <div className={`rounded-xl border-2 p-5 ${user?.plan === 'unlimited' ? 'border-blue-200 bg-blue-50/50' : 'border-gray-100'}`}>
                  <div className="flex items-center gap-2 mb-3">
                    <Crown className="w-5 h-5 text-amber-600" />
                    <span className="font-semibold text-gray-900">无限版</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 mb-1">¥149<span className="text-sm font-normal text-gray-500">/月</span></p>
                  <ul className="space-y-2 text-sm text-gray-600 mt-4">
                    <li className="flex items-center gap-2">无限转录时长</li>
                    <li className="flex items-center gap-2">优先队列</li>
                    <li className="flex items-center gap-2">API访问</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
