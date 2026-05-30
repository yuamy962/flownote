'use client';

import { useState } from 'react';
import { Video, Clock, CheckCircle, XCircle, Loader2, Trash2, ExternalLink, FileText } from 'lucide-react';

interface Task {
  id: string;
  title: string;
  source: string;
  sourceType: 'bilibili' | 'upload';
  duration: number;
  status: 'processing' | 'done' | 'failed';
  createdAt: string;
}

const mockTasks: Task[] = [
  { id: '1', title: 'Python爬虫从入门到实战', source: 'BV1xx411c7mD', sourceType: 'bilibili', duration: 3600, status: 'done', createdAt: '2025-05-30 14:20' },
  { id: '2', title: '改变一生的认知！易疲劳体质的形成与人体"充电"原理', source: 'BV1PrVN6oEvp', sourceType: 'bilibili', duration: 1860, status: 'done', createdAt: '2025-05-29 09:15' },
  { id: '3', title: '考研数学复习全攻略｜高数线性代数概率论', source: 'BV2yy522d8nK', sourceType: 'bilibili', duration: 7200, status: 'processing', createdAt: '2025-05-30 16:00' },
  { id: '4', title: 'C++ 高性能编程｜内存管理与并发', source: 'BV3zz633e9pM', sourceType: 'bilibili', duration: 3600, status: 'failed', createdAt: '2025-05-28 20:30' },
  { id: '5', title: '2025 前端开发 roadmap｜React + Vue 学习路线', source: 'BV4aa744f2qR', sourceType: 'bilibili', duration: 1800, status: 'done', createdAt: '2025-05-27 11:00' },
  { id: '6', title: '雅思口语 8 分技巧｜Part 2 万能模板', source: 'BV5bb855g3sT', sourceType: 'bilibili', duration: 2400, status: 'done', createdAt: '2025-05-26 19:45' },
];

const statusConfig = {
  processing: { label: '处理中', color: 'text-blue-600 bg-blue-50', icon: Loader2 },
  done: { label: '已完成', color: 'text-green-600 bg-green-50', icon: CheckCircle },
  failed: { label: '失败', color: 'text-red-600 bg-red-50', icon: XCircle },
};

export default function HistoryPage() {
  const [filter, setFilter] = useState<'all' | 'processing' | 'done' | 'failed'>('all');
  const [tasks, setTasks] = useState(mockTasks);

  const filteredTasks = filter === 'all' ? tasks : tasks.filter((t) => t.status === filter);

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return h > 0 ? `${h}小时${m}分钟` : `${m}分钟`;
  };

  const handleDelete = (id: string) => {
    if (confirm('确定要删除这条记录吗？')) {
      setTasks((prev) => prev.filter((t) => t.id !== id));
    }
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
            </nav>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-gray-500">剩余 60 分钟</span>
            <a href="/pricing" className="text-blue-600 hover:underline">升级</a>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-semibold text-gray-900">历史记录</h1>
          <span className="text-sm text-gray-500">共 {tasks.length} 条记录</span>
        </div>

        {/* Filter tabs */}
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

        {/* Task list */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {filteredTasks.length === 0 ? (
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
                      <span className="text-sm font-bold text-blue-300">{task.title[0]}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-gray-900 truncate">{task.title}</h3>
                      <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                        <span>{task.sourceType === 'bilibili' ? 'B站' : '上传'}</span>
                        <span>·</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDuration(task.duration)}
                        </span>
                        <span>·</span>
                        <span>{task.createdAt}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${status.color}`}>
                        <StatusIcon className={`w-3.5 h-3.5 ${task.status === 'processing' ? 'animate-spin' : ''}`} />
                        {status.label}
                      </span>
                      {task.status === 'done' && (
                        <a
                          href="/dashboard/result"
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
