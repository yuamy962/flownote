'use client';

import { useState, useEffect } from 'react';
import {
  Users, FileText, DollarSign, Activity, Server, RefreshCw,
  CheckCircle, XCircle, AlertCircle, TrendingUp, Clock, Zap
} from 'lucide-react';

interface StatsData {
  users: {
    total: number;
    new_today: number;
    new_week: number;
    active_week: number;
    plan_distribution: Record<string, number>;
  };
  tasks: {
    total: number;
    done: number;
    failed: number;
    processing: number;
    pending: number;
    today: number;
    week: number;
    success_rate: number;
    source_distribution: Record<string, number>;
    total_consumed_minutes: number;
  };
  revenue: {
    total_yuan: number;
    today_yuan: number;
    week_yuan: number;
    month_yuan: number;
    paid_orders_count: number;
  };
  system: {
    gpu_status: string;
    gpu_url: string;
  };
  recent_tasks: Array<{
    id: string;
    title: string;
    status: string;
    source_type: string;
    duration: number;
    consumed_minutes: number;
    created_at: string;
  }>;
  recent_orders: Array<{
    id: string;
    plan_id: string;
    amount_yuan: number;
    paid_at: string;
  }>;
  daily_chart: Array<{
    date: string;
    tasks: number;
    done: number;
    failed: number;
  }>;
  revenue_chart: Array<{
    date: string;
    revenue_yuan: number;
    orders: number;
  }>;
}

