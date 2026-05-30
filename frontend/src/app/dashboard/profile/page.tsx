'use client';

import { useState } from 'react';
import { Video, LogOut, Mail, Crown, Clock, Users, ChevronRight, Gift } from 'lucide-react';

export default function ProfilePage() {
  const [usedMinutes] = useState(42);
  const totalMinutes = 60;
  const usagePercent = (usedMinutes / totalMinutes) * 100;

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
              <a href="/dashboard/history" className="px-3 py-1.5 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-50">历史记录</a>
              <a href="/dashboard/profile" className="px-3 py-1.5 text-blue-600 bg-blue-50 rounded-lg font-medium">用户中心</a>
            </nav>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-gray-500">剩余 {totalMinutes - usedMinutes} 分钟</span>
            <a href="/pricing" className="text-blue-600 hover:underline">升级</a>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* User info card */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold">
              U
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-gray-900">user@example.com</h2>
              <div className="flex items-center gap-3 mt-1">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
                  <Crown className="w-3 h-3" />
                  免费版
                </span>
                <span className="text-sm text-gray-500">注册于 2025-05-30</span>
              </div>
            </div>
          </div>
        </div>

        {/* Usage stats */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <h3 className="text-sm font-medium text-gray-900 mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-600" />
            本月用量
          </h3>
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-gray-500">已用 {usedMinutes} 分钟</span>
            <span className="text-gray-900 font-medium">{totalMinutes} 分钟</span>
          </div>
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 rounded-full transition-all"
              style={{ width: `${usagePercent}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-2">每月 1 日自动重置额度</p>
        </div>

        {/* Invite friends */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
            <Gift className="w-4 h-4 text-orange-500" />
            邀请好友
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            每邀请 1 位好友注册并完成首次转录，双方各得 <span className="text-blue-600 font-medium">+30 分钟</span> 免费额度
          </p>
          <div className="flex gap-3">
            <input
              type="text"
              readOnly
              value="https://flownote.cn?ref=USER001"
              className="flex-1 px-4 py-2.5 bg-gray-50 rounded-xl text-sm text-gray-600 border border-gray-200"
            />
            <button
              onClick={() => {
                navigator.clipboard.writeText('https://flownote.cn?ref=USER001');
                alert('邀请链接已复制');
              }}
              className="px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700"
            >
              复制链接
            </button>
          </div>
        </div>

        {/* Quick actions */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <a href="/pricing" className="flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors border-b border-gray-50">
            <Crown className="w-5 h-5 text-blue-600" />
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-900">升级套餐</div>
              <div className="text-xs text-gray-500">解锁更多转录时长和高级功能</div>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </a>
          <div className="flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors border-b border-gray-50 cursor-pointer">
            <Mail className="w-5 h-5 text-gray-500" />
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-900">修改密码</div>
              <div className="text-xs text-gray-500">定期更换密码保障账号安全</div>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </div>
          <a href="/" className="flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors text-red-600">
            <LogOut className="w-5 h-5" />
            <div className="flex-1">
              <div className="text-sm font-medium">退出登录</div>
            </div>
          </a>
        </div>
      </main>
    </div>
  );
}
