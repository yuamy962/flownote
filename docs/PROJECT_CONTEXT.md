# FlowNote 项目上下文（供新会话加载）

> 生成时间：2026-06-06
> 用途：新会话快速加载项目全貌

---

## 一、项目概述

**FlowNote** = AI 驱动的视频笔记工具
- 粘贴 B站链接 → AI 提取字幕 → 生成结构化笔记
- 支持 B站多P视频、本地上传视频/音频
- GPU 加速 Whisper 转录 + DeepSeek 生成总结

---

## 二、系统架构

| 组件 | 地址 | 说明 |
|---|---|---|
| **Web 服务器** | 118.25.22.220（腾讯云轻量，上海） | Next.js + FastAPI + Redis + Celery |
| **GPU 服务器** | 119.45.200.37（腾讯云 HAI T4，南京） | Whisper large-v3 + FastAPI（端口8000）|
| **域名** | flownote.cn | ICP 备案已通过，HTTPS 已配置（Caddy）|
| **数据库** | SQLite | 路径 `./videonotes.db`，双机架构共用 |

### 端口分配
- Caddy: 80/443（反向代理）
- Next.js dev: 3000
- FastAPI: 8001
- Redis: 6379

---

## 三、已完成功能清单

### 后端（FastAPI + SQLAlchemy + Celery）
- ✅ 用户注册/登录/JWT Token
- ✅ B站视频解析（单P/多P，含字幕检测）
- ✅ B站音频下载（yt-dlp + B站API fallback + ffmpeg 合并）
- ✅ GPU Whisper 转录（调用 HAI 服务器）
- ✅ DeepSeek AI 总结（强制 JSON，temperature 0.3）
- ✅ Celery 异步队列（无字幕/本地上传自动触发 GPU 转录）
- ✅ 本地上传（multipart，支持 video/audio，最大500MB）
- ✅ 历史记录分页、用户中心（套餐/时长/进度条）
- ✅ 支付模块（微信支付 Native，APIv3）
  - 套餐管理（基础版/专业版/无限版）
  - 订单创建、二维码生成、回调通知
  - 支付成功后自动加时长

### 前端（Next.js 14 + TypeScript + Tailwind）
- ✅ 工作台（B站链接 + 本地上传）
- ✅ 处理中页面（轮询状态）
- ✅ 结果页（转录/总结/笔记三栏 + Markdown 渲染）
- ✅ 历史记录（真实分页，支持 pending/processing/done/failed）
- ✅ 用户中心
- ✅ 套餐购买页（/pricing）
- ✅ 支付二维码弹窗（轮询订单状态）

### 基础设施
- ✅ HTTPS + 域名（Caddy 自动 SSL）
- ✅ 自动部署脚本（start.sh / stop.sh / status.sh）

---

## 四、当前进度（重点）

### 🟢 已完成：微信支付

**状态**：支付全流程已跑通

**实现**：
- 新商户号 1113595290 + 旧服务号（已认证改名「涵讯科技」）组合
- 使用微信支付公钥替代平台证书进行回调验签
- Native 支付二维码 → 扫码支付 → 回调验签 → 解密 → 更新订单 → 增加用户时长，全链路正常

**注意**：
- 旧商户号 1612137979 因历史原因被限制收款，已废弃
- 服务号「涵讯科技」有 2022 年消息能力永久限制，但**不影响支付功能**

**当前 `.env` 配置**：
```env
WECHAT_PAY_MCHID=1113595290
WECHAT_PAY_APIV3_KEY=a1B2c3D4e5F6g7H8i9J0k1L2m3N4o5PA
WECHAT_PAY_NOTIFY_URL=https://flownote.cn/api/pay/notify
WECHAT_PAY_CERT_SERIAL=391290B39F2A14A1B431120968507F30152A8FA4
WECHAT_PAY_PRIVATE_KEY_PATH=./certs/apiclient_key.pem
WECHAT_PAY_PUBLIC_KEY_PATH=./certs/pub_key.pem
WECHAT_PAY_APPID=wx86fc88243360817f
```

### 🟡 待测试：本地上传全流程
- 代码已写完，基础设施就绪
- 等支付功能跑通后一起测试

### 🟡 开发中：微信登录
- 后端代码已写完（OAuth 扫码登录 + postMessage 传 token）
- 前端登录页已接入微信登录按钮
- **待开放平台网站应用审核通过后填入 AppSecret 即可上线**

### 🟢 已完成
- ICP 备案：已通过，备案号 `青ICP备2026000930号-1`
- 公安联网备案：已通过，备案号 `青公网安备63010502000671号`
- 备案信息已添加至首页、登录页、注册页底部

