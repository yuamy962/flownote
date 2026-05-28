# 视频笔记工具 — 产品需求文档 & 技术栈说明

> 版本：v1.0  
> 目标用户：在校大学生、考研/考证学习者  
> 核心定位：低价、好用的视频转文字 + AI 笔记工具，对标飞书妙记但价格降低 70%

---

## 一、产品概述

### 1.1 解决的问题

学生观看 B 站课程、网课录播时，需要手动记笔记，效率低且容易遗漏。市面上同类工具（飞书妙记、通义听悟）价格偏高（¥28~30/月），学生难以承受。

### 1.2 核心价值

- 自动提取视频文案，省去手动转录
- AI 生成结构化笔记，便于复习
- Markdown 导出，兼容 Notion / Obsidian
- 定价低至 ¥9.9/月，学生可负担

### 1.3 目标用户画像

- 在校大学生，使用 B 站学习专业课、考研、考证
- 有课程录播存放在网盘中
- 习惯使用 Notion / Obsidian 做笔记
- 对价格敏感，月消费预算 ¥10~20

---

## 二、功能需求

### 2.1 输入方式

| 输入方式 | 优先级 | 说明 |
|----------|--------|------|
| B 站视频链接 | P0 | 粘贴 URL，自动解析字幕或提取音频 |
| 本地文件上传 | P0 | 支持 MP4、MOV、MP3、WAV |
| 百度网盘 | P1 | OAuth 授权后选取文件 |
| 阿里网盘 | P1 | OAuth 授权后选取文件 |
| 其他链接（YouTube 等） | P2 | 二期扩展 |

### 2.2 核心功能

#### 2.2.1 语音转文字（转录）

- 自动检测 B 站内嵌字幕，有则直接解析（零成本）
- 无字幕时调用 ASR 接口转录
- 转录结果带时间戳，点击可跳转视频对应位置
- 支持普通话、粤语（依赖 ASR 服务能力）

#### 2.2.2 AI 总结

- 提取视频核心观点（3~5 条）
- 按章节自动分段摘要
- 关键词高亮标注

#### 2.2.3 自动生成笔记

- 输出结构化笔记（标题 / 要点 / 示例 / 补充）
- 笔记格式适合学生复习
- 支持在线编辑

#### 2.2.4 Markdown 导出

- 一键导出 `.md` 文件
- 格式兼容 Notion、Obsidian、Typora
- 支持复制全文到剪贴板

#### 2.2.5 视频问答（P1）

- 基于转录内容进行问答
- 回答引用原文时间戳
- 作为付费专属功能

#### 2.2.6 闪卡生成（P2）

- 自动生成 Anki 格式复习卡片
- 支持 `.apkg` 导出

### 2.3 用户系统

- 邮箱注册 + 密码登录
- 微信一键登录（OAuth 2.0）
- JWT Token 鉴权，有效期 7 天
- 历史记录（保留最近 30 条）

### 2.4 订阅与支付

#### 定价方案

| 套餐 | 价格 | 视频数量 | 单视频时长上限 | 功能 |
|------|------|----------|----------------|------|
| 免费版 | ¥0 | 每月 3 个 | 30 分钟 | 转录 + 基础总结 |
| 学生版 | ¥9.9/月 或 ¥88/年 | 每月 30 个 | 2 小时 | 全功能 + 视频问答 |
| 无限版 | ¥19.9/月 或 ¥168/年 | 无限 | 4 小时 | 全功能 + 优先队列 |

#### 支付方式

- 微信支付（JSAPI 支付）
- 支付宝（PC 网页支付）
- 手续费：0.6%（微信支付标准类目费率）

#### 学生优惠

- edu 邮箱验证享 8 折
- 邀请好友解锁额外次数（每邀请 1 人 +3 次）

---

## 三、非功能需求

### 3.1 性能

- 视频提交后，1 分钟内给出处理进度反馈
- 30 分钟 B 站视频（有字幕）：处理完成时间 ≤ 2 分钟
- 30 分钟视频（无字幕，走 ASR）：处理完成时间 ≤ 5 分钟
- 页面首屏加载时间 ≤ 2 秒

### 3.2 可用性

- 服务可用性目标：99.5%（每月允许宕机 ≤ 3.6 小时）
- 处理失败时，自动重试 2 次，并通知用户

### 3.3 安全

- 用户数据加密存储
- 视频音频文件处理完成后立即删除，不长期存储
- HTTPS 全站加密
- API 接口限流（防滥用）

### 3.4 合规

