'use client';

import Head from 'next/head';

export default function PrivacyPage() {
  return (
    <>
      <Head><title>隐私政策 - FlowNote</title></Head>
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-3xl mx-auto px-6 bg-white rounded-2xl shadow-sm py-10">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">隐私政策</h1>
          <p className="text-sm text-gray-500 mb-6">更新日期：2026年6月8日</p>

          <div className="space-y-6 text-gray-700 leading-relaxed text-sm">
            <section>
              <h2 className="font-semibold text-gray-900 mb-2">1. 引言</h2>
              <p>FlowNote（以下简称&quot;我们&quot;）尊重并保护所有用户的个人隐私权。本隐私政策将说明我们如何收集、使用、存储和保护您的个人信息。</p>
            </section>

            <section>
              <h2 className="font-semibold text-gray-900 mb-2">2. 我们收集的信息</h2>
              <p>我们可能收集以下类型的信息：</p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>账户信息：邮箱地址、微信 openid、昵称、头像</li>
                <li>使用数据：您提交的视频链接、转录记录、使用时长</li>
                <li>支付信息：通过微信支付完成的订单信息（我们不直接保存银行卡信息）</li>
                <li>设备信息：IP 地址、浏览器类型、访问时间</li>
              </ul>
            </section>

            <section>
              <h2 className="font-semibold text-gray-900 mb-2">3. 信息的使用</h2>
              <p>我们使用您的信息用于：提供视频转录和笔记生成服务、处理支付、改进产品体验、保障账户安全、与您沟通服务相关事宜。</p>
            </section>

            <section>
              <h2 className="font-semibold text-gray-900 mb-2">4. 信息的保护</h2>
              <p>我们采取合理的技术和管理措施保护您的个人信息，防止未经授权的访问、泄露、篡改或丢失。</p>
            </section>

            <section>
              <h2 className="font-semibold text-gray-900 mb-2">5. 信息共享</h2>
              <p>我们不会向第三方出售您的个人信息。仅在以下情况下可能共享：获得您的明确同意、法律法规要求、为提供服务所必需的合作伙伴（如微信支付）。</p>
            </section>

            <section>
              <h2 className="font-semibold text-gray-900 mb-2">6. 您的权利</h2>
              <p>您有权访问、更正、删除您的个人信息，或注销账户。如需行使上述权利，请通过下方联系方式与我们联系。</p>
            </section>

            <section>
              <h2 className="font-semibold text-gray-900 mb-2">7. 联系我们</h2>
              <p>如您对本隐私政策有任何疑问，请通过服务号「涵讯科技」留言，或发送邮件至 youki2013@163.com。</p>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}
