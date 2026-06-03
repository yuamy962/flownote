'use client';

import { useState, useEffect, useRef } from 'react';
import { Video, Upload, Link, Lock, Clock, Zap, AlertCircle, FileText, X } from 'lucide-react';
import { useRouter } from 'next/navigation';

function UserInfo() {
  const [user, setUser] = useState<any>(null);
  useEffect(() => {
    const raw = localStorage.getItem('user');
    if (raw) {
      try {
        setUser(JSON.parse(raw));
      } catch {
        setUser(null);
      }
    }
  }, []);
  if (!user) {
    return <a href="/login" className="text-gray-600 hover:text-gray-900">登录</a>;
  }
  return (
    <div className="flex items-center gap-3">
      <span className="text-gray-500">{user.email}</span>
      <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">{user.plan === 'free' ? '免费版' : user.plan}</span>
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

export default function Dashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'link' | 'upload'>('link');
  const [url, setUrl] = useState('');
  const [videoInfo, setVideoInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleParse = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setVideoInfo(null);
    try {
      const res = await fetch(`/api/parse-bilibili?url=${encodeURIComponent(url.trim())}`);
      const json = await res.json();
      if (json.code !== 0) {
        alert(json.message || '解析失败');
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
              <a href="/dashboard/profile" className="px-3 py-1.5 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-50">用户中心</a>
            </nav>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <UserInfo />
            <a href="/pricing" className="text-blue-600 hover:underline">升级</a>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
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
                    <div className="text-sm text-gray-500">
                      预计消耗时长：<span className="font-medium text-gray-900">{Math.ceil(videoInfo.duration / 60)} 分钟</span>
                    </div>
                    <button
                      onClick={async () => {
                        if (!url.trim()) return;
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
                      disabled={submitting}
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
                  disabled={uploading}
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
