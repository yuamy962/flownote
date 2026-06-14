# FlowNote 项目上下文

> 每次新开会话时，请先阅读本文档以快速恢复项目记忆
> 最后更新：2026-06-14

---

## 零：重要整个会话保持以下两点记忆，全会话窗口有效
1. 每次问答完告诉我这个是当前会话第几轮
2. 如果有代码的变更，直接生成scp的代码拷贝的命令
3. 如果在第8轮的时候，直接整理当前会话内容上下文，放到此文档中，然后提醒打开新的窗口进行任务继续

---

## 一、项目概述

**FlowNote** = AI 驱动的视频笔记工具
- 粘贴 B站链接 → AI 提取字幕 → 生成结构化笔记
- 支持 B站多P视频、本地上传视频/音频
- GPU 加速 Whisper 转录 + DeepSeek 生成总结
- 仅支持微信扫码登录（已移除邮箱/密码登录）

---

## 二、系统架构

| 组件 | 地址 | 说明 |
|---|---|---|
| **Web 服务器** | 118.25.22.220（腾讯云轻量，上海，2核4G） | Next.js + FastAPI + Redis + Celery + PostgreSQL |
| **GPU 服务器** | 119.45.200.37（腾讯云 HAI T4，南京） | Whisper large-v3 + FastAPI（端口8000） |
| **域名** | flownote.cn | ICP 备案已通过，HTTPS 已配置（Caddy） |
| **数据库** | PostgreSQL 16 | 用户 flownote / 数据库 flownote / 密码 FN_QH_bss_0971 |

### 端口分配
- Caddy: 80/443（反向代理）
- Next.js dev: 3000
- FastAPI: 8001
- Redis: 6379
- PostgreSQL: 5432

---

## 三、技术栈

### 后端（/backend）
- **框架**: FastAPI 0.111.0 + Uvicorn 0.29.0
- **ORM**: SQLAlchemy 2.0.30（declarative_base）
- **数据库驱动**: psycopg2-binary 2.9.9
- **异步任务**: Celery 5.4.0 + Redis 5.0.4
- **认证**: python-jose (JWT) + 微信 OAuth
- **AI**: DeepSeek API（摘要/笔记生成）
- **视频**: yt-dlp（B站字幕提取）
- **配置**: pydantic-settings + .env

### 前端（/frontend）
- **框架**: Next.js (App Router)
- **样式**: Tailwind CSS
- **认证**: 微信扫码登录

---

## 四、数据库模型（PostgreSQL）

7 张表，所有 DateTime 字段使用 `DateTime(timezone=True)`，默认值用 `utc_now()`：

| 表名 | 说明 | 关键字段 |
|---|---|---|
| users | 用户 | id, openid, nickname, plan, monthly_minutes, permanent_minutes, auto_renew |
| tasks | 转录任务 | id, user_id, source_type, status, processing_path, cost_type |
| plans | 套餐 | id(basic/pro/pro_year等), name, price_cent, duration_minutes |
| orders | 订单 | id, out_trade_no, amount_cent, is_subscription |
| payment_logs | 支付日志 | order_id, channel, channel_trade_no |
| credit_transactions | 分钟变动 | user_id, type, amount, balance_type, balance_after |
| invite_rewards | 邀请奖励 | inviter_id, invitee_id, status |

**重要字段说明**：
- `users.plan`: 当前套餐ID（free/basic/pro/basic_year/pro_year）
- `users.monthly_minutes`: 订阅时长（按月扣减）
- `users.permanent_minutes`: 永久时长（注册送/邀请得）
- `users.plan_expires_at`: 套餐过期时间（续费叠加逻辑关键字段）
- `tasks.monthly_deducted`: 任务扣费时记录的订阅分钟数（用于精确返还）
- `tasks.permanent_deducted`: 任务扣费时记录的永久分钟数（用于精确返还）

---

## 五、后端路由

| 路由模块 | 前缀 | 说明 |
|---|---|---|
| auth | /api/auth | 微信登录（/wechat-url, /wechat-callback） |
| tasks | /api/tasks | 视频转录任务 CRUD |
| pay | /api/pay | 微信支付（Native + H5） |
| credits | /api/credits | 分钟余额查询 |
| invite | /api/invite | 邀请码与奖励 |
| pan | /api/pan | 百度网盘（暂未启用） |

---

## 六、后端服务模块

