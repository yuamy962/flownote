'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { Video, Upload, Link, Lock, Clock, Zap, AlertCircle, FileText, X, Gem, Calendar } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';

function UserInfo() {
  const [user, setUser] = useState<any>(null);
  useEffect(() => {
    const load = () => {
      const raw = localStorage.getItem('user');
      if (raw) {
        try {
          setUser(JSON.parse(raw));
        } catch {
          setUser(null);
        }
      }
    };
    load();
    window.addEventListener('storage', load);
    return () => window.removeEventListener('storage', load);
  }, []);
  if (!user) {
    return <a href="/login" className="text-gray-600 hover:text-gray-900">登录</a>;
  }
  return (
    <div className="flex items-center gap-3">
      <span className="text-gray-500 text-xs hidden sm:inline">{user.nickname || '微信用户'}</span>
      <span className="flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-600 text-xs rounded-full">
        <Calendar className="w-3 h-3" />
        {user.monthly_minutes || 0}
      </span>
      <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-600 text-xs rounded-full">
        <Gem className="w-3 h-3" />
        {user.permanent_minutes || 0}
      </span>
      <button
        onClick={() => {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.reload();
        }}
        className="text-gray-400 hover:text-red-600 text-xs"
      >
        退出
      </button>
    </div>
  );
}

function DashboardInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<'link' | 'upload'>('link');
  const [url, setUrl] = useState(searchParams.get('url') || '');
  const [videoInfo, setVideoInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [userBalance, setUserBalance] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refreshBalance = () => {
    const token = localStorage.getItem('token');
    fetch('/api/credits/balance', {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
    })
      .then((r) => r.json())
      .then((json) => {
        if (json.code === 0) {
          setUserBalance(json.data);
          // 同时更新 localStorage 中的 user
          const raw = localStorage.getItem('user');
          if (raw) {
            try {
              const u = JSON.parse(raw);
              u.monthly_minutes = json.data.monthly;
              u.permanent_minutes = json.data.permanent;
              localStorage.setItem('user', JSON.stringify(u));
            } catch {}
          }
        }
      });
  };

  useEffect(() => {
    refreshBalance();
    // 如果 URL 参数中有视频链接，自动解析
    const urlParam = searchParams.get('url');
    if (urlParam) {
      setUrl(urlParam);
      // 延迟一点执行解析，确保状态已更新
      setTimeout(() => {
        handleParseAuto(urlParam);
      }, 100);
    }
  }, []);

  const handleParseAuto = async (targetUrl: string) => {
    if (!targetUrl.trim()) return;
    setLoading(true);
    setVideoInfo(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/tasks/parse-bilibili?url=${encodeURIComponent(targetUrl.trim())}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      });
      const text = await res.text();
      let json: any = {};
      try {
        json = JSON.parse(text);
      } catch {
        alert('解析失败，服务器返回非 JSON: ' + text.slice(0, 200));
        setLoading(false);
        return;
      }
      if (json.code !== 0) {
        alert(json.message || json.detail || '解析失败');
        setLoading(false);
        return;
      }
      setVideoInfo(json.data);
    } catch (err: any) {
      alert('网络错误: ' + err.message);
    }
    setLoading(false);
  };

  const handleParse = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setVideoInfo(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/tasks/parse-bilibili?url=${encodeURIComponent(url.trim())}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      });
      const text = await res.text();
      let json: any = {};
      try {
        json = JSON.parse(text);
      } catch {
        alert('解析失败，服务器返回非 JSON: ' + text.slice(0, 200));
        setLoading(false);
        return;
      }
      if (json.code !== 0) {
        alert(json.message || json.detail || '解析失败');
        setLoading(false);
        return;
      }
      setVideoInfo(json.data);
    } catch (err: any) {
      alert('网络错误: ' + err.message);
    }
    setLoading(false);
  };

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}小时${m}分钟`;
  };

  const estimatedMinutes = videoInfo ? Math.ceil(videoInfo.duration / 60) : 0;
  const totalBalance = userBalance ? userBalance.total : 0;
  const isUnlimited = userBalance && userBalance.plan === 'unlimited';
  const hasEnoughBalance = isUnlimited || totalBalance >= estimatedMinutes;

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
              <a href="/dashboard" className="px-3 py-1.5 text-blue-600 bg-blue-50 rounded-lg font-medium">工作台</a>
              <a href="/dashboard/history" className="px-3 py-1.5 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-50">历史记录</a>
              <a href="/dashboard/history" className="px-3 py-1.5 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-50">笔记</a>
              <a href="/dashboard/profile" className="px-3 py-1.5 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-50">用户中心</a>
              <a
                href="/pricing"
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg font-medium hover:from-amber-600 hover:to-orange-600 transition-all shadow-sm"
              >
                <Zap className="w-3.5 h-3.5" />
                购买套餐
              </a>
            </nav>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <UserInfo />
            <a href="/pricing" className="text-blue-600 hover:underline">升级</a>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        {/* 余额提示 */}
        <div className="mb-6 flex items-center justify-between bg-white rounded-xl border border-gray-100 p-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-sm">
              <Calendar className="w-4 h-4 text-blue-600" />
              <span className="text-gray-500">订阅：</span>
              <span className="font-bold text-blue-600">{userBalance ? `${userBalance.monthly} 分钟` : '--'}</span>
            </div>
            <div className="w-px h-4 bg-gray-200" />
            <div className="flex items-center gap-1.5 text-sm">
              <Gem className="w-4 h-4 text-amber-600" />
              <span className="text-gray-500">永久：</span>
              <span className="font-bold text-amber-600">{userBalance ? `${userBalance.permanent} 分钟` : '--'}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {userBalance?.plan_expires_at && (
              <span className="text-xs text-gray-400">
                {userBalance.plan === 'free' ? '' : `${userBalance.plan} 套餐`}
                {userBalance.plan !== 'free' && userBalance.plan_expires_at ? ` · 有效期至 ${new Date(userBalance.plan_expires_at).toLocaleDateString()}` : ''}
              </span>
            )}
          </div>
        </div>

        <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('link')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'link' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Link className="w-4 h-4" />
            B站链接
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'upload' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Upload className="w-4 h-4" />
            本地上传
          </button>
        </div>

        {activeTab === 'link' && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                粘贴 B 站视频链接
              </label>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://www.bilibili.com/video/BVxxx"
                  className="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
                <button
                  onClick={handleParse}
                  disabled={loading}
                  className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
                >
                  {loading ? '解析中...' : '解析视频'}
                </button>
              </div>
            </div>

            {videoInfo && (
              <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                <div className="flex gap-4">
                  <div className="w-40 h-24 bg-gradient-to-br from-blue-100 to-blue-50 rounded-xl flex-shrink-0 flex items-center justify-center overflow-hidden">
                    {videoInfo.cover ? (
                      <img src={videoInfo.cover} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-2xl font-bold text-blue-300">{videoInfo.title?.[0] || '▶'}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 mb-1 truncate">{videoInfo.title}</h3>
                    <p className="text-sm text-gray-500 mb-2">UP主：{videoInfo.uploader}</p>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {formatDuration(videoInfo.duration)}
                      </span>
                      {videoInfo.hasSubtitle ? (
                        <span className="flex items-center gap-1 text-green-600">
                          <Zap className="w-4 h-4" />
                          有内嵌字幕，可秒出结果
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-orange-600">
                          <AlertCircle className="w-4 h-4" />
                          无字幕，需 GPU 转录（约 3-6 分钟）
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center justify-between">
                    <div className="text-sm">
                      <span className="text-gray-500">预计消耗：</span>
                      <span className="font-medium text-gray-900">{estimatedMinutes} 分钟</span>
                      {!isUnlimited && (
                        <span className="text-gray-400 ml-2">
                          (当前余额 {totalBalance} 分钟)
                        </span>
                      )}
                      {!hasEnoughBalance && (
                        <span className="text-red-500 ml-2">余额不足</span>
                      )}
                    </div>
                    <button
                      onClick={async () => {
                        if (!url.trim()) return;
                        if (!hasEnoughBalance) {
                          alert('时长不足，请前往购买套餐');
                          return;
                        }
                        setSubmitting(true);
                        try {
                          const token = localStorage.getItem('token');
                          const res = await fetch('/api/tasks', {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                              'Authorization': token ? `Bearer ${token}` : '',
                            },
                            body: JSON.stringify({ url: url.trim() }),
                          });
                          const json = await res.json();
                          if (json.code !== 0) {
                            alert(json.detail || '提交失败');
                            setSubmitting(false);
                            return;
                          }
                          const task = json.data;
                          refreshBalance(); // 刷新余额
                          if (task.status === 'done') {
                            router.push(`/dashboard/result?id=${task.id}`);
                          } else {
                            router.push(`/dashboard/processing?id=${task.id}`);
                          }
                        } catch (err: any) {
                          alert('网络错误: ' + err.message);
                        }
                        setSubmitting(false);
                      }}
                      disabled={submitting || !hasEnoughBalance}
                      className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
                    >
                      {submitting ? '提交中...' : '开始转录'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'upload' && (
          <div className="bg-white rounded-2xl border border-gray-100 p-8">
            <input
              type="file"
              ref={fileInputRef}
              accept="video/*,audio/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) setUploadFile(file);
              }}
            />
            {!uploadFile ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-200 rounded-xl p-10 text-center cursor-pointer hover:border-blue-300 hover:bg-blue-50/30 transition-all"
              >
                <Upload className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-700 mb-1">点击选择文件</p>
                <p className="text-xs text-gray-400">支持 MP4 / MOV / MP3 / WAV，最大 500MB</p>
                {userBalance && !isUnlimited && (
                  <p className="text-xs text-gray-400 mt-2">
                    当前余额 {totalBalance} 分钟，上传后按实际时长扣费
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                  <FileText className="w-8 h-8 text-blue-500" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{uploadFile.name}</p>
                    <p className="text-xs text-gray-500">{(uploadFile.size / 1024 / 1024).toFixed(1)} MB</p>
                  </div>
                  <button
                    onClick={() => {
                      setUploadFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <button
                  onClick={async () => {
                    if (!uploadFile) return;
                    if (!isUnlimited && totalBalance < 1) {
                      alert('时长不足，请前往购买套餐');
                      return;
                    }
                    // 本地上传按实际时长扣费，请确保余额充足
                    if (!isUnlimited && totalBalance < 5) {
                      if (!confirm(`当前余额仅 ${totalBalance} 分钟，本地上传将按实际时长扣费，可能余额不足。是否继续？`)) {
                        return;
                      }
                    }
                    setUploading(true);
                    try {
                      const token = localStorage.getItem('token');
                      const formData = new FormData();
                      formData.append('file', uploadFile);
                      const res = await fetch('/api/tasks/upload', {
                        method: 'POST',
                        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
                        body: formData,
                      });
                      const json = await res.json();
                      if (json.code !== 0) {
                        alert(json.detail || '上传失败');
                        setUploading(false);
                        return;
                      }
                      router.push(`/dashboard/processing?id=${json.data.id}`);
                    } catch (err: any) {
                      alert('上传错误: ' + err.message);
                    }
                    setUploading(false);
                  }}
                  disabled={uploading || (!isUnlimited && totalBalance < 1)}
                  className="w-full px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
                >
                  {uploading ? '上传中...' : '开始转录'}
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default function Dashboard() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500">加载中...</p>
        </div>
      </div>
    }>
      <DashboardInner />
    </Suspense>
  );
}