interface HealthData {
  status: string;
  checks: Record<string, string>;
  timestamp: string;
}

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [loggedIn, setLoggedIn] = useState(false);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<'overview' | 'tasks' | 'revenue' | 'system'>('overview');

  const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') || '' : '';

  useEffect(() => {
    const saved = localStorage.getItem('admin_token');
    if (saved) {
      setPassword(saved);
      setLoggedIn(true);
    }
  }, []);

  useEffect(() => {
    if (loggedIn) fetchData();
  }, [loggedIn]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const headers = { 'Authorization': `Bearer ${password}` };
      const [statsResp, healthResp] = await Promise.all([
        fetch('/api/admin/stats', { headers }),
        fetch('/api/admin/health-detail', { headers }),
      ]);
      if (statsResp.ok) {
        const statsJson = await statsResp.json();
        setStats(statsJson.data);
      }
      if (healthResp.ok) {
        const healthJson = await healthResp.json();
        setHealth(healthJson.data);
      }
    } catch (e) {
      console.error('Fetch error:', e);
    }
    setLoading(false);
  };

  const handleLogin = () => {
    if (!password.trim()) return;
    localStorage.setItem('admin_token', password);
    setLoggedIn(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    setLoggedIn(false);
    setPassword('');
  };

  if (!loggedIn) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm">
          <div className="text-center mb-6">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-3">
              <Server className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">FlowNote 管理后台</h1>
            <p className="text-sm text-gray-500 mt-1">请输入管理密码</p>
          </div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            placeholder="管理密码"
            className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleLogin}
            className="w-full mt-4 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            登录
          </button>
        </div>
      </div>
    );
  }

  const statusIcon = (status: string) => {
    if (status === 'ok' || status === 'configured') return <CheckCircle className="w-4 h-4 text-green-500" />;
    if (status === 'warn') return <AlertCircle className="w-4 h-4 text-amber-500" />;
    return <XCircle className="w-4 h-4 text-red-500" />;
  };

  const planNames: Record<string, string> = {
    free: '免费', basic: '轻量月卡', pro: '专业月卡',
    basic_year: '轻量年卡', pro_year: '专业年卡', unlimited: '无限',
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Server className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg">FlowNote Admin</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchData}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              刷新
            </button>
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              退出
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl w-fit">
          {(['overview', 'tasks', 'revenue', 'system'] as const).map((key) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === key ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {key === 'overview' && '总览'}
              {key === 'tasks' && '任务'}
              {key === 'revenue' && '收入'}
              {key === 'system' && '系统'}
            </button>
          ))}
        </div>

        {tab === 'overview' && stats && (
          <div>
            {/* Core Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-xl border p-4">
                <div className="flex items-center gap-2 text-gray-500 text-xs mb-2">
                  <Users className="w-4 h-4" />总用户
                </div>
                <p className="text-2xl font-bold text-gray-900">{stats.users.total}</p>
                <p className="text-xs text-green-600 mt-1">今日+{stats.users.new_today} 本周+{stats.users.new_week}</p>
              </div>
              <div className="bg-white rounded-xl border p-4">
                <div className="flex items-center gap-2 text-gray-500 text-xs mb-2">
                  <FileText className="w-4 h-4" />总任务
                </div>
                <p className="text-2xl font-bold text-gray-900">{stats.tasks.total}</p>
                <p className="text-xs text-green-600 mt-1">今日{stats.tasks.today} 成功率{stats.tasks.success_rate}%</p>
              </div>
              <div className="bg-white rounded-xl border p-4">
                <div className="flex items-center gap-2 text-gray-500 text-xs mb-2">
                  <DollarSign className="w-4 h-4" />总收入
                </div>
                <p className="text-2xl font-bold text-gray-900">¥{stats.revenue.total_yuan}</p>
                <p className="text-xs text-green-600 mt-1">本月¥{stats.revenue.month_yuan}</p>
              </div>
              <div className="bg-white rounded-xl border p-4">
                <div className="flex items-center gap-2 text-gray-500 text-xs mb-2">
                  <Activity className="w-4 h-4" />周活用户
                </div>
                <p className="text-2xl font-bold text-gray-900">{stats.users.active_week}</p>
                <p className="text-xs text-gray-500 mt-1">消耗{stats.tasks.total_consumed_minutes}分钟</p>
              </div>
            </div>

            {/* Plan Distribution + Recent */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl border p-5">
                <h3 className="text-sm font-medium text-gray-900 mb-3">套餐分布</h3>
                <div className="space-y-2">
                  {Object.entries(stats.users.plan_distribution).map(([plan, count]) => (
                    <div key={plan} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">{planNames[plan] || plan}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-gray-100 rounded-full h-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full"
                            style={{ width: `${Math.min(100, (count / stats.users.total) * 100)}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium text-gray-900 w-8 text-right">{count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-xl border p-5">
                <h3 className="text-sm font-medium text-gray-900 mb-3">最近订单</h3>
                <div className="space-y-2">
                  {stats.recent_orders.length === 0 ? (
                    <p className="text-sm text-gray-400">暂无订单</p>
                  ) : stats.recent_orders.map((order) => (
                    <div key={order.id} className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">{planNames[order.plan_id] || order.plan_id}</span>
                      <span className="font-medium text-green-600">¥{order.amount_yuan}</span>
                      <span className="text-gray-400 text-xs">
                        {order.paid_at ? new Date(order.paid_at).toLocaleString('zh-CN') : '-'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Daily Chart (simple bar) */}
            <div className="bg-white rounded-xl border p-5 mt-6">
              <h3 className="text-sm font-medium text-gray-900 mb-3">近14天任务趋势</h3>
              <div className="flex items-end gap-1 h-32">
                {[...stats.daily_chart].reverse().map((day) => {
                  const maxTasks = Math.max(...stats.daily_chart.map(d => d.tasks), 1);
                  const height = (day.tasks / maxTasks) * 100;
                  return (
                    <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-[10px] text-gray-500">{day.tasks}</span>
                      <div
                        className="w-full bg-blue-500 rounded-t"
                        style={{ height: `${Math.max(2, height)}%` }}
                      />
                      <span className="text-[9px] text-gray-400">{day.date?.slice(5)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {tab === 'tasks' && stats && (
          <div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
              <div className="bg-white rounded-xl border p-4 text-center">
                <p className="text-2xl font-bold text-green-600">{stats.tasks.done}</p>
                <p className="text-xs text-gray-500 mt-1">已完成</p>
              </div>
              <div className="bg-white rounded-xl border p-4 text-center">
                <p className="text-2xl font-bold text-red-600">{stats.tasks.failed}</p>
                <p className="text-xs text-gray-500 mt-1">失败</p>
              </div>
              <div className="bg-white rounded-xl border p-4 text-center">
                <p className="text-2xl font-bold text-blue-600">{stats.tasks.processing}</p>
                <p className="text-xs text-gray-500 mt-1">处理中</p>
              </div>
              <div className="bg-white rounded-xl border p-4 text-center">
                <p className="text-2xl font-bold text-amber-600">{stats.tasks.pending}</p>
                <p className="text-xs text-gray-500 mt-1">等待中</p>
              </div>
              <div className="bg-white rounded-xl border p-4 text-center">
                <p className="text-2xl font-bold text-gray-900">{stats.tasks.success_rate}%</p>
                <p className="text-xs text-gray-500 mt-1">成功率</p>
              </div>
            </div>

            <div className="bg-white rounded-xl border p-5">
              <h3 className="text-sm font-medium text-gray-900 mb-3">最近任务</h3>
              <div className="divide-y">
                {stats.recent_tasks.map((task) => (
                  <div key={task.id} className="flex items-center justify-between py-2.5">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 truncate">{task.title}</p>
                      <p className="text-xs text-gray-400">
                        {task.source_type === 'bilibili' ? 'B站' : '上传'} · {task.duration}秒 · {task.consumed_minutes}分钟
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      task.status === 'done' ? 'bg-green-50 text-green-600' :
                      task.status === 'failed' ? 'bg-red-50 text-red-600' :
                      task.status === 'processing' ? 'bg-blue-50 text-blue-600' :
                      'bg-amber-50 text-amber-600'
                    }`}>
                      {task.status === 'done' ? '完成' : task.status === 'failed' ? '失败' : task.status === 'processing' ? '处理中' : '等待'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 'revenue' && stats && (
          <div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-xl border p-4">
                <p className="text-xs text-gray-500 mb-1">总收入</p>
                <p className="text-2xl font-bold text-gray-900">¥{stats.revenue.total_yuan}</p>
              </div>
              <div className="bg-white rounded-xl border p-4">
                <p className="text-xs text-gray-500 mb-1">今日</p>
                <p className="text-2xl font-bold text-green-600">¥{stats.revenue.today_yuan}</p>
              </div>
              <div className="bg-white rounded-xl border p-4">
                <p className="text-xs text-gray-500 mb-1">本周</p>
                <p className="text-2xl font-bold text-blue-600">¥{stats.revenue.week_yuan}</p>
              </div>
              <div className="bg-white rounded-xl border p-4">
                <p className="text-xs text-gray-500 mb-1">本月</p>
                <p className="text-2xl font-bold text-purple-600">¥{stats.revenue.month_yuan}</p>
              </div>
            </div>

            <div className="bg-white rounded-xl border p-5">
              <h3 className="text-sm font-medium text-gray-900 mb-3">近14天收入趋势</h3>
              <div className="flex items-end gap-1 h-32">
                {[...stats.revenue_chart].reverse().map((day) => {
                  const maxRev = Math.max(...stats.revenue_chart.map(d => d.revenue_yuan), 1);
                  const height = (day.revenue_yuan / maxRev) * 100;
                  return (
                    <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-[10px] text-gray-500">¥{day.revenue_yuan}</span>
                      <div
                        className="w-full bg-green-500 rounded-t"
                        style={{ height: `${Math.max(2, height)}%` }}
                      />
                      <span className="text-[9px] text-gray-400">{day.date?.slice(5)}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white rounded-xl border p-5 mt-6">
              <h3 className="text-sm font-medium text-gray-900 mb-3">付费订单数: {stats.revenue.paid_orders_count}</h3>
              <div className="divide-y">
                {stats.recent_orders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between py-2.5">
                    <span className="text-sm text-gray-600">{planNames[order.plan_id] || order.plan_id}</span>
                    <span className="text-sm font-medium text-green-600">¥{order.amount_yuan}</span>
                    <span className="text-xs text-gray-400">
                      {order.paid_at ? new Date(order.paid_at).toLocaleString('zh-CN') : '-'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 'system' && health && (
          <div>
            <div className="bg-white rounded-xl border p-5 mb-6">
              <div className="flex items-center gap-3 mb-4">
                {health.status === 'healthy' ? (
                  <CheckCircle className="w-6 h-6 text-green-500" />
                ) : (
                  <AlertCircle className="w-6 h-6 text-amber-500" />
                )}
                <div>
                  <p className="font-medium text-gray-900">
                    系统状态: {health.status === 'healthy' ? '正常' : '异常'}
                  </p>
                  <p className="text-xs text-gray-400">
                    检测时间: {new Date(health.timestamp).toLocaleString('zh-CN')}
                  </p>
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-3">
                {Object.entries(health.checks).map(([name, status]) => (
                  <div key={name} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    {statusIcon(status)}
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {name === 'database' ? 'PostgreSQL' :
                         name === 'redis' ? 'Redis' :
                         name === 'gpu_server' ? 'GPU 转录服务器' :
                         name === 'deepseek_api' ? 'DeepSeek API' : name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {status === 'ok' ? '运行正常' :
                         status === 'configured' ? '已配置' :
                         status === 'warn' ? '需要关注' : status}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {stats && (
              <div className="bg-white rounded-xl border p-5">
                <h3 className="text-sm font-medium text-gray-900 mb-3">GPU 服务器</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">地址</span>
                    <span className="text-gray-900">{stats.system.gpu_url}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">状态</span>
                    <span className={stats.system.gpu_status === 'ok' ? 'text-green-600' : 'text-red-600'}>
                      {stats.system.gpu_status === 'ok' ? '正常' : stats.system.gpu_status}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
