'use client';

import { useState } from 'react';
import { Check, X, Zap, Video } from 'lucide-react';
import Head from 'next/head';

const plans = [
  {
    name: '免费版',
    price: '0',
    period: '月',
    desc: '每月 60 分钟',
    highlight: false,
    features: [
      { text: 'B 站视频链接转录', included: true },
      { text: 'AI 基础总结', included: true },
      { text: 'Markdown 导出', included: true },
      { text: '单视频 30 分钟上限', included: true },
      { text: '本地上传', included: false },
      { text: '视频问答', included: false },
      { text: '优先队列', included: false },
    ],
    cta: '免费开始',
    ctaStyle: 'secondary',
  },
  {
    name: '基础版',
    price: '19.9',
    period: '月',
    desc: '每月 600 分钟（10小时）',
    highlight: true,
    badge: '最受欢迎',
    features: [
      { text: 'B 站视频链接转录', included: true },
      { text: 'AI 基础总结', included: true },
      { text: 'Markdown 导出', included: true },
      { text: '单视频 2 小时上限', included: true },
      { text: '本地上传', included: true },
      { text: '视频问答', included: false },
      { text: '优先队列', included: false },
    ],
    cta: '立即订阅',
    ctaStyle: 'primary',
  },
  {
    name: '标准版',
    price: '39',
    period: '月',
    desc: '每月 2,000 分钟（~33小时）',
    highlight: false,
    features: [
      { text: 'B 站视频链接转录', included: true },
      { text: 'AI 基础总结', included: true },
      { text: 'Markdown 导出', included: true },
      { text: '单视频 4 小时上限', included: true },
      { text: '本地上传', included: true },
      { text: '视频问答', included: true },
      { text: '优先队列', included: false },
    ],
    cta: '立即订阅',
    ctaStyle: 'secondary',
  },
  {
    name: '高级版',
    price: '59',
    period: '月',
    desc: '每月 6,000 分钟（100小时）',
    highlight: false,
    features: [
      { text: 'B 站视频链接转录', included: true },
      { text: 'AI 基础总结', included: true },
      { text: 'Markdown 导出', included: true },
      { text: '单视频 4 小时上限', included: true },
      { text: '本地上传', included: true },
      { text: '视频问答', included: true },
      { text: '优先队列', included: true },
    ],
    cta: '立即订阅',
    ctaStyle: 'secondary',
  },
];

const yearlyPrices: Record<string, string> = {
  '0': '0',
  '19.9': '99',
  '39': '199',
  '59': '299',
};

