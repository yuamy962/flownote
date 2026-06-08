'use client';

import { useState } from 'react';
import { Video, Eye, EyeOff } from 'lucide-react';
import Head from 'next/head';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    if (password !== confirmPassword) {
      alert('两次输入的密码不一致');
      return;
    }
    if (password.length < 8) {
      alert('密码至少 8 位');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json();
      if (json.code !== 0) {
        alert(json.detail || '注册失败');
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
      <Head><title>注册 - FlowNote</title></Head>
      <div className="min-h-screen bg-gray-50 flex">
        <div className="hidden lg:flex lg:w-1/2 bg-blue-600 items-center justify-center p-12">
          <div className="max-w-md text-white">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Video className="w-6 h-6 text-white" />
              </div>
              <span className="font-bold text-2xl">FlowNote</span>
            </div>
            <h2 className="text-3xl font-bold mb-4">开始你的<br />高效学习之旅</h2>
            <p className="text-blue-100 text-lg leading-relaxed">
              注册即送 60 分钟免费额度<br />
              体验 AI 视频笔记的强大能力
            </p>
            <div className="mt-10 space-y-3 text-sm text-blue-100">
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs">✓</div>
                每月 60 分钟免费转录额度
              </div>
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs">✓</div>
                B 站字幕秒级解析
              </div>
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs">✓</div>
                AI 自动生成结构化笔记
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-sm">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">创建账号</h1>
              <p className="text-sm text-gray-500">注册后即可免费开始使用</p>
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
                    placeholder="至少 8 位"
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">确认密码</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="再次输入密码"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  required
                />
              </div>

              <div className="flex items-start gap-2 text-sm text-gray-600">
                <input type="checkbox" className="mt-1 rounded border-gray-300" required />
                <span>
                  我已阅读并同意{' '}
                  <a href="#" className="text-blue-600 hover:underline">用户协议</a>
                  {' '}和{' '}
                  <a href="#" className="text-blue-600 hover:underline">隐私政策</a>
                </span>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
              >
                {loading ? '注册中...' : '注册'}
              </button>
            </form>

            <p className="text-center text-sm text-gray-500 mt-6">
              已有账号？{' '}
              <a href="/login" className="text-blue-600 hover:underline font-medium">直接登录</a>
            </p>

            <p className="text-center text-xs text-gray-400 mt-8">
              <a href="/" className="hover:text-gray-600">← 返回首页</a>
            </p>
            <p className="text-center text-xs text-gray-400 mt-4 flex items-center justify-center gap-3">
              <a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer" className="hover:text-gray-600">
                青ICP备2026000930号-1
              </a>
              <a href="https://www.beian.gov.cn/portal/registerSystemInfo?recordcode=63010502000671" target="_blank" rel="noopener noreferrer" className="hover:text-gray-600">
                青公网安备63010502000671号
              </a>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
