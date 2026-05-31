'use client';

import { useState } from 'react';
import { Video, Eye, EyeOff } from 'lucide-react';
import Head from 'next/head';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json();
      if (json.code !== 0) {
        alert(json.detail || '登录失败');
        setLoading(false);
        return;
      }
      localStorage.setItem('token', json.data.token);
      localStorage.setItem('user', JSON.stringify(json.data.user));
      window.location.href = '/dashboard';
    } catch (err: any) {
      alert('网络错误: ' + err.message);
      setLoading(false);
    }
  };

  return (
    <>
      <Head><title>登录 - FlowNote</title></Head>
      <div className="min-h-screen bg-gray-50 flex">
        <div className="hidden lg:flex lg:w-1/2 bg-blue-600 items-center justify-center p-12">
          <div className="max-w-md text-white">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Video className="w-6 h-6 text-white" />
              </div>
              <span className="font-bold text-2xl">FlowNote</span>
            </div>
            <h2 className="text-3xl font-bold mb-4">B站视频一键转<br />结构化笔记</h2>
            <p className="text-blue-100 text-lg leading-relaxed">
              粘贴视频链接，AI 自动提取字幕、生成结构化笔记<br />
              支持 Markdown 导出到 Notion / Obsidian
            </p>
            <div className="mt-10 flex items-center gap-6 text-sm text-blue-100">
              <div className="text-center">
                <div className="text-2xl font-bold">10秒</div>
                <div>平均出结果</div>
              </div>
              <div className="w-px h-10 bg-blue-400/50" />
              <div className="text-center">
                <div className="text-2xl font-bold">¥19.9</div>
                <div>基础版月费</div>
              </div>
              <div className="w-px h-10 bg-blue-400/50" />
              <div className="text-center">
                <div className="text-2xl font-bold">60分钟</div>
                <div>免费额度</div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-sm">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">欢迎回来</h1>
              <p className="text-sm text-gray-500">登录你的 FlowNote 账号</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">邮箱</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">密码</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="输入密码"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 text-gray-600 cursor-pointer">
                  <input type="checkbox" className="rounded border-gray-300" />
                  记住我
                </label>
                <a href="#" className="text-blue-600 hover:underline">忘记密码？</a>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
              >
                {loading ? '登录中...' : '登录'}
              </button>
            </form>

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-gray-50 text-gray-500">或</span>
                </div>
              </div>
              <button
                disabled
                className="w-full mt-4 py-3 border border-gray-200 rounded-xl text-sm font-medium text-gray-400 cursor-not-allowed flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178A1.17 1.17 0 0 1 4.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178 1.17 1.17 0 0 1-1.162-1.178c0-.651.52-1.18 1.162-1.18zm5.34 2.867c-1.797-.052-3.746.512-5.28 1.786-1.72 1.428-2.687 3.72-1.78 6.22.942 2.453 3.666 4.229 6.884 4.229.826 0 1.622-.12 2.361-.336a.722.722 0 0 1 .598.082l1.584.926a.272.272 0 0 0 .14.047c.134 0 .24-.111.24-.247 0-.06-.023-.12-.038-.177l-.327-1.233a.49.49 0 0 1 .177-.554C23.116 18.176 24 16.55 24 14.765c0-3.38-3.236-6.131-7.062-5.907zm-2.6 2.032c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.97-.982zm4.844 0c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.97-.982z"/>
                </svg>
                微信登录（备案后上线）
              </button>
            </div>

            <p className="text-center text-sm text-gray-500 mt-6">
              还没有账号？{' '}
              <a href="/register" className="text-blue-600 hover:underline font-medium">免费注册</a>
            </p>

            <p className="text-center text-xs text-gray-400 mt-8">
              <a href="/" className="hover:text-gray-600">← 返回首页</a>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