export default function PricingPage() {
  const [yearly, setYearly] = useState(false);

  return (
    <>
      <Head>
        <title>定价 - FlowNote</title>
        <meta name="description" content="FlowNote 视频笔记工具定价方案" />
      </Head>
      <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Video className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg">FlowNote</span>
          </a>
          <nav className="flex items-center gap-6 text-sm text-gray-600">
            <a href="/" className="hover:text-blue-600">首页</a>
            <a href="/login" className="hover:text-blue-600">登录</a>
            <a href="/register" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
              免费开始
            </a>
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-3">简单定价，学生友好</h1>
          <p className="text-gray-500 max-w-xl mx-auto">
            按转录时长计费，不用焦虑视频个数。比同类工具便宜 34%~50%。
          </p>

          <div className="inline-flex items-center gap-3 mt-8 p-1 bg-gray-100 rounded-xl">
            <button
              onClick={() => setYearly(false)}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
                !yearly ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              月付
            </button>
            <button
              onClick={() => setYearly(true)}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                yearly ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              年付
              <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-xs rounded-md font-medium">
                省 55%
              </span>
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan) => {
            const displayPrice = yearly ? yearlyPrices[plan.price] : plan.price;
            const displayPeriod = yearly ? '年' : plan.period;

            return (
              <div
                key={plan.name}
                className={`relative rounded-2xl border p-6 flex flex-col ${
                  plan.highlight
                    ? 'border-blue-200 bg-blue-50/50 shadow-lg shadow-blue-100'
                    : 'border-gray-100 bg-white'
                }`}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded-full">
                      {plan.badge}
                    </span>
                  </div>
                )}

                <h3 className="font-semibold text-gray-900 mb-1">{plan.name}</h3>
                <p className="text-sm text-gray-500 mb-4">{plan.desc}</p>

                <div className="mb-6">
                  <span className="text-3xl font-bold text-gray-900">¥{displayPrice}</span>
                  <span className="text-gray-500 text-sm">/{displayPeriod}</span>
                  {yearly && plan.price !== '0' && (
                    <div className="text-xs text-gray-400 mt-1">
                      原价 ¥{parseFloat(plan.price) * 12}/年
                    </div>
                  )}
                </div>

                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((f) => (
                    <li key={f.text} className="flex items-start gap-2.5 text-sm">
                      {f.included ? (
                        <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                      ) : (
                        <X className="w-4 h-4 text-gray-300 flex-shrink-0 mt-0.5" />
                      )}
                      <span className={f.included ? 'text-gray-700' : 'text-gray-400'}>
                        {f.text}
                      </span>
                    </li>
                  ))}
                </ul>

                <a
                  href={`/register?plan=${plan.name === '免费版' ? 'free' : plan.name === '基础版' ? 'basic' : plan.name === '标准版' ? 'pro' : 'unlimited'}`}
                  className={`block w-full py-2.5 rounded-xl text-sm font-medium text-center transition-colors ${
                    plan.ctaStyle === 'primary'
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'border border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {plan.cta}
                </a>
              </div>
            );
          })}
        </div>

        {/* Comparison */}
        <div className="mt-16 bg-white rounded-2xl border border-gray-100 p-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-6 text-center">与竞品对比</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-3 px-4 font-medium text-gray-500">功能 / 产品</th>
                  <th className="text-center py-3 px-4 font-medium text-blue-600">FlowNote</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-500">AI好记</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-500">飞书妙记</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { feature: '600 分钟/月', flownote: '¥19.9', competitor1: '¥39', competitor2: '¥28' },
                  { feature: '2,000 分钟/月', flownote: '¥39', competitor1: '—', competitor2: '—' },
                  { feature: '6,000 分钟/月', flownote: '¥59', competitor1: '¥89', competitor2: '—' },
                  { feature: 'B 站字幕解析', flownote: '✓', competitor1: '✓', competitor2: '✗' },
                  { feature: 'AI 笔记生成', flownote: '✓', competitor1: '✓', competitor2: '✓' },
                  { feature: 'Markdown 导出', flownote: '✓', competitor1: '✓', competitor2: '✓' },
                ].map((row, i) => (
                  <tr key={i} className="border-b border-gray-50 last:border-0">
                    <td className="py-3 px-4 text-gray-700">{row.feature}</td>
                    <td className="py-3 px-4 text-center font-medium text-blue-600">{row.flownote}</td>
                    <td className="py-3 px-4 text-center text-gray-500">{row.competitor1}</td>
                    <td className="py-3 px-4 text-center text-gray-500">{row.competitor2}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-16 max-w-2xl mx-auto">
          <h2 className="text-lg font-semibold text-gray-900 mb-6 text-center">常见问题</h2>
          <div className="space-y-4">
            {[
              {
                q: '免费额度用完后还能用吗？',
                a: '免费版每月有 60 分钟额度，用完后需要升级到付费套餐才能继续使用。额度每月 1 日自动重置。',
              },
              {
                q: '可以退款吗？',
                a: '订阅后 7 天内未使用任何付费时长，可申请全额退款。因系统原因导致转录失败，自动退还本次消耗的时长。',
              },
              {
                q: '年付和月付有什么区别？',
                a: '年付相当于月付的 4.5 折，一次支付全年费用，更划算。随时可以降级或取消续费。',
              },
              {
                q: '视频处理失败怎么办？',
                a: '转录任务因系统原因失败时，会自动重试 1 次。仍失败则退还本次消耗的时长配额，并通知你原因。',
              },
            ].map((item) => (
              <div key={item.q} className="bg-white rounded-xl border border-gray-100 p-5">
                <h3 className="font-medium text-gray-900 mb-2">{item.q}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      <footer className="border-t border-gray-100 py-8 mt-16">
        <div className="max-w-5xl mx-auto px-4 flex items-center justify-between text-sm text-gray-500">
          <div>© 2025 FlowNote. All rights reserved.</div>
          <div className="flex gap-4">
            <a href="#" className="hover:text-gray-700">隐私政策</a>
            <a href="#" className="hover:text-gray-700">用户协议</a>
          </div>
        </div>
      </footer>
    </div>
    </>
  );
}