- ICP 备案（企业主体）
- 公安联网备案
- 隐私政策 + 用户协议
- 仅支持个人学习用途，不提供视频内容再分发

---

## 四、技术栈说明

### 4.1 整体架构

```
用户浏览器
    │
    ▼
Nginx（反向代理 + HTTPS）
    │
    ├── 静态资源 → Next.js 前端（SSR）
    │
    └── /api/* → FastAPI 后端
                    │
                    ├── Redis（任务队列 + 缓存）
                    ├── PostgreSQL（用户数据 + 历史记录）
                    ├── Celery Worker（异步任务处理）
                    │       ├── B站字幕解析
                    │       ├── 腾讯云 ASR
                    │       └── DeepSeek LLM
                    └── 腾讯云 COS（临时文件存储）
```

### 4.2 前端

| 技术 | 版本 | 用途 |
|------|------|------|
| Next.js | 14+ | 前端框架，支持 SSR，SEO 友好 |
| TypeScript | 5+ | 类型安全 |
| Tailwind CSS | 3+ | 样式框架 |
| SWR | 2+ | 数据请求与缓存 |
| marked.js | 最新 | Markdown 渲染 |
| WebSocket | 原生 | 处理进度实时推送 |

**选型理由：** Next.js SSR 对 SEO 有利，有助于通过搜索引擎获取学生用户；Tailwind 开发效率高。

### 4.3 后端

| 技术 | 版本 | 用途 |
|------|------|------|
| Python | 3.11+ | 主要开发语言 |
| FastAPI | 0.110+ | Web 框架，自动生成 API 文档 |
| Celery | 5+ | 异步任务队列（视频处理） |
| Redis | 7+ | 消息队列 + 接口缓存 |
| PostgreSQL | 15+ | 主数据库 |
| SQLAlchemy | 2+ | ORM |
| Alembic | 最新 | 数据库迁移 |
| JWT（PyJWT） | 最新 | 用户鉴权 |
| Pydantic | 2+ | 数据校验 |

**选型理由：** Python 生态对 AI / 音视频处理支持最好，FastAPI 性能接近 Node.js，Celery 成熟稳定，适合异步处理长任务。

### 4.4 语音转录

| 方案 | 使用场景 | 成本 |
|------|----------|------|
| B 站内嵌字幕解析 | B 站视频有字幕（约 70%） | 免费 |
| 腾讯云 ASR（录音文件识别） | 无字幕视频、本地上传 | 约 ¥3.1/小时（后付费） |
| Faster-Whisper（二期） | 用户量大后自托管 | GPU 服务器固定成本 |

**B 站字幕解析流程：**
1. 请求 B 站 API 获取视频 CID
2. 检测是否存在 CC 字幕（`/x/player/v2` 接口）
3. 有字幕则下载 JSON 格式字幕，解析为带时间戳文本
4. 无字幕则用 yt-dlp 提取音频，提交腾讯云 ASR

### 4.5 AI 处理

| 技术 | 用途 | 成本估算 |
|------|------|----------|
| DeepSeek API（主力） | AI 总结、笔记生成 | 约 ¥0.002/千字 |
| Claude API（备用） | 复杂笔记场景 | 按需切换 |

**Prompt 策略：**
- 总结 Prompt：提取核心观点 + 章节摘要，控制输出长度
- 笔记 Prompt：要求输出标准 Markdown 格式，包含标题层级、要点、示例
- 问答 Prompt：RAG 模式，将转录文本作为 Context 传入

### 4.6 数据存储

| 技术 | 用途 |
|------|------|
| PostgreSQL | 用户信息、订阅状态、历史记录、笔记内容 |
| Redis | Celery 消息队列、接口限流计数、Session 缓存 |
| 腾讯云 COS | 音频文件临时存储（处理完成后 24 小时内删除） |

### 4.7 第三方服务

| 服务 | 用途 | 文档地址 |
|------|------|----------|
| 腾讯云 ASR | 语音转文字 | cloud.tencent.com/product/asr |
| DeepSeek API | AI 总结与笔记 | platform.deepseek.com |
| 微信开放平台 | 微信登录 OAuth | open.weixin.qq.com |
| 微信支付 | 在线收款 | pay.weixin.qq.com |
| 支付宝开放平台 | 在线收款 | open.alipay.com |
| 腾讯云 COS | 对象存储 | cloud.tencent.com/product/cos |
| yt-dlp | 视频音频提取 | github.com/yt-dlp/yt-dlp |

### 4.8 基础设施

