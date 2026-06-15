'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Video, FileText, Sparkles, BookOpen, Download, Copy, Check, ArrowLeft, Loader2, Edit3, Save, X, Search, FileDown, GitBranch } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

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

function ResultPageInner() {
  const searchParams = useSearchParams();
  const taskId = searchParams.get('id');
  const [task, setTask] = useState<TaskData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'transcript' | 'summary' | 'mindmap' | 'notes'>('transcript');
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<number[]>([]);
  const [currentMatch, setCurrentMatch] = useState(0);

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

  const handleExportPDF = () => {
    if (!task?.notes) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${task.title || '笔记'} - FlowNote</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px 20px; color: #1f2937; line-height: 1.8; }
          h1 { font-size: 24px; border-bottom: 2px solid #3b82f6; padding-bottom: 8px; margin-top: 32px; }
          h2 { font-size: 20px; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; margin-top: 28px; }
          h3 { font-size: 16px; margin-top: 20px; }
          p { margin: 8px 0; }
          ul, ol { padding-left: 24px; }
          li { margin: 4px 0; }
          code { background: #f3f4f6; padding: 2px 6px; border-radius: 4px; font-size: 13px; }
          pre { background: #1f2937; color: #f9fafb; padding: 16px; border-radius: 8px; overflow-x: auto; }
          pre code { background: none; padding: 0; color: inherit; }
          blockquote { border-left: 4px solid #3b82f6; padding-left: 16px; margin: 12px 0; color: #6b7280; }
          table { border-collapse: collapse; width: 100%; margin: 12px 0; }
          th, td { border: 1px solid #e5e7eb; padding: 8px 12px; text-align: left; }
          th { background: #f9fafb; font-weight: 600; }
          .header { text-align: center; margin-bottom: 32px; }
          .header h1 { font-size: 28px; border: none; }
          .header p { color: #6b7280; font-size: 14px; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${task.title || '未命名视频'}</h1>
          <p>FlowNote · ${new Date().toLocaleDateString('zh-CN')}</p>
        </div>
        <div id="content"></div>
        <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
        <script>
          document.getElementById('content').innerHTML = marked.parse(${JSON.stringify(task.notes)});
          setTimeout(() => { window.print(); window.close(); }, 500);
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleEdit = () => {
    setEditContent(task?.notes || '');
    setEditing(true);
  };

  const handleSaveNotes = async () => {
    if (!task) return;
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const resp = await fetch(`/api/tasks/${task.id}/notes`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ notes: editContent }),
      });
      const json = await resp.json();
      if (json.code === 0) {
        setTask({ ...task, notes: editContent });
        setEditing(false);
      } else {
        alert(json.detail || '保存失败');
      }
    } catch (e) {
      alert('网络错误，保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (!query.trim() || !task?.transcript) {
      setSearchResults([]);
      setCurrentMatch(0);
      return;
    }
    const items = parseTranscript(task.transcript);
    const lowerQuery = query.toLowerCase();
    const indices: number[] = [];
    items.forEach((item, idx) => {
      if (item.text.toLowerCase().includes(lowerQuery)) {
        indices.push(idx);
      }
    });
    setSearchResults(indices);
    setCurrentMatch(indices.length > 0 ? 1 : 0);
  };

  const scrollToMatch = (matchIndex: number) => {
    const el = document.getElementById(`transcript-line-${matchIndex}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleNextMatch = () => {
    if (searchResults.length === 0) return;
    const next = currentMatch >= searchResults.length ? 1 : currentMatch + 1;
    setCurrentMatch(next);
    scrollToMatch(searchResults[next - 1]);
  };

  const handlePrevMatch = () => {
    if (searchResults.length === 0) return;
    const prev = currentMatch <= 1 ? searchResults.length : currentMatch - 1;
    setCurrentMatch(prev);
    scrollToMatch(searchResults[prev - 1]);
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
              onClick={handleExportPDF}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <FileDown className="w-4 h-4" />
              导出 PDF
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
            onClick={() => setActiveTab('mindmap')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'mindmap' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <GitBranch className="w-4 h-4" />
            思维导图
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
            <div>
              {transcriptItems.length > 0 && (
                <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-gray-50/50">
                  <div className="relative flex-1 max-w-xs">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => handleSearch(e.target.value)}
                      placeholder="搜索转录内容..."
                      className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  {searchQuery && searchResults.length > 0 && (
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <button onClick={handlePrevMatch} className="p-1 hover:bg-gray-200 rounded">‹</button>
                      <span>{currentMatch}/{searchResults.length}</span>
                      <button onClick={handleNextMatch} className="p-1 hover:bg-gray-200 rounded">›</button>
                    </div>
                  )}
                  {searchQuery && searchResults.length === 0 && (
                    <span className="text-xs text-gray-400">无匹配结果</span>
                  )}
                </div>
              )}
              <div className="divide-y divide-gray-50">
                {transcriptItems.length > 0 ? (
                  transcriptItems.map((item, index) => {
                    const isMatch = searchResults.includes(index);
                    const isCurrentMatch = searchResults[currentMatch - 1] === index;
                    const highlightText = (text: string) => {
                      if (!searchQuery.trim()) return text;
                      const parts = text.split(new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
                      return parts.map((part, i) =>
                        part.toLowerCase() === searchQuery.toLowerCase()
                          ? <mark key={i} className={isCurrentMatch ? 'bg-yellow-300' : 'bg-yellow-100'}>{part}</mark>
                          : part
                      );
                    };
                    return (
                      <div
                        key={index}
                        id={`transcript-line-${index}`}
                        className={`flex gap-4 p-4 transition-colors ${isCurrentMatch ? 'bg-yellow-50' : 'hover:bg-gray-50/50'}`}
                      >
                        {item.time && (
                          <span className="text-sm font-mono text-blue-600 flex-shrink-0 w-12">{item.time}</span>
                        )}
                        <p className="text-sm text-gray-700 leading-relaxed">{highlightText(item.text)}</p>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-12 text-center text-gray-400">暂无转录内容</div>
                )}
              </div>
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
              ) : task.transcript ? (
                <div className="text-center py-8">
                  <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <Sparkles className="w-6 h-6 text-amber-500" />
                  </div>
                  <p className="text-amber-600 font-medium mb-1">AI 总结生成失败</p>
                  <p className="text-sm text-gray-500">你可以切换到「转录原文」标签查看完整转录内容</p>
                </div>
              ) : (
                <div className="p-12 text-center text-gray-400">暂无 AI 总结</div>
              )}
            </div>
          )}

          {activeTab === 'mindmap' && (
            <div className="p-6">
              {task.summary ? (
                <div className="space-y-6">
                  {/* 中心主题 */}
                  <div className="flex justify-center">
                    <div className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold text-sm shadow-lg shadow-blue-200">
                      {task.title || '视频主题'}
                    </div>
                  </div>

                  {/* 视频摘要 */}
                  {task.summary.overview && (
                    <div className="max-w-2xl mx-auto">
                      <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                        <h4 className="text-xs font-medium text-blue-600 mb-2 flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5" />
                          视频摘要
                        </h4>
                        <p className="text-sm text-gray-700 leading-relaxed">{task.summary.overview}</p>
                      </div>
                    </div>
                  )}

                  {/* 核心要点 - 思维导图分支 */}
                  {task.summary.points && task.summary.points.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-900 mb-4 text-center">核心要点</h3>
                      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {task.summary.points.map((point, i) => (
                          <div key={i} className="relative">
                            {/* 连接线 */}
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-px h-3 bg-gray-300" />
                            <div className="p-4 bg-white rounded-xl border-2 border-gray-100 hover:border-blue-200 hover:shadow-md transition-all">
                              <div className="flex items-start gap-2.5">
                                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                                  {i + 1}
                                </div>
                                <p className="text-sm text-gray-700 leading-relaxed">{point}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 适合人群 & 学习建议 */}
                  <div className="grid sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
                    {task.summary.audience && (
                      <div className="p-4 bg-green-50 rounded-xl border border-green-100">
                        <h4 className="text-xs font-medium text-green-600 mb-2">适合人群</h4>
                        <p className="text-sm text-gray-700">{task.summary.audience}</p>
                      </div>
                    )}
                    {task.summary.suggestion && (
                      <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                        <h4 className="text-xs font-medium text-amber-600 mb-2">学习建议</h4>
                        <p className="text-sm text-gray-700">{task.summary.suggestion}</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <GitBranch className="w-6 h-6 text-gray-400" />
                  </div>
                  <p className="text-gray-500">暂无思维导图数据</p>
                  <p className="text-sm text-gray-400 mt-1">AI 总结生成后即可查看思维导图</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'notes' && (
            <div className="p-6">
              {editing ? (
                <div>
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full h-[500px] p-4 border border-gray-200 rounded-lg text-sm text-gray-700 font-mono resize-y focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="编辑笔记内容（支持 Markdown 格式）"
                  />
                  <div className="flex justify-end gap-2 mt-3">
                    <button
                      onClick={() => setEditing(false)}
                      className="flex items-center gap-1.5 px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <X className="w-4 h-4" />
                      取消
                    </button>
                    <button
                      onClick={handleSaveNotes}
                      disabled={saving}
                      className="flex items-center gap-1.5 px-4 py-2 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      {saving ? '保存中...' : '保存'}
                    </button>
                  </div>
                </div>
              ) : task.notes ? (
                <div>
                  <div className="flex justify-end mb-3">
                    <button
                      onClick={handleEdit}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <Edit3 className="w-4 h-4" />
                      编辑
                    </button>
                  </div>
                  <div className="prose prose-sm max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-code:text-blue-600 prose-code:bg-blue-50 prose-code:px-1 prose-code:rounded prose-pre:bg-gray-900 prose-pre:text-gray-100">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{task.notes}</ReactMarkdown>
                  </div>
                </div>
              ) : task.transcript ? (
                <div className="text-center py-8">
                  <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <Sparkles className="w-6 h-6 text-amber-500" />
                  </div>
                  <p className="text-amber-600 font-medium mb-1">AI 笔记生成失败</p>
                  <p className="text-sm text-gray-500">你可以切换到「转录原文」标签查看完整转录内容</p>
                  <button
                    onClick={handleEdit}
                    className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <Edit3 className="w-4 h-4" />
                    手动编写笔记
                  </button>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-400 mb-3">暂无学习笔记</p>
                  <button
                    onClick={handleEdit}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <Edit3 className="w-4 h-4" />
                    编写笔记
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function ResultPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-blue-600 mx-auto mb-3 animate-spin" />
          <p className="text-gray-500">加载中...</p>
        </div>
      </div>
    }>
      <ResultPageInner />
    </Suspense>
  );
}