| 模块 | 说明 |
|---|---|
| services/auth.py | JWT token 生成/验证（无密码逻辑） |
| services/wechat_auth.py | 微信 OAuth 登录 |
| services/whisper.py | 调用 HAI GPU 转录 |
| services/deepseek.py | DeepSeek AI 摘要/笔记 |
| services/bilibili.py | B站视频信息/字幕提取 |
| services/wechat_pay.py | 微信支付下单/回调 |
| services/credits.py | 分钟额度管理（扣费/返还/查询） |
| services/invite.py | 邀请码与奖励逻辑 |
| services/pan_baidu.py | 百度网盘接入 |
| services/video_utils.py | 公共视频时长获取工具（ffprobe） |

---

## 七、前端页面

| 路径 | 说明 |
|---|---|
| / | 首页（Landing） |
| /login | 微信扫码登录 |
| /register | 注册（微信回调） |
| /dashboard | 主面板（用户信息 + 新建任务） |
| /dashboard/processing | 任务处理中（含预估时间倒计时） |
| /dashboard/result | 任务结果（笔记/摘要） |
| /dashboard/history | 历史记录 |
| /dashboard/profile | 个人资料 |
| /pricing | 定价页（月付/年付切换） |
| /terms | 服务条款 |
| /privacy | 隐私政策 |

---

## 八、服务器运维

### SSH 连接
```
ssh ubuntu@118.25.22.220
密码: CLOUD_QH_bss_0971
```

### 项目目录
- 远程: /home/ubuntu/video-notes
- 后端: /home/ubuntu/video-notes/backend
- 前端: /home/ubuntu/video-notes/frontend
- 日志: /home/ubuntu/video-notes/logs/

### 服务管理
```bash
bash ~/video-notes/start.sh    # 启动所有服务
bash ~/video-notes/stop.sh     # 停止所有服务
bash ~/video-notes/status.sh   # 查看服务状态
```

### PostgreSQL
```bash
sudo -u postgres psql -d flownote              # postgres 用户连接
PGPASSWORD=FN_QH_bss_0971 psql -U flownote -d flownote -h localhost  # flownote 用户连接
```

### PostgreSQL 配置（已优化 for 2核4G）
- shared_buffers = 256MB
- effective_cache_size = 1536MB
- max_connections = 50
- maintenance_work_mem = 64MB
- timezone = Asia/Shanghai

---

## 九、微信支付配置

- 商户号: 1113595290（新，正常使用）
- 旧商户号 1612137979 已废弃（收款被限制）
- 服务号 AppID: wx86fc88243360817f
- 证书目录: ./certs/

---

## 十、本地开发代理

- Clash 代理端口: 7897
- Git 代理配置:
  ```
  git config --global http.proxy http://127.0.0.1:7897
  git config --global https.proxy http://127.0.0.1:7897
  ```
- GitHub 仓库: https://github.com/yuamy962/flownote.git（HTTPS 方式）

---

## 十一、已完成的重要变更

### 1. 登录系统（2026-06-13）
- 移除邮箱/密码登录，仅保留微信扫码登录

### 2. 数据库迁移（2026-06-13）
- SQLite → PostgreSQL 16
- SQLite 全量数据已迁移至 PG（users:3, tasks:35, orders:10, plans:5 等）
- 依赖变更: 移除 passlib[bcrypt]，新增 psycopg2-binary==2.9.9

### 3. 扣费逻辑重构（2026-06-14）
- **问题**: 本地上传预扣 1 分钟导致少扣；B站无字幕视频预扣时长和实际不符导致多扣
- **修复**: 所有 GPU 转录任务（上传 + B站无字幕）统一在转录完成后按实际时长一次性扣费
- **余额预检**: 上传接口用 ffprobe 获取视频时长后立即检查余额；B站无字幕视频解析后检查余额，不足直接提示，不占用 GPU 资源
- **新增文件**: `backend/app/services/video_utils.py`

### 4. 订单状态优化（2026-06-14）
- **问题**: 未支付订单显示为 `pending`（英文），用户体验差
- **修复**: 前端增加状态映射（待支付/已支付/已取消/已过期）；后端 Celery 定时任务每小时清理超过 24 小时的 pending 订单为 expired

### 5. 转录任务预估时间显示（2026-06-14）
- **文件**: `frontend/src/app/dashboard/processing/page.tsx`
- **新增**: 预估总时间和剩余时间显示，进度条改为倒计时风格
- **核心函数**:
  ```typescript
  function estimateTotalSeconds(duration: number, processingPath: string): number {
    if (processingPath === 'subtitle') return 15;
    const minutes = Math.ceil(duration / 60);
    const estimatedMinutes = Math.max(1, Math.ceil(minutes * 0.4));
    return estimatedMinutes * 60;
  }
  ```

