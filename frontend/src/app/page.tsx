'use client';

import { useState, useEffect } from 'react';
import { Video, FileText, Zap, ArrowRight } from 'lucide-react';

export default function Home() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const invite = params.get('invite');
    if (invite) {
      localStorage.setItem('invite_code', invite);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    // 未登录用户跳转到登录页
    const token = localStorage.getItem('token');
    if (!token) {
      window.location.href = '/login';
      return;
    }
    // 已登录用户跳转到工作台并携带视频链接
    window.location.href = `/dashboard?url=${encodeURIComponent(url.trim())}`;
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
            <a href="/login" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
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
              注册即送 60 分钟永久免费额度，支持 B 站字幕直接解析
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
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-3">简单定价</h2>
            <p className="text-gray-500">比主流竞品便宜一半，没有积分换算，直接按分钟计费</p>
          </div>
          <div className="grid md:grid-cols-4 gap-4 max-w-5xl mx-auto">
            <div className="p-5 rounded-2xl border border-gray-100 bg-white text-center">
              <h3 className="font-semibold text-gray-900 mb-1">免费版</h3>
              <div className="text-3xl font-bold text-gray-900 mb-1">¥0</div>
              <p className="text-sm text-gray-500 mb-4">60 分钟永久额度</p>
              <a href="/login" className="block w-full py-2.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 text-sm font-medium text-center">
                免费开始
              </a>
            </div>
            <div className="p-5 rounded-2xl border border-blue-200 bg-blue-50/50 shadow-lg shadow-blue-100 text-center">
              <h3 className="font-semibold text-gray-900 mb-1">轻量月卡</h3>
              <div className="text-3xl font-bold text-gray-900 mb-1">¥15</div>
              <p className="text-sm text-gray-500 mb-4">600 分钟 / 30天</p>
              <a href="/pricing" className="block w-full py-2.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm font-medium text-center">
                立即订阅
              </a>
            </div>
            <div className="p-5 rounded-2xl border border-gray-100 bg-white text-center">
              <h3 className="font-semibold text-gray-900 mb-1">专业月卡</h3>
              <div className="text-3xl font-bold text-gray-900 mb-1">¥35</div>
              <p className="text-sm text-gray-500 mb-4">6000 分钟 / 30天</p>
              <a href="/pricing" className="block w-full py-2.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 text-sm font-medium text-center">
                立即订阅
              </a>
            </div>
            <div className="p-5 rounded-2xl border border-gray-100 bg-white text-center">
              <h3 className="font-semibold text-gray-900 mb-1">专业年卡</h3>
              <div className="text-3xl font-bold text-gray-900 mb-1">¥239</div>
              <p className="text-sm text-gray-500 mb-4">72000 分钟 / 年</p>
              <a href="/pricing" className="block w-full py-2.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 text-sm font-medium text-center">
                立即订阅
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* 用户评价 */}
      <section className="py-16 overflow-hidden">
        <div className="max-w-5xl mx-auto px-4 text-center mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-3">用户评价</h2>
          <p className="text-gray-500">来自真实用户的反馈</p>
        </div>

        {/* 滚动评价 */}
        <div className="relative">
          <div className="flex gap-6 animate-scroll hover:[animation-play-state:paused]" style={{ width: 'max-content' }}>
            {[
              {
                name: '小明',
                role: '考研党',
                content: 'B站上的考研视频太长了，用FlowNote一键转成笔记，复习效率翻倍。支持Markdown导出到Notion，整理知识库特别方便。',
                avatar: '📚',
                color: 'from-blue-400 to-blue-500',
              },
              {
                name: '阿杰',
                role: '知识区UP主',
                content: '做视频需要大量参考资料，以前看完就忘，现在用FlowNote把参考视频转成笔记，写脚本时直接搜索关键词就能找到要点。',
                avatar: '🎬',
                color: 'from-purple-400 to-purple-500',
              },
              {
                name: 'CodeMaster',
                role: '全栈开发者',
                content: '技术分享视频动辄1-2小时，用FlowNote转录后生成结构化笔记，配合原文搜索功能，找知识点特别快，省了大量时间。',
                avatar: '💻',
                color: 'from-green-400 to-green-500',
              },
              {
                name: '小雨',
                role: '大学生',
                content: '网课太多了，用FlowNote把视频转成文字笔记，期末复习的时候直接看笔记就行，再也不用反复拉进度条了。',
                avatar: '📝',
                color: 'from-pink-400 to-pink-500',
              },
              {
                name: '老周',
                role: '产品经理',
                content: '行业分析视频很多干货，以前手动记笔记太麻烦。现在用FlowNote自动整理成结构化笔记，做竞品分析效率提升很多。',
                avatar: '📊',
                color: 'from-orange-400 to-orange-500',
              },
              {
                name: 'Sarah',
                role: '留学生',
                content: '看英文教学视频时，FlowNote能帮我生成中文笔记，还能导出Markdown，整理学习资料太方便了！',
                avatar: '🌍',
                color: 'from-teal-400 to-teal-500',
              },
              {
                name: '大伟',
                role: '自媒体运营',
                content: '每天要看大量行业视频找选题，FlowNote帮我快速提取视频要点，做内容策划效率提升不止一倍。',
                avatar: '🚀',
                color: 'from-red-400 to-red-500',
              },
              {
                name: '静静',
                role: '设计师',
                content: '设计教程视频很长，用FlowNote转成笔记后，可以按步骤查找具体操作方法，不用反复看视频了。',
                avatar: '🎨',
                color: 'from-indigo-400 to-indigo-500',
              },
            ].map((user, i) => (
              <div
                key={i}
                className="w-[320px] flex-shrink-0 p-6 rounded-2xl border border-gray-100 bg-white shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-10 h-10 bg-gradient-to-br ${user.color} rounded-full flex items-center justify-center text-white text-lg`}>
                    {user.avatar}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900 text-sm">{user.name}</div>
                    <div className="text-xs text-gray-400">{user.role}</div>
                  </div>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">{user.content}</p>
              </div>
            ))}
            {/* 复制一份用于无缝滚动 */}
            {[
              {
                name: '小明',
                role: '考研党',
                content: 'B站上的考研视频太长了，用FlowNote一键转成笔记，复习效率翻倍。支持Markdown导出到Notion，整理知识库特别方便。',
                avatar: '📚',
                color: 'from-blue-400 to-blue-500',
              },
              {
                name: '阿杰',
                role: '知识区UP主',
                content: '做视频需要大量参考资料，以前看完就忘，现在用FlowNote把参考视频转成笔记，写脚本时直接搜索关键词就能找到要点。',
                avatar: '🎬',
                color: 'from-purple-400 to-purple-500',
              },
              {
                name: 'CodeMaster',
                role: '全栈开发者',
                content: '技术分享视频动辄1-2小时，用FlowNote转录后生成结构化笔记，配合原文搜索功能，找知识点特别快，省了大量时间。',
                avatar: '💻',
                color: 'from-green-400 to-green-500',
              },
              {
                name: '小雨',
                role: '大学生',
                content: '网课太多了，用FlowNote把视频转成文字笔记，期末复习的时候直接看笔记就行，再也不用反复拉进度条了。',
                avatar: '📝',
                color: 'from-pink-400 to-pink-500',
              },
              {
                name: '老周',
                role: '产品经理',
                content: '行业分析视频很多干货，以前手动记笔记太麻烦。现在用FlowNote自动整理成结构化笔记，做竞品分析效率提升很多。',
                avatar: '📊',
                color: 'from-orange-400 to-orange-500',
              },
              {
                name: 'Sarah',
                role: '留学生',
                content: '看英文教学视频时，FlowNote能帮我生成中文笔记，还能导出Markdown，整理学习资料太方便了！',
                avatar: '🌍',
                color: 'from-teal-400 to-teal-500',
              },
              {
                name: '大伟',
                role: '自媒体运营',
                content: '每天要看大量行业视频找选题，FlowNote帮我快速提取视频要点，做内容策划效率提升不止一倍。',
                avatar: '🚀',
                color: 'from-red-400 to-red-500',
              },
              {
                name: '静静',
                role: '设计师',
                content: '设计教程视频很长，用FlowNote转成笔记后，可以按步骤查找具体操作方法，不用反复看视频了。',
                avatar: '🎨',
                color: 'from-indigo-400 to-indigo-500',
              },
            ].map((user, i) => (
              <div
                key={`dup-${i}`}
                className="w-[320px] flex-shrink-0 p-6 rounded-2xl border border-gray-100 bg-white shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-10 h-10 bg-gradient-to-br ${user.color} rounded-full flex items-center justify-center text-white text-lg`}>
                    {user.avatar}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900 text-sm">{user.name}</div>
                    <div className="text-xs text-gray-400">{user.role}</div>
                  </div>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">{user.content}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 bg-gray-50/50">
        <div className="max-w-5xl mx-auto px-4 py-12">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            {/* 品牌 */}
            <div className="md:col-span-1">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <Video className="w-5 h-5 text-white" />
                </div>
                <span className="font-bold text-lg text-gray-900">FlowNote</span>
              </div>
              <p className="text-sm text-gray-500 leading-relaxed">
                B站视频一键转结构化笔记，AI 驱动的学习效率工具
              </p>
            </div>

            {/* 功能 */}
            <div>
              <h4 className="font-semibold text-gray-900 text-sm mb-4">功能</h4>
              <ul className="space-y-2.5">
                <li><a href="/dashboard" className="text-sm text-gray-500 hover:text-blue-600 transition-colors">视频转录</a></li>
                <li><a href="/dashboard" className="text-sm text-gray-500 hover:text-blue-600 transition-colors">AI 笔记生成</a></li>
                <li><a href="/dashboard" className="text-sm text-gray-500 hover:text-blue-600 transition-colors">Markdown 导出</a></li>
                <li><a href="/dashboard" className="text-sm text-gray-500 hover:text-blue-600 transition-colors">PDF 导出</a></li>
              </ul>
            </div>

            {/* 服务 */}
            <div>
              <h4 className="font-semibold text-gray-900 text-sm mb-4">服务</h4>
              <ul className="space-y-2.5">
                <li><a href="/pricing" className="text-sm text-gray-500 hover:text-blue-600 transition-colors">定价方案</a></li>
                <li><a href="/privacy" className="text-sm text-gray-500 hover:text-blue-600 transition-colors">隐私政策</a></li>
                <li><a href="/terms" className="text-sm text-gray-500 hover:text-blue-600 transition-colors">用户协议</a></li>
              </ul>
            </div>

            {/* 联系 */}
            <div>
              <h4 className="font-semibold text-gray-900 text-sm mb-4">联系我们</h4>
              <ul className="space-y-2.5">
                <li><span className="text-sm text-gray-500">微信：flownote_cn</span></li>
                <li><span className="text-sm text-gray-500">邮箱：flownote@163.com</span></li>
              </ul>
            </div>
          </div>

          {/* 备案信息 */}
          <div className="border-t border-gray-200 pt-6 flex flex-col md:flex-row items-center justify-between text-xs text-gray-400 gap-3">
            <div>© 2025 FlowNote. All rights reserved.</div>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer" className="hover:text-gray-600 transition-colors">
                青ICP备2026000930号-1
              </a>
              <a href="https://www.beian.gov.cn/portal/registerSystemInfo?recordcode=63010502000671" target="_blank" rel="noopener noreferrer" className="hover:text-gray-600 transition-colors">
                青公网安备63010502000671号
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