### 🟡 待观察
- 微信登录（开放平台网站应用）：已提交，等审核（appid: wx5e4a0971dd87700f）

---

## 五、关键代码文件

| 文件 | 说明 |
|---|---|
| `backend/app/models.py` | User/Task/Plan/Order/PaymentLog 模型 |
| `backend/app/routers/tasks.py` | 任务 CRUD + 本地上传 |
| `backend/app/routers/pay.py` | 支付：套餐/下单/二维码/回调/查询 |
| `backend/app/routers/auth.py` | 注册/登录/me |
| `backend/app/services/wechat_pay.py` | 微信支付 APIv3 客户端（签名/验签/解密）|
| `backend/app/tasks.py` | Celery：下载/转录/总结 |
| `backend/app/main.py` | FastAPI 入口（含自动迁移）|
| `backend/init_plans.py` | 初始化 3 个套餐 |
| `frontend/src/app/pricing/page.tsx` | 套餐购买页 |
| `frontend/src/components/PayModal.tsx` | 支付二维码弹窗 |
| `frontend/src/app/dashboard/page.tsx` | 工作台 |
| `setup-caddy.sh` | Caddy + HTTPS 一键配置 |
| `start.sh / stop.sh / status.sh` | 服务管理脚本 |

---

## 六、部署命令速查

```bash
# 重启全部服务
bash ~/video-notes/start.sh

# 停止全部服务
bash ~/video-notes/stop.sh

# 查看状态
bash ~/video-notes/status.sh

# 单独重启后端
cd ~/video-notes/backend
fuser -k 8001/tcp 2>/dev/null
find . -name '__pycache__' -exec rm -rf {} + 2>/dev/null
nohup uvicorn app.main:app --host 0.0.0.0 --port 8001 > logs/backend.log 2>&1 &

# 单独重启前端
cd ~/video-notes/frontend
pkill -f 'next-server' 2>/dev/null
pkill -f 'npm run dev' 2>/dev/null
sleep 2
nohup npm run dev > logs/frontend.log 2>&1 &

# 重启 Celery
cd ~/video-notes/backend
pkill -f 'celery -A celery_worker worker' 2>/dev/null
nohup celery -A celery_worker worker --loglevel=info > logs/celery.log 2>&1 &
```

---

## 七、待办清单

- [ ] 服务号「外卖便宜社」微信认证（300元，阻塞支付功能）
- [ ] 认证通过后测试支付全流程
- [ ] 本地上传功能端到端测试
- [ ] 公安联网备案审核通过后，网站底部加备案号
- [ ] 微信开放平台网站应用审核通过后，接入微信登录
- [ ] 上线后考虑迁移 PostgreSQL（SQLite 并发问题）

---

## 八、重要配置值

| 配置项 | 值 |
|---|---|
| DeepSeek API Key | `sk-16adcccfeb154c72b26a26f34d963e0e` |
| GPU Whisper URL | `http://119.45.200.37:8000` |
| 商户号 | `1612137979`（绑定服务号，认证后可用）|
| 商户简称 | 涵讯科技 |
| 回调 URL | `https://flownote.cn/api/pay/notify` |
| APIv3 密钥 | `a1B2c3D4e5F6g7H8i9J0k1L2m3N4o5PA` |
| 服务号 AppID | `wx86fc88243360817f`（待认证改名「涵讯科技」）|
| 备用商户号 | `1113595290`（已申请通过，暂不启用）|

---

## 九、环境信息

- **操作系统**：Ubuntu（腾讯云轻量服务器）
- **Python**：3.x（虚拟环境 venv）
- **Node.js**：20.x
- **Python 依赖**：FastAPI, SQLAlchemy, Celery, httpx, cryptography, passlib, python-jose
- **前端依赖**：Next.js 14, TypeScript, Tailwind CSS, Lucide React

---

## 十、常见问题速查

| 问题 | 解决 |
|---|---|
| 前端样式丢失 | `rm -rf .next && pkill -f 'next-server' && npm run dev` |
| Celery 代码不生效 | `find . -name '__pycache__' -exec rm -rf {} +` |
| 数据库锁表 | `rm videonotes.db`（开发阶段，会丢失数据）|
| Next.js 3000 端口被占 | `pkill -f 'next-server'` |
| Caddy 证书问题 | `sudo systemctl restart caddy` |

---

## 十一、如何继续开发

**当前最优先**：完成服务号认证 → 测试支付 → 测试本地上传

**下一步可选**：
1. 接入微信登录（等开放平台审核通过）
2. 优化 AI 总结 Prompt
3. 增加更多视频源（YouTube/抖音等）
4. 用户邀请返利系统
5. 迁移 PostgreSQL
