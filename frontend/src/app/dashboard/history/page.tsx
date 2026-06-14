'use client';

import { useState, useEffect } from 'react';
import { Video, Clock, CheckCircle, XCircle, Loader2, Trash2, ExternalLink, FileText, Zap } from 'lucide-react';

interface Task {
  id: string;
  title: string;
  source_type: string;
  duration: number;
  status: 'pending' | 'processing' | 'done' | 'failed';
  created_at: string;
  consumed_minutes: number;
  cost_type: string;
}

const statusConfig: Record<string, { label: string; color: string; icon: typeof Loader2 }> = {
  pending: { label: '等待中', color: 'text-amber-600 bg-amber-50', icon: Loader2 },
  processing: { label: '处理中', color: 'text-blue-600 bg-blue-50', icon: Loader2 },
  done: { label: '已完成', color: 'text-green-600 bg-green-50', icon: CheckCircle },
  failed: { label: '失败', color: 'text-red-600 bg-red-50', icon: XCircle },
};

export default function HistoryPage() {
  const [filter, setFilter] = useState<'all' | 'processing' | 'done' | 'failed'>('all');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch('/api/tasks', {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
    })
      .then((r) => r.json())
      .then((json) => {
        if (json.code === 0) {
          setTasks(json.data.items || []);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filteredTasks = filter === 'all' ? tasks : tasks.filter((t) => t.status === filter);

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return h > 0 ? `${h}小时${m}分钟` : `${m}分钟`;
  };

  const formatCost = (task: Task) => {
    if (task.cost_type === 'unlimited') return '无限套餐';
    if (!task.consumed_minutes) return '免费';
    return `消耗 ${task.consumed_minutes} 分钟`;
  };

  const handleDelete = (id: string) => {
    if (!confirm('确定要删除这条记录吗？')) return;
    const token = localStorage.getItem('token');
    fetch(`/api/tasks/${id}`, {
      method: 'DELETE',
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
    })
      .then((r) => r.json())
      .then((json) => {
        if (json.code === 0) {
          setTasks((prev) => prev.filter((t) => t.id !== id));
        }
      });
  };

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
              <a href="/dashboard/history" className="px-3 py-1.5 text-blue-600 bg-blue-50 rounded-lg font-medium">历史记录</a>
              <a href="/dashboard/profile" className="px-3 py-1.5 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-50">用户中心</a>
              <a
                href="/pricing"
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg font-medium hover:from-amber-600 hover:to-orange-600 transition-all shadow-sm"
              >
                <Zap className="w-3.5 h-3.5" />
                购买套餐
              </a>
            </nav>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <a href="/pricing" className="text-blue-600 hover:underline">升级</a>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-semibold text-gray-900">历史记录</h1>
          <span className="text-sm text-gray-500">共 {tasks.length} 条记录</span>
        </div>

        <div className="flex gap-2 mb-6">
          {(['all', 'processing', 'done', 'failed'] as const).map((key) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filter === key
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {key === 'all' && '全部'}
              {key === 'processing' && '处理中'}
              {key === 'done' && '已完成'}
              {key === 'failed' && '失败'}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <Loader2 className="w-6 h-6 text-gray-300 mx-auto mb-3 animate-spin" />
              <p className="text-gray-500">加载中...</p>
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">暂无记录</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {filteredTasks.map((task) => {
                const status = statusConfig[task.status];
                const StatusIcon = status.icon;
                return (
                  <div key={task.id} className="flex items-center gap-4 p-4 hover:bg-gray-50/50 transition-colors">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-blue-300">{task.title?.[0] || '▶'}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-gray-900 truncate">{task.title}</h3>
                      <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5 flex-wrap">
                        <span>{task.source_type === 'bilibili' ? 'B站' : '上传'}</span>
                        <span>·</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDuration(task.duration)}
                        </span>
                        <span>·</span>
                        <span className={`text-xs ${task.cost_type === 'unlimited' ? 'text-amber-600' : 'text-gray-400'}`}>
                          {formatCost(task)}
                        </span>
                        <span>·</span>
                        <span>{new Date(task.created_at).toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${status.color}`}>
                        <StatusIcon className={`w-3.5 h-3.5 ${task.status === 'processing' ? 'animate-spin' : ''}`} />
                        {status.label}
                      </span>
                      {task.status === 'done' && (
                        <a
                          href={`/dashboard/result?id=${task.id}`}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="查看结果"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                      <button
                        onClick={() => handleDelete(task.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="删除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
