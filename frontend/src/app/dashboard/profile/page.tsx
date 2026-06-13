'use client';

import { useState, useEffect } from 'react';
import {
  Video, User, Zap, Clock, Package, Loader2,
  Gem, Wallet, ShoppingBag, Users, Copy, Check, Calendar,
  ArrowUpRight, ArrowDownRight, CreditCard
} from 'lucide-react';

interface UserData {
  id: string;
  nickname: string;
  avatar: string;
  plan: string;
  monthly_minutes: number;
  permanent_minutes: number;
  total_minutes: number;
  used_minutes: number;
  plan_expires_at: string | null;
  auto_renew: boolean;
  invite_code: string;
}

interface Transaction {
  id: string;
  type: string;
  amount: number;
  balance_type: string;
  balance_after: number;
  description: string;
  created_at: string;
}

interface OrderItem {
  id: string;
  plan_id: string;
  status: string;
  amount_yuan: number;
  paid_at: string | null;
  created_at: string;
}

interface InviteItem {
  invitee_nickname: string;
  status: string;
  first_task_rewarded_at: string | null;
  purchase_plan_id: string | null;
  purchase_reward_minutes: number;
  created_at: string;
}

const plans: Record<string, { name: string; color: string; icon: typeof Package; minutes: number; price: number; validity: string }> = {
  free: { name: '免费版', color: 'text-gray-600 bg-gray-100', icon: Package, minutes: 0, price: 0, validity: '永久' },
  basic: { name: '轻量月卡', color: 'text-green-600 bg-green-50', icon: Zap, minutes: 600, price: 15, validity: '30天' },
  basic_year: { name: '轻量年卡', color: 'text-teal-600 bg-teal-50', icon: Zap, minutes: 7200, price: 69, validity: '365天' },
  pro: { name: '专业月卡', color: 'text-blue-600 bg-blue-50', icon: Zap, minutes: 6000, price: 35, validity: '30天' },
  pro_year: { name: '专业年卡', color: 'text-indigo-600 bg-indigo-50', icon: Zap, minutes: 72000, price: 239, validity: '365天' },
};