### 6. 转录失败时长返还（2026-06-14）
- **问题**: 字幕直出AI失败、Celery任务异常等场景下未返还已扣时长
- **修复**:
  - `backend/app/routers/tasks.py`: AI失败时调用 `refund_task_minutes` 返还
  - `backend/app/tasks.py`: Celery异常时检查已扣费并返还
  - `backend/app/models.py`: Task模型新增 `monthly_deducted` 和 `permanent_deducted` 字段
- **核心逻辑**: 基于 `monthly_deducted` 和 `permanent_deducted` 精确返还到对应账户

### 7. 续费叠加逻辑（2026-06-14）
- **文件**: `backend/app/routers/pay.py`
- **问题**: 每次购买覆盖有效期和分钟数，导致用户损失剩余时长
- **修复**:
  - **同档位续费**: 有效期从旧过期时间续加，分钟数累加
  - **升级/降级**: 旧套餐剩余订阅分钟转为永久分钟（不丢失）
  - **新购/过期续费**: 从现在开始算
- **核心代码**:
  ```python
  is_renewal = old_plan == plan.id and user.plan_expires_at and user.plan_expires_at > now
  if is_renewal:
      user.plan_expires_at = user.plan_expires_at + timedelta(days=validity_days)
      add_monthly_minutes(db, user.id, minutes, ...)
  else:
      if old_monthly > 0 and old_plan != "free":
          add_permanent_minutes(db, user.id, old_monthly, ...)
      set_subscription_minutes(db, user.id, minutes, ...)
  ```

### 8. 定价页面月付/年付显示修复（2026-06-14）
- **文件**: `frontend/src/app/pricing/page.tsx`
- **问题**: 年付卡片显示 `¥69/月`、`¥239/月`，但价格是年价
- **修复**:
  - 年付价格标签改为 `/年`
  - 新增月均提示：`约 ¥5.75/月，年付更划算`

### 9. Dashboard 购买套餐按钮（2026-06-14）
- **文件**: `frontend/src/app/dashboard/page.tsx`
- **修改**: 在余额提示区域右侧新增"购买套餐"按钮，始终显示，点击直达 `/pricing`
- **样式**: 蓝色渐变背景，带闪电图标，加粗文字

---

## 十二、待确认/待修复问题

1. **套餐显示异常**: 已购买套餐但显示"免费版"
   - **可能原因**: 前端 `profile/page.tsx` 用 `plans[user.plan]` 查找套餐名称，若数据库 `plan` 字段值不匹配映射表 key 则 fallback 到 `free`；或 `plan_expires_at` 已过期
   - **建议**: 检查数据库中用户的 `plan` 和 `plan_expires_at` 字段值

2. **Dashboard 购买按钮未显示**: 代码已添加但用户反馈未看到
   - **可能原因**: 浏览器缓存、部署未生效、或样式被覆盖
   - **当前状态**: 已加大按钮尺寸和颜色对比度，待用户确认

---

## 十三、docs 目录文档索引

| 文档 | 用途 |
|---|---|
| 产品需求文档-v3-HAI双机最终版.md | 需求定稿 |
| 定价方案-v2.md | 当前定价方案 |
| 支付接入测试文档.md | 微信支付接入参考 |
| 运维部署手册.md | 日常运维速查 |
| PostgreSQL部署指南.md | PG 部署/备份/恢复 |

---

## 十四、关键文件速查

| 文件 | 说明 |
|---|---|
| `backend/app/routers/pay.py` | 支付下单、续费叠加逻辑 |
| `backend/app/routers/tasks.py` | 任务创建、字幕直出、AI生成、失败返还 |
| `backend/app/tasks.py` | Celery GPU转录任务、异常返还 |
| `backend/app/services/credits.py` | 双轨时长管理（扣费/返还/查询） |
| `backend/app/models.py` | 数据库模型（含 monthly_deducted/permanent_deducted） |
| `frontend/src/app/pricing/page.tsx` | 定价页面（月付/年付切换） |
| `frontend/src/app/dashboard/page.tsx` | 工作台（余额显示、购买按钮） |
| `frontend/src/app/dashboard/processing/page.tsx` | 处理中页面（预估时间倒计时） |