| 技术 | 用途 |
|------|------|
| 腾讯云轻量应用服务器 | 主服务器（MVP 阶段 2核4G） |
| Nginx | 反向代理、HTTPS、静态资源 |
| PM2 | Node 进程管理（前端） |
| Supervisor | Python 进程管理（后端 + Celery） |
| GitHub | 代码托管 |
| 腾讯云云监控 | 服务器监控与告警 |

### 4.9 开发工具

| 工具 | 用途 |
|------|------|
| VS Code | 主要 IDE |
| Docker（本地） | 本地开发环境一致性 |
| Postman | API 调试 |
| pgAdmin | 数据库管理 |

---

## 五、数据库核心表设计

### users（用户表）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| email | VARCHAR | 邮箱，唯一 |
| password_hash | VARCHAR | 密码哈希 |
| wechat_openid | VARCHAR | 微信 OpenID |
| plan | ENUM | free / student / unlimited |
| plan_expires_at | TIMESTAMP | 套餐到期时间 |
| monthly_usage | INTEGER | 本月已用次数 |
| usage_reset_at | TIMESTAMP | 次数重置时间 |
| created_at | TIMESTAMP | 注册时间 |

### tasks（处理任务表）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| user_id | UUID | 关联用户 |
| source_type | ENUM | bilibili / upload / baidu / aliyun |
| source_url | VARCHAR | 原始链接 |
| title | VARCHAR | 视频标题 |
| duration | INTEGER | 视频时长（秒） |
| status | ENUM | pending / processing / done / failed |
| transcript | TEXT | 转录全文（带时间戳 JSON） |
| summary | TEXT | AI 总结 |
| notes | TEXT | 结构化笔记（Markdown） |
| asr_cost | DECIMAL | 本次 ASR 费用（用于成本统计） |
| created_at | TIMESTAMP | 创建时间 |
| completed_at | TIMESTAMP | 完成时间 |

### subscriptions（订阅记录表）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| user_id | UUID | 关联用户 |
| plan | ENUM | student / unlimited |
| period | ENUM | monthly / yearly |
| amount | DECIMAL | 实付金额 |
| payment_method | ENUM | wechat / alipay |
| payment_id | VARCHAR | 支付单号 |
| starts_at | TIMESTAMP | 生效时间 |
| expires_at | TIMESTAMP | 到期时间 |

---

## 六、API 核心接口

### 用户认证

```
POST /api/auth/register        # 邮箱注册
POST /api/auth/login           # 邮箱登录
GET  /api/auth/wechat          # 微信登录跳转
GET  /api/auth/wechat/callback # 微信登录回调
POST /api/auth/refresh         # 刷新 Token
```

### 任务处理

```
POST /api/tasks                # 提交视频（链接或上传）
GET  /api/tasks                # 获取历史列表
GET  /api/tasks/:id            # 获取任务详情
GET  /api/tasks/:id/status     # 查询处理状态（轮询）
DELETE /api/tasks/:id          # 删除记录
```

### 内容导出

```
GET  /api/tasks/:id/export/md  # 导出 Markdown
GET  /api/tasks/:id/export/txt # 导出纯文本
```

### 订阅支付

```
GET  /api/plans                # 获取套餐列表
POST /api/subscriptions        # 创建订单
POST /api/subscriptions/wechat/notify   # 微信支付回调
POST /api/subscriptions/alipay/notify   # 支付宝回调
GET  /api/subscriptions/current         # 当前订阅状态
```

---

## 七、MVP 范围界定

### 必须有（上线才能跑通）

- B 站链接输入 + 字幕解析
- ASR 转录（腾讯云）
- AI 总结 + 笔记生成
- Markdown 导出
- 邮箱注册登录
- 免费次数限制
- 微信支付（备案通过后）
- 订阅套餐管理

### 上线后再做

- 微信登录
- 本地文件上传
- 百度网盘 / 阿里网盘
- 视频问答
- 闪卡生成
- 学生邮箱验证折扣

---

## 八、风险与应对

| 风险 | 影响 | 应对方案 |
|------|------|----------|
| B 站反爬，字幕接口失效 | 高 | 引导用户提供 SESSDATA（自己的 Cookie），平台不直接爬取 |
| ASR 成本超出预期 | 中 | 免费层严格限制 30 分钟，超时拒绝处理 |
| 备案审核被驳回 | 中 | 提前准备好所有材料，驳回后按意见修改立即重提 |
| LLM 接口不稳定 | 低 | DeepSeek 主力 + Claude 备用，代码层做降级处理 |
| 版权纠纷 | 中 | 用户协议明确仅限个人学习，不存储视频原文件，处理完即删 |
