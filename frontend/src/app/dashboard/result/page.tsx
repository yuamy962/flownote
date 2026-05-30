'use client';

import { useState } from 'react';
import { Video, FileText, Sparkles, BookOpen, Download, Copy, Check, ArrowLeft, Share2 } from 'lucide-react';

const mockTranscript = [
  { time: '00:00', text: '大家好，欢迎来到 Python 爬虫实战课程。今天我们会从零开始学习网络爬虫的基础知识。' },
  { time: '02:15', text: '首先，我们需要了解 HTTP 协议的基本原理。浏览器和服务器之间就是通过 HTTP 进行通信的。' },
  { time: '05:30', text: 'Python 中最常用的爬虫库是 requests。让我们看一下如何发送一个 GET 请求。' },
  { time: '08:45', text: 'requests.get(url) 会返回一个 Response 对象，我们可以通过 response.text 获取网页 HTML 内容。' },
  { time: '12:00', text: '获取到 HTML 之后，我们需要解析它。BeautifulSoup 是一个非常好用的解析库。' },
  { time: '15:20', text: 'from bs4 import BeautifulSoup，然后传入 HTML 内容和解析器类型。' },
  { time: '18:40', text: 'CSS 选择器是定位网页元素最常用的方式。比如 soup.select("div.title") 会选中所有 class 为 title 的 div。' },
  { time: '22:10', text: '实际项目中，很多网站会设置反爬机制。常见的有 User-Agent 检测、IP 封禁、验证码等。' },
  { time: '25:30', text: '设置合理的请求头可以绕过大部分基础反爬。headers = {"User-Agent": "Mozilla/5.0..."}' },
  { time: '28:50', text: '这节课的内容就到这里。下节课我们会学习 Scrapy 框架的使用。记得完成作业哦！' },
];

const mockSummary = {
  overview: '本视频是一节 Python 爬虫入门课程，系统讲解了 HTTP 协议基础、requests 库使用、HTML 解析和反爬策略。',
  points: [
    'HTTP 协议是浏览器与服务器通信的基础',
    'requests 库是 Python 爬虫的核心工具',
    'BeautifulSoup 配合 CSS 选择器可高效解析 HTML',
    '合理设置请求头可绕过基础反爬机制',
  ],
  audience: '零基础想学习 Python 爬虫的学生和开发者',
  suggestion: '建议边看边动手实践，跟着视频写一遍代码',
};

const mockNotes = `# Python 爬虫入门学习笔记

## 一、HTTP 协议基础

HTTP（HyperText Transfer Protocol）是浏览器与服务器之间通信的规则。

- **请求方法**：GET（获取资源）、POST（提交数据）
- **状态码**：200 成功、404 未找到、500 服务器错误
- **请求头**：User-Agent、Referer、Cookie 等

## 二、requests 库使用

\`\`\`python
import requests

# 发送 GET 请求
response = requests.get('https://example.com')
print(response.status_code)  # 200
print(response.text)         # HTML 内容
\`\`\`

## 三、HTML 解析 — BeautifulSoup

\`\`\`python
from bs4 import BeautifulSoup

soup = BeautifulSoup(html, 'html.parser')

# CSS 选择器
titles = soup.select('div.title')
for t in titles:
    print(t.get_text())
\`\`\`

## 四、反爬应对策略

| 反爬手段 | 应对方案 |
|---------|---------|
| User-Agent 检测 | 设置合理的请求头 |
| IP 封禁 | 使用代理池 |
| 验证码 | OCR 识别或打码平台 |
| 动态加载 | 分析接口或使用 Selenium |

## 五、课后作业

1. 用 requests 获取某个网页的标题
2. 用 BeautifulSoup 提取文章正文
3. 尝试设置不同的 User-Agent
`;

