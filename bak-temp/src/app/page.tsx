'use client';

import { useState } from 'react';
import { Video, FileText, Zap, ArrowRight } from 'lucide-react';

export default function Home() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    setLoading(true);
    setTimeout(() => setLoading(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <header className="border-b border-gray-100 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Video className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg text-gray-900">FlowNote</span>
          </div>
          <nav className="flex items-center gap-6 text-sm text-gray-600">
            <a href="#features" className="hover:text-blue-600">功能</a>
            <a href="/pricing" className="hover:text-blue-600">定价</a>
            <a href="/login" className="hover:text-blue-600">登录</a>
            <a href="/register" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
              免费开始
            </a>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <main>
        <section className="max-w-5xl mx-auto px-4 pt-20 pb-16 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-sm mb-6">
            <Zap className="w-4 h-4" />
            <span>AI 驱动的视频笔记工具</span>
          </div>
          
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
            B站视频一键转<br />
            <span className="text-blue-600">结构化笔记</span>
          </h1>
          
          <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-10">
            粘贴视频链接，AI 自动提取字幕、生成结构化笔记，支持 Markdown 导出到 Notion / Obsidian
          </p>

          {/* Input Box */}
          <div className="max-w-2xl mx-auto mb-12">
            <form onSubmit={handleSubmit} className="relative flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="粘贴 B 站视频链接，如 https://www.bilibili.com/video/BVxxx"
                className="flex-1 px-5 py-4 rounded-xl border border-gray-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
              <button
                type="submit"
                disabled={loading}
                className="px-8 py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 text-sm font-medium shadow-lg shadow-blue-200"
              >
                {loading ? '处理中...' : (
                  <>开始转录 <ArrowRight className="w-4 h-4" /></>
                )}
              </button>
            </form>
            <p className="text-xs text-gray-400 mt-3">
              免费版每月 60 分钟，支持 B 站字幕直接解析
            </p>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="max-w-5xl mx-auto px-4 py-16">
          <h2 className="text-2xl font-bold text-center text-gray-900 mb-12">三步生成视频笔记</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl border border-gray-100 bg-white shadow-sm">
              <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mb-4">
                <Video className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">粘贴视频链接</h3>
              <p className="text-sm text-gray-600">支持 B 站视频链接，自动解析视频信息和字幕</p>
            </div>
            <div className="p-6 rounded-2xl border border-gray-100 bg-white shadow-sm">
              <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">AI 智能处理</h3>
              <p className="text-sm text-gray-600">GPU 加速转录，AI 生成结构化笔记和知识要点</p>
            </div>
            <div className="p-6 rounded-2xl border border-gray-100 bg-white shadow-sm">
              <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mb-4">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Markdown 导出</h3>
              <p className="text-sm text-gray-600">一键导出 .md，兼容 Notion / Obsidian / Typora</p>
            </div>
          </div>
        </section>

        {/* Pricing Preview */}
        <section id="pricing" className="max-w-5xl mx-auto px-4 py-16">
          <h2 className="text-2xl font-bold text-center text-gray-900 mb-12">简单定价</h2>
          <div className="grid md:grid-cols-3 gap-6 max-w-3xl mx-auto">
            <div className="p-6 rounded-2xl border border-gray-100 bg-white text-center">
              <h3 className="font-semibold text-gray-900 mb-1">免费版</h3>
              <div className="text-3xl font-bold text-gray-900 mb-1">¥0</div>
              <p className="text-sm text-gray-500 mb-4">每月 60 分钟</p>
              <a href="/register" className="block w-full py-2.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 text-sm font-medium text-center">
                免费开始
              </a>
            </div>
            <div className="p-6 rounded-2xl border border-blue-200 bg-blue-50/50 shadow-lg shadow-blue-100 text-center">
              <h3 className="font-semibold text-gray-900 mb-1">基础版</h3>
              <div className="text-3xl font-bold text-gray-900 mb-1">¥15</div>
              <p className="text-sm text-gray-500 mb-4">每月 5 小时</p>
              <a href="/register" className="block w-full py-2.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm font-medium text-center">
                立即订阅
              </a>
            </div>
            <div className="p-6 rounded-2xl border border-gray-100 bg-white text-center">
              <h3 className="font-semibold text-gray-900 mb-1">专业版</h3>
              <div className="text-3xl font-bold text-gray-900 mb-1">¥29</div>
              <p className="text-sm text-gray-500 mb-4">每月 20 小时</p>
              <a href="/register" className="block w-full py-2.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 text-sm font-medium text-center">
                立即订阅
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8 mt-16">
        <div className="max-w-5xl mx-auto px-4 flex items-center justify-between text-sm text-gray-500">
          <div>© 2025 FlowNote. All rights reserved.</div>
          <div className="flex gap-4">
            <a href="#" className="hover:text-gray-700">隐私政策</a>
            <a href="#" className="hover:text-gray-700">用户协议</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
