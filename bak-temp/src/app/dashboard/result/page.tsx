'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Video, FileText, Sparkles, BookOpen, Download, Copy, Check, ArrowLeft, Loader2 } from 'lucide-react';

interface TaskData {
  id: string;
  title: string;
  duration: number;
  status: string;
  transcript: string;
  summary: {
    overview: string;
    points: string[];
    audience: string;
    suggestion: string;
  } | null;
  notes: string;
  uploader?: string;
  pic?: string;
}

export default function ResultPage() {
  const searchParams = useSearchParams();
  const taskId = searchParams.get('id');
  const [task, setTask] = useState<TaskData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'transcript' | 'summary' | 'notes'>('transcript');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!taskId) {
      setError('缺少任务 ID');
      setLoading(false);
      return;
    }
    const token = localStorage.getItem('token');
    fetch(`/api/tasks/${taskId}`, {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
    })
      .then((r) => r.json())
      .then((json) => {
        if (json.code !== 0) {
          setError(json.detail || '加载失败');
        } else {
          setTask(json.data);
        }
        setLoading(false);
      })
      .catch((e) => {
        setError('网络错误: ' + e.message);
        setLoading(false);
      });
  }, [taskId]);

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return h > 0 ? `${h}小时${m}分钟` : `${m}分钟`;
  };

  const parseTranscript = (text: string) => {
    if (!text) return [];
    return text.split('\n').map((line) => {
      const match = line.match(/^\[(\d{2}:\d{2})\]\s*(.*)$/);
      if (match) {
        return { time: match[1], text: match[2] };
      }
      return { time: '', text: line };
    }).filter((item) => item.text);
  };

  const handleCopy = () => {
    if (!task) return;
    let content = '';
    if (activeTab === 'transcript') {
      content = task.transcript || '';
    } else if (activeTab === 'summary' && task.summary) {
      content = `${task.summary.overview}\n\n核心要点：\n${task.summary.points.map((p) => `- ${p}`).join('\n')}\n\n适合人群：${task.summary.audience}\n\n学习建议：${task.summary.suggestion}`;
    } else {
      content = task.notes || '';
    }
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExport = () => {
    if (!task?.notes) return;
    const blob = new Blob([task.notes], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${task.title || '笔记'}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-500">
          <Loader2 className="w-5 h-5 animate-spin" />
          加载中...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <a href="/dashboard" className="text-blue-600 hover:underline">返回工作台</a>
        </div>
      </div>
    );
  }

  if (!task) return null;

  const transcriptItems = parseTranscript(task.transcript || '');

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <a href="/dashboard" className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
            <ArrowLeft className="w-4 h-4" />
            返回工作台
          </a>
          <div className="flex items-center gap-3">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
              {copied ? '已复制' : '复制'}
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors"
            >
              <Download className="w-4 h-4" />
              导出 Markdown
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Video info */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <Video className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="font-semibold text-gray-900 truncate">{task.title || '未命名视频'}</h1>
              <div className="flex items-center gap-4 text-sm text-gray-500 mt-0.5">
                <span>UP主：{task.uploader || '未知'}</span>
                <span>时长：{formatDuration(task.duration || 0)}</span>
                <span className="text-green-600 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" />
                  {task.status === 'done' ? '处理完成' : task.status}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('transcript')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'transcript' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <FileText className="w-4 h-4" />
            转录原文
          </button>
          <button
            onClick={() => setActiveTab('summary')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'summary' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            AI 总结
          </button>
          <button
            onClick={() => setActiveTab('notes')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'notes' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            学习笔记
          </button>
        </div>

        {/* Content */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden min-h-[300px]">
          {activeTab === 'transcript' && (
            <div className="divide-y divide-gray-50">
              {transcriptItems.length > 0 ? (
                transcriptItems.map((item, index) => (
                  <div key={index} className="flex gap-4 p-4 hover:bg-gray-50/50 transition-colors">
                    {item.time && (
                      <span className="text-sm font-mono text-blue-600 flex-shrink-0 w-12">{item.time}</span>
                    )}
                    <p className="text-sm text-gray-700 leading-relaxed">{item.text}</p>
                  </div>
                ))
              ) : (
                <div className="p-12 text-center text-gray-400">暂无转录内容</div>
              )}
            </div>
          )}

          {activeTab === 'summary' && (
            <div className="p-6 space-y-6">
              {task.summary ? (
                <>
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 mb-2 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-blue-600" />
                      视频摘要
                    </h3>
                    <p className="text-sm text-gray-600 leading-relaxed">{task.summary.overview}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 mb-3">核心要点</h3>
                    <ul className="space-y-2">
                      {task.summary.points?.map((point, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                          <span className="w-5 h-5 rounded-full bg-blue-50 text-blue-600 text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                            {i + 1}
                          </span>
                          {point}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                    <div>
                      <h4 className="text-xs font-medium text-gray-500 mb-1">适合人群</h4>
                      <p className="text-sm text-gray-700">{task.summary.audience}</p>
                    </div>
                    <div>
                      <h4 className="text-xs font-medium text-gray-500 mb-1">学习建议</h4>
                      <p className="text-sm text-gray-700">{task.summary.suggestion}</p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="p-12 text-center text-gray-400">暂无 AI 总结</div>
              )}
            </div>
          )}

          {activeTab === 'notes' && (
            <div className="p-6">
              {task.notes ? (
                <div className="prose prose-sm max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-code:text-blue-600 prose-code:bg-blue-50 prose-code:px-1 prose-code:rounded prose-pre:bg-gray-900 prose-pre:text-gray-100">
                  <div dangerouslySetInnerHTML={{ __html: renderMarkdown(task.notes) }} />
                </div>
              ) : (
                <div className="p-12 text-center text-gray-400">暂无学习笔记</div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}


function renderMarkdown(md: string): string {
  if (!md) return '';
  return md
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/^# (.*)$/gim, '<h1 class="text-2xl font-bold text-gray-900 mb-4 mt-6">$1</h1>')
    .replace(/^## (.*)$/gim, '<h2 class="text-lg font-semibold text-gray-900 mt-6 mb-3">$1</h2>')
    .replace(/^### (.*)$/gim, '<h3 class="text-base font-medium text-gray-900 mt-4 mb-2">$1</h3>')
    .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre class="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto my-4 text-sm"><code>$2</code></pre>')
    .replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-mono">$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold text-gray-900">$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em class="italic text-gray-700">$1</em>')
    .replace(/^- (.*)$/gim, '<li class="ml-4 text-sm text-gray-700 leading-relaxed">$1</li>')
    .replace(/\n\n+/g, '\n<p class="mb-3"></p>\n')
    .replace(/\n/g, '<br/>');
}
