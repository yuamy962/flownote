'use client';

import { useState, useEffect } from 'react';
import { Video } from 'lucide-react';
import Head from 'next/head';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);

  // 读取 URL 中的邀请码
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const invite = params.get('invite');
    if (invite) {
      localStorage.setItem('invite_code', invite);
    }
  }, []);

  // 监听微信登录回调的 postMessage
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.data?.type === 'WECHAT_LOGIN_SUCCESS') {
        const { token, user } = event.data;
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        localStorage.removeItem('invite_code');
        window.location.href = '/dashboard';
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  const handleWechatLogin = async () => {
    setLoading(true);
    try {
      const inviteCode = localStorage.getItem('invite_code') || '';
      const res = await fetch(`/api/auth/wechat/login?invite_code=${encodeURIComponent(inviteCode)}`);
      const json = await res.json();
      if (json.code !== 0) {
        alert(json.detail || '获取微信登录链接失败');
        setLoading(false);
        return;
      }
      const url = json.data.url;
      const width = 600;
      const height = 600;
      const left = (window.screen.width - width) / 2;
      const top = (window.screen.height - height) / 2;
      window.open(
        url,
        'wechat_login',
        `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=no,resizable=no`
      );
    } catch (err: any) {
      alert('网络错误: ' + err.message);
    } finally {
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
                <div className="text-2xl font-bold">¥15</div>
                <div>轻量月卡</div>
              </div>
              <div className="w-px h-10 bg-blue-400/50" />
              <div className="text-center">
                <div className="text-2xl font-bold">60分钟</div>
                <div>永久免费额度</div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-sm">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">欢迎回来</h1>
              <p className="text-sm text-gray-500">使用微信扫码登录，安全便捷</p>
            </div>

            <button
              onClick={handleWechatLogin}
              disabled={loading}
              className="w-full py-3 border border-green-200 rounded-xl text-sm font-medium text-green-700 hover:bg-green-50 flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178A1.17 1.17 0 0 1 4.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178 1.17 1.17 0 0 1-1.162-1.178c0-.651.52-1.18 1.162-1.18zm5.34 2.867c-1.797-.052-3.746.512-5.28 1.786-1.72 1.428-2.687 3.72-1.78 6.22.942 2.453 3.666 4.229 6.884 4.229.826 0 1.622-.12 2.361-.336a.722.722 0 0 1 .598.082l1.584.926a.272.272 0 0 0 .14.047c.134 0 .24-.111.24-.247 0-.06-.023-.12-.038-.177l-.327-1.233a.49.49 0 0 1 .177-.554C23.116 18.176 24 16.55 24 14.765c0-3.38-3.236-6.131-7.062-5.907zm-2.6 2.032c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.97-.982zm4.844 0c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.97-.982z"/>
              </svg>
              {loading ? '加载中...' : '微信登录'}
            </button>

            <p className="text-center text-xs text-gray-400 mt-8">
              <a href="/" className="hover:text-gray-600">← 返回首页</a>
            </p>
            
          </div>
        </div>
      </div>
    </>
  );
}