const txTypeLabels: Record<string, string> = {
  initial: '初始赠送',
  purchase_subscription: '购买套餐',
  purchase_permanent: '购买时长包',
  invite_first_task: '邀请奖励',
  invite_purchase: '邀请购买奖励',
  task_consume_monthly: '消耗订阅时长',
  task_consume_permanent: '消耗永久时长',
  task_refund: '时长返还',
  subscription_expire: '套餐到期',
  subscription_monthly: '月度重置',
  admin_adjust: '管理员调整',
};

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'orders' | 'invites'>('overview');
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  // 数据加载
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [invites, setInvites] = useState<InviteItem[]>([]);
  const [inviteInfo, setInviteInfo] = useState<any>(null);
  const [tabLoading, setTabLoading] = useState(false);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';

  useEffect(() => {
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

  useEffect(() => {
    if (!token) return;
    setTabLoading(true);
    if (activeTab === 'transactions') {
      fetch('/api/credits/transactions?size=50', { headers: { 'Authorization': `Bearer ${token}` } })
        .then((r) => r.json())
        .then((json) => {
          if (json.code === 0) setTransactions(json.data.items || []);
          setTabLoading(false);
        });
    } else if (activeTab === 'orders') {
      fetch('/api/pay/orders?size=50', { headers: { 'Authorization': `Bearer ${token}` } })
        .then((r) => r.json())
        .then((json) => {
          if (json.code === 0) setOrders(json.data.items || []);
          setTabLoading(false);
        });
    } else if (activeTab === 'invites') {
      Promise.all([
        fetch('/api/invite/info', { headers: { 'Authorization': `Bearer ${token}` } }).then((r) => r.json()),
        fetch('/api/invite/list?size=50', { headers: { 'Authorization': `Bearer ${token}` } }).then((r) => r.json()),
      ]).then(([infoRes, listRes]) => {
        if (infoRes.code === 0) setInviteInfo(infoRes.data);
        if (listRes.code === 0) setInvites(listRes.data.items || []);
        setTabLoading(false);
      });
    } else {
      setTabLoading(false);
    }
  }, [activeTab, token]);

  const plan = user ? plans[user.plan] || plans.free : plans.free;
  const PlanIcon = plan.icon;

  const copyInviteLink = () => {
    if (!inviteInfo?.invite_url) return;
    navigator.clipboard.writeText(inviteInfo.invite_url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const tabs = [
    { key: 'overview', label: '账户概览', icon: Wallet },
    { key: 'transactions', label: '时长明细', icon: CreditCard },
    { key: 'orders', label: '购买记录', icon: ShoppingBag },
    { key: 'invites', label: '邀请记录', icon: Users },
  ] as const;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-gray-300 animate-spin" />
      </div>
    );
  }

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

        {/* Tab 导航 */}
        <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl overflow-x-auto">
          {tabs.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                  activeTab === t.key ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                {t.label}
              </button>
            );
          })}
        </div>

        {tabLoading && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
            <Loader2 className="w-6 h-6 text-gray-300 mx-auto mb-3 animate-spin" />
            <p className="text-gray-500">加载中...</p>
          </div>
        )}

        {/* ====== 账户概览 ====== */}
        {activeTab === 'overview' && !tabLoading && (
          <div className="grid gap-6 md:grid-cols-2">
            {/* 基本信息 */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-sm font-medium text-gray-500 mb-4">基本信息</h2>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                    <User className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">微信昵称</p>
                    <p className="text-sm font-medium text-gray-900">{user?.nickname || '微信用户'}</p>
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
                    {user?.plan_expires_at && (
                      <p className="text-xs text-gray-400 mt-1">
                        有效期至 {new Date(user.plan_expires_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* 双轨余额 */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-sm font-medium text-gray-500 mb-4">时长余额</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-xl">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-blue-600" />
                    <span className="text-sm text-gray-600">订阅时长</span>
                  </div>
                  <span className="text-lg font-bold text-blue-600">{user?.monthly_minutes || 0} <span className="text-xs font-normal">分钟</span></span>
                </div>
                <div className="flex items-center justify-between p-3 bg-amber-50 rounded-xl">
                  <div className="flex items-center gap-2">
                    <Gem className="w-4 h-4 text-amber-600" />
                    <span className="text-sm text-gray-600">永久时长</span>
                  </div>
                  <span className="text-lg font-bold text-amber-600">{user?.permanent_minutes || 0} <span className="text-xs font-normal">分钟</span></span>
                </div>
                <div className="flex items-center justify-between text-sm text-gray-500 pt-1">
                  <span>总可用时长</span>
                  <span className="font-medium text-gray-900">{user?.total_minutes || 0} 分钟</span>
                </div>
              </div>
            </div>

            {/* 邀请有礼 */}
            <div className="md:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-sm font-medium text-gray-500 mb-4">🎁 邀请有礼</h2>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="flex-1">
                  <p className="text-sm text-gray-600 mb-2">邀请好友注册并完成首次转录，双方各得 <span className="font-bold text-blue-600">+30</span> 永久分钟</p>
                  <p className="text-xs text-gray-400">好友购买套餐，你再得最高 <span className="font-bold text-amber-600">+300</span> 分钟</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="px-4 py-2 bg-gray-100 rounded-lg text-sm font-mono text-gray-700">
                    {user?.invite_code || '加载中...'}
                  </div>
                  <button
                    onClick={copyInviteLink}
                    className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copied ? '已复制' : '复制链接'}
                  </button>
                </div>
              </div>
            </div>

            {/* 套餐对比 */}
            <div className="md:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-sm font-medium text-gray-500 mb-4">套餐对比</h2>
              <div className="grid gap-4 md:grid-cols-5">
                {Object.entries(plans).map(([key, p]) => (
                  <div key={key} className={`rounded-xl border-2 p-4 ${user?.plan === key ? 'border-blue-200 bg-blue-50/50' : 'border-gray-100'}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <p.icon className={`w-4 h-4 ${p.color.split(' ')[0]}`} />
                      <span className="font-semibold text-sm text-gray-900">{p.name}</span>
                    </div>
                    <p className="text-xl font-bold text-gray-900 mb-1">¥{p.price}<span className="text-xs font-normal text-gray-500">/{p.validity}</span></p>
                    <ul className="space-y-1 text-xs text-gray-600 mt-3">
                      <li>{p.minutes === 0 ? '60分钟永久' : `${p.minutes.toLocaleString()} 分钟`}</li>
                      <li>{p.validity === '永久' ? '永不过期' : `有效期 ${p.validity}`}</li>
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ====== 时长明细 ====== */}
        {activeTab === 'transactions' && !tabLoading && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {transactions.length === 0 ? (
              <div className="p-12 text-center text-gray-500">暂无记录</div>
            ) : (
              <div className="divide-y divide-gray-50">
                {transactions.map((t) => (
                  <div key={t.id} className="flex items-center justify-between p-4 hover:bg-gray-50/50">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        t.amount > 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                      }`}>
                        {t.amount > 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{txTypeLabels[t.type] || t.type}</p>
                        <p className="text-xs text-gray-400">{t.description}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-bold ${t.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {t.amount > 0 ? '+' : ''}{t.amount}
                      </p>
                      <p className="text-xs text-gray-400">
                        {t.balance_type === 'monthly' ? '订阅' : '永久'} · {new Date(t.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ====== 购买记录 ====== */}
        {activeTab === 'orders' && !tabLoading && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {orders.length === 0 ? (
              <div className="p-12 text-center text-gray-500">暂无购买记录</div>
            ) : (
              <div className="divide-y divide-gray-50">
                {orders.map((o) => (
                  <div key={o.id} className="flex items-center justify-between p-4 hover:bg-gray-50/50">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                        <ShoppingBag className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{plans[o.plan_id]?.name || o.plan_id}</p>
                        <p className="text-xs text-gray-400">{new Date(o.created_at).toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-900">¥{o.amount_yuan}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        o.status === 'paid' ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {o.status === 'paid' ? '已支付' : o.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ====== 邀请记录 ====== */}
        {activeTab === 'invites' && !tabLoading && (
          <div className="space-y-6">
            {/* 邀请统计 */}
            {inviteInfo && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
                  <p className="text-2xl font-bold text-gray-900">{inviteInfo.total_invited}</p>
                  <p className="text-xs text-gray-500 mt-1">已邀请人数</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
                  <p className="text-2xl font-bold text-blue-600">{inviteInfo.first_task_rewarded}</p>
                  <p className="text-xs text-gray-500 mt-1">完成首转录</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
                  <p className="text-2xl font-bold text-amber-600">{inviteInfo.purchase_rewarded}</p>
                  <p className="text-xs text-gray-500 mt-1">购买套餐</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
                  <p className="text-2xl font-bold text-green-600">+{inviteInfo.total_reward_minutes}</p>
                  <p className="text-xs text-gray-500 mt-1">获得奖励(分钟)</p>
                </div>
              </div>
            )}

            {/* 邀请列表 */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {invites.length === 0 ? (
                <div className="p-12 text-center text-gray-500">暂无邀请记录，快去分享链接吧！</div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {invites.map((inv, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 hover:bg-gray-50/50">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-sm font-bold text-gray-500">
                          {inv.invitee_nickname?.[0] || '?'}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{inv.invitee_nickname}</p>
                          <p className="text-xs text-gray-400">{new Date(inv.created_at).toLocaleDateString()} 注册</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          inv.status === 'purchased' ? 'bg-amber-50 text-amber-600' :
                          inv.status === 'first_task_done' ? 'bg-blue-50 text-blue-600' :
                          'bg-gray-100 text-gray-500'
                        }`}>
                          {inv.status === 'registered' && '已注册'}
                          {inv.status === 'first_task_done' && '已完成首转'}
                          {inv.status === 'purchased' && '已购买'}
                        </span>
                        {inv.purchase_reward_minutes > 0 && (
                          <p className="text-xs text-amber-600 mt-1">+{inv.purchase_reward_minutes} 分钟</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