export default function ResultPage() {
  const [activeTab, setActiveTab] = useState<'transcript' | 'summary' | 'notes'>('transcript');
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    let content = '';
    if (activeTab === 'transcript') {
      content = mockTranscript.map((t) => `[${t.time}] ${t.text}`).join('\n');
    } else if (activeTab === 'summary') {
      content = `${mockSummary.overview}\n\n核心要点：\n${mockSummary.points.map((p) => `- ${p}`).join('\n')}\n\n适合人群：${mockSummary.audience}\n\n学习建议：${mockSummary.suggestion}`;
    } else {
      content = mockNotes;
    }
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExport = () => {
    const blob = new Blob([mockNotes], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Python爬虫学习笔记.md';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <a href="/dashboard" className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
            <ArrowLeft className="w-4 h-4" />
            返回工作台
          </a>
          <div className="flex items-center gap-3">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
              {copied ? '已复制' : '复制'}
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors"
            >
              <Download className="w-4 h-4" />
              导出 Markdown
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Video info */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <Video className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="font-semibold text-gray-900 truncate">Python爬虫从入门到实战</h1>
              <div className="flex items-center gap-4 text-sm text-gray-500 mt-0.5">
                <span>UP主：技术小哥</span>
                <span>时长：1小时0分钟</span>
                <span className="text-green-600 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" />
                  处理完成
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('transcript')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'transcript' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <FileText className="w-4 h-4" />
            转录原文
          </button>
          <button
            onClick={() => setActiveTab('summary')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'summary' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            AI 总结
          </button>
          <button
            onClick={() => setActiveTab('notes')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'notes' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            学习笔记
          </button>
        </div>

        {/* Content */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {activeTab === 'transcript' && (
            <div className="divide-y divide-gray-50">
              {mockTranscript.map((item, index) => (
                <div key={index} className="flex gap-4 p-4 hover:bg-gray-50/50 transition-colors">
                  <span className="text-sm font-mono text-blue-600 flex-shrink-0 w-12">{item.time}</span>
                  <p className="text-sm text-gray-700 leading-relaxed">{item.text}</p>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'summary' && (
            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-2 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  视频摘要
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed">{mockSummary.overview}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-3">核心要点</h3>
                <ul className="space-y-2">
                  {mockSummary.points.map((point, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                      <span className="w-5 h-5 rounded-full bg-blue-50 text-blue-600 text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="grid sm:grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                <div>
                  <h4 className="text-xs font-medium text-gray-500 mb-1">适合人群</h4>
                  <p className="text-sm text-gray-700">{mockSummary.audience}</p>
                </div>
                <div>
                  <h4 className="text-xs font-medium text-gray-500 mb-1">学习建议</h4>
                  <p className="text-sm text-gray-700">{mockSummary.suggestion}</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notes' && (
            <div className="p-6">
              <div className="prose prose-sm max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-code:text-blue-600 prose-code:bg-blue-50 prose-code:px-1 prose-code:rounded prose-pre:bg-gray-900 prose-pre:text-gray-100">
                <div dangerouslySetInnerHTML={{ __html: renderMarkdown(mockNotes) }} />
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function renderMarkdown(md: string): string {
  let html = md
    .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mb-4">$1</h1>')
    .replace(/^## (.*$)/gim, '<h2 class="text-lg font-semibold mt-6 mb-3">$1</h2>')
    .replace(/^### (.*$)/gim, '<h3 class="text-base font-medium mt-4 mb-2">$1</h3>')
    .replace(/\`\`\`(\w+)?\n([\s\S]*?)\`\`\`/g, '<pre class="rounded-lg p-4 overflow-x-auto my-4"><code>$2</code></pre>')
    .replace(/\`([^`]+)\`/g, '<code class="px-1 py-0.5 rounded text-sm">$1</code>')
    .replace(/^(\|.+\|)$/gim, (match) => {
      const cells = match.split('|').filter(Boolean).map((c) => c.trim());
      return `<tr>${cells.map((c) => `<td class="border px-3 py-2 text-sm">${c}</td>`).join('')}</tr>`;
    })
    .replace(/^- (.*$)/gim, '<li class="ml-4 text-sm text-gray-700 mb-1">$1</li>')
    .replace(/^(?!<[h|l|t|p|u])(.*$)/gim, '<p class="text-sm text-gray-700 mb-2 leading-relaxed">$1</p>');

  // Wrap table rows in table tag
  html = html.replace(/(<tr>.*<\/tr>\n?)+/g, '<table class="w-full border-collapse my-4">$&</table>');
  // Wrap list items in ul tag
  html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul class="space-y-1 my-3">$&</ul>');

  return html;
}
