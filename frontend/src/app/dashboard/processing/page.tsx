'use client';

import { useState, useEffect } from 'react';
import { Video, Check, Loader2, Clock, ArrowLeft } from 'lucide-react';

interface Step {
  id: number;
  label: string;
  description: string;
  duration: number;
}

const steps: Step[] = [
  { id: 1, label: '解析视频', description: '获取视频信息和字幕', duration: 2000 },
  { id: 2, label: '提取音频', description: '从视频中提取音频流', duration: 3000 },
  { id: 3, label: 'AI 转录', description: 'Whisper 模型识别语音', duration: 8000 },
  { id: 4, label: '生成笔记', description: 'DeepSeek 分析内容结构', duration: 5000 },
  { id: 5, label: '完成', description: '笔记已生成', duration: 1000 },
];

export default function ProcessingPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [videoTitle] = useState('Python爬虫从入门到实战');

  useEffect(() => {
    const timer = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let stepIndex = 0;
    let currentProgress = 0;
    const totalDuration = steps.reduce((sum, s) => sum + s.duration, 0);

    const interval = setInterval(() => {
      currentProgress += 100;
      setProgress(Math.min((currentProgress / totalDuration) * 100, 100));

      const accumulated = steps.slice(0, stepIndex + 1).reduce((sum, s) => sum + s.duration, 0);
      if (currentProgress >= accumulated && stepIndex < steps.length - 1) {
        stepIndex++;
        setCurrentStep(stepIndex);
      }

      if (currentProgress >= totalDuration) {
        clearInterval(interval);
        setTimeout(() => {
          window.location.href = '/dashboard/result';
        }, 800);
      }
    }, 100);

    return () => clearInterval(interval);
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const getStepStatus = (index: number) => {
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
            <a href="#" className="text-blue-600 hover:underline">升级</a>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-12">
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Video className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-1">正在处理视频</h1>
          <p className="text-sm text-gray-500">{videoTitle}</p>
        </div>

        {/* Progress bar */}
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

        {/* Steps */}
        <div className="space-y-3">
          {steps.map((step, index) => {
            const status = getStepStatus(index);
            return (
              <div
                key={step.id}
                className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${
                  status === 'active'
                    ? 'bg-blue-50 border-blue-200'
                    : status === 'completed'
                    ? 'bg-white border-green-200'
                    : 'bg-white border-gray-100 opacity-60'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    status === 'active'
                      ? 'bg-blue-600 text-white'
                      : status === 'completed'
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {status === 'completed' ? (
                    <Check className="w-4 h-4" />
                  ) : status === 'active' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <span className="text-xs">{step.id}</span>
                  )}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-sm text-gray-900">{step.label}</div>
                  <div className="text-xs text-gray-500">{step.description}</div>
                </div>
                {status === 'active' && (
                  <span className="text-xs text-blue-600 font-medium">处理中...</span>
                )}
                {status === 'completed' && (
                  <span className="text-xs text-green-600 font-medium">完成</span>
                )}
              </div>
            );
          })}
        </div>

        <p className="text-center text-xs text-gray-400 mt-8">
          处理完成后将自动跳转至结果页，请勿关闭页面
        </p>
      </main>
    </div>
  );
}
