'use client';

import { useEffect } from 'react';

export default function RegisterPage() {
  useEffect(() => {
    // 注册页面已废弃，所有用户通过微信登录
    // 保留邀请码参数透传
    const params = new URLSearchParams(window.location.search);
    const invite = params.get('invite');
    if (invite) {
      localStorage.setItem('invite_code', invite);
    }
    window.location.href = '/login' + window.location.search;
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-gray-500">正在跳转...</p>
    </div>
  );
}
