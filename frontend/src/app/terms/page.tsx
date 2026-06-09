'use client';

import Head from 'next/head';

export default function TermsPage() {
  return (
    <>
      <Head><title>用户协议 - FlowNote</title></Head>
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-3xl mx-auto px-6 bg-white rounded-2xl shadow-sm py-10">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">用户协议</h1>
          <p className="text-sm text-gray-500 mb-6">更新日期：2026年6月8日</p>

          <div className="space-y-6 text-gray-700 leading-relaxed text-sm">
            <section>
              <h2 className="font-semibold text-gray-900 mb-2">1. 服务说明</h2>
              <p>FlowNote 是一款 AI 驱动的视频笔记工具，提供视频字幕提取、语音转录、内容总结等服务。用户通过购买套餐获得相应的转录时长。</p>
            </section>

            <section>
              <h2 className="font-semibold text-gray-900 mb-2">2. 账户注册</h2>
              <p>用户可以通过邮箱或微信授权注册账户。您应当提供真实、准确、完整的注册信息，并对账户安全负责。</p>
            </section>

            <section>
              <h2 className="font-semibold text-gray-900 mb-2">3. 服务使用规则</h2>
              <p>用户承诺不将服务用于任何违法违规目的，不上传、解析涉及国家秘密、他人隐私、侵犯知识产权或含有违法违规内容的视频。</p>
            </section>

            <section>
              <h2 className="font-semibold text-gray-900 mb-2">4. 付费与退款</h2>
              <p>用户购买的套餐时长为一次性消耗品，支付成功后立即到账。除因我方技术原因导致服务无法使用外，已购买的时长不支持退款。</p>
            </section>

            <section>
              <h2 className="font-semibold text-gray-900 mb-2">5. 知识产权</h2>
              <p>FlowNote 平台的代码、界面设计、商标等知识产权归我们所有。用户使用服务生成的内容版权归用户所有。</p>
            </section>

            <section>
              <h2 className="font-semibold text-gray-900 mb-2">6. 免责声明</h2>
              <p>AI 生成的内容仅供参考，不构成专业建议。我们不对因网络、第三方服务或不可抗力导致的服务中断承担责任。</p>
            </section>

            <section>
              <h2 className="font-semibold text-gray-900 mb-2">7. 协议变更</h2>
              <p>我们有权根据业务发展需要修改本协议。修改后的协议将在网站公示，继续使用服务视为接受修改。</p>
            </section>

            <section>
              <h2 className="font-semibold text-gray-900 mb-2">8. 联系我们</h2>
              <p>如有任何问题，请通过服务号「涵讯科技」留言，或发送邮件至 youki2013@163.com。</p>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}
