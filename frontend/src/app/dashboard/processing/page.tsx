'use client';

import { useState, useEffect } from 'react';
import { Video, Check, Loader2, Clock, ArrowLeft, XCircle } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

interface TaskStep {
  label: string;
  description: string;
}

const steps: TaskStep[] = [
  { label: '解析视频', description: '获取视频信息和字幕' },
  { label: '音频提取', description: '从视频中提取音频流' },
  { label: 'AI 转录', description: 'Whisper 模型识别语音' },
  { label: '生成笔记', description: 'DeepSeek 分析内容结构' },
  { label: '完成', description: '笔记已生成' },
];

export default function ProcessingPage() {
  const searchParams = useSearchParams();
  const taskId = searchParams.get('id');

  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [videoTitle, setVideoTitle] = useState('处理中...');
  const [error, setError] = useState('');
  const [status, setStatus] = useState<'processing' | 'done' | 'failed'>('processing');

  // 计时器
  useEffect(() => {
    const timer = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  // 轮询任务状态
  useEffect(() => {
    if (!taskId) return;

    const token = localStorage.getItem('token');
    let pollCount = 0;

    const poll = async () => {
      try {
        const res = await fetch(`/api/tasks/${taskId}`, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        });
        const json = await res.json();
        if (json.code !== 0) return;
        const task = json.data;
        setVideoTitle(task.title || '处理中...');
        setStatus(task.status);

        if (task.status === 'done') {
          setProgress(100);
          setCurrentStep(steps.length - 1);
          setTimeout(() => {
            window.location.href = `/dashboard/result?id=${taskId}`;
          }, 1000);
          return;
        }

        if (task.status === 'failed') {
          setError(task.error_message || '处理失败');
          setProgress(0);
          return;
        }

        // 模拟进度
        pollCount++;
        const simulatedProgress = Math.min(pollCount * 15, 85);
        setProgress(simulatedProgress);
        setCurrentStep(Math.min(Math.floor((simulatedProgress / 100) * (steps.length - 1)), steps.length - 2));
      } catch (e) {
        // ignore poll errors
      }
    };

    poll();
    const interval = setInterval(poll, 3000);
    return () => clearInterval(interval);
  }, [taskId]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const getStepStatus = (index: number) => {
    if (status === 'failed') return index === currentStep ? 'failed' : index < currentStep ? 'completed' : 'pending';
    if (index < currentStep) return 'completed';
    if (index === currentStep) return 'active';
    return 'pending';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <a href="/dashboard" className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
            <ArrowLeft className="w-4 h-4" />
            返回工作台
          </a>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-gray-500">剩余 60 分钟</span>
            <a href="/pricing" className="text-blue-600 hover:underline">升级</a>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-12">
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Video className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-1">
            {status === 'failed' ? '处理失败' : '正在处理视频'}
          </h1>
          <p className="text-sm text-gray-500">{videoTitle}</p>
        </div>

        {/* Progress bar */}
        {status !== 'failed' && (
          <div className="mb-10">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-gray-600">处理进度</span>
              <span className="text-gray-900 font-medium">{Math.round(progress)}%</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex items-center gap-1 mt-2 text-xs text-gray-400">
              <Clock className="w-3 h-3" />
              已用时 {formatTime(elapsed)}
            </div>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="mb-8 p-4 bg-red-50 border border-red-100 rounded-xl">
            <div className="flex items-center gap-2 text-red-700 text-sm font-medium">
              <XCircle className="w-4 h-4" />
              {error}
            </div>
            <p className="text-xs text-red-500 mt-1">请稍后重试或联系客服</p>
          </div>
        )}

        {/* Steps */}
        <div className="space-y-3">
          {steps.map((step, index) => {
            const stepStatus = getStepStatus(index);
            return (
              <div
                key={index}
                className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${
                  stepStatus === 'active'
                    ? 'bg-blue-50 border-blue-200'
                    : stepStatus === 'completed'
                    ? 'bg-white border-green-200'
                    : stepStatus === 'failed'
                    ? 'bg-white border-red-200'
                    : 'bg-white border-gray-100 opacity-60'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    stepStatus === 'active'
                      ? 'bg-blue-600 text-white'
                      : stepStatus === 'completed'
                      ? 'bg-green-500 text-white'
                      : stepStatus === 'failed'
                      ? 'bg-red-500 text-white'
                      : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {stepStatus === 'completed' ? (
                    <Check className="w-4 h-4" />
                  ) : stepStatus === 'active' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : stepStatus === 'failed' ? (
                    <XCircle className="w-4 h-4" />
                  ) : (
                    <span className="text-xs">{index + 1}</span>
                  )}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-sm text-gray-900">{step.label}</div>
                  <div className="text-xs text-gray-500">{step.description}</div>
                </div>
                {stepStatus === 'active' && (
                  <span className="text-xs text-blue-600 font-medium">处理中...</span>
                )}
                {stepStatus === 'completed' && (
                  <span className="text-xs text-green-600 font-medium">完成</span>
                )}
                {stepStatus === 'failed' && (
                  <span className="text-xs text-red-600 font-medium">失败</span>
                )}
              </div>
            );
          })}
        </div>

        <p className="text-center text-xs text-gray-400 mt-8">
          {status === 'failed'
            ? '处理遇到问题，请返回工作台重试'
            : '处理完成后将自动跳转至结果页，请勿关闭页面'}
        </p>
      </main>
    </div>
  );
}
