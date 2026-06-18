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

## 十二、已完成变更（续）

### 10. 导航栏购买套餐入口（2026-06-14）
- **文件**: `frontend/src/app/dashboard/page.tsx`, `history/page.tsx`, `profile/page.tsx`
- **修改**: 所有页面导航栏统一增加"购买套餐"按钮（渐变橙色+闪电图标），移除余额卡片中的重复购买按钮

### 11. 年卡有效期修复（2026-06-14）
- **问题**: `plans` 表中 `basic_year` 和 `pro_year` 的 `validity_days` 被错误设置为30天
- **修复**: 数据库执行 `UPDATE plans SET validity_days = 365 WHERE id IN ('basic_year', 'pro_year')`，并修复受影响用户的 `plan_expires_at`

### 12. 旧套餐转永久时长增加过期检查（2026-06-14）
- **文件**: `backend/app/routers/pay.py`
- **修改**: 升级/降级时，仅当旧套餐未过期且剩余分钟>0时才转永久，已过期的不转
- **核心代码**:
  ```python
  old_plan_expired = not (user.plan_expires_at and user.plan_expires_at > now)
  if old_monthly > 0 and old_plan != "free" and not old_plan_expired:
      add_permanent_minutes(...)
  ```

### 13. 支付弹窗状态重置修复（2026-06-14）
- **文件**: `frontend/src/components/PayModal.tsx`
- **问题**: 购买套餐付款完成后，再次点击购买但未付款时直接显示"付款成功"
- **修复**: 增加 `useEffect` 在 `order?.order_id` 变化时重置 `status` 和 `pollCount`

### 14. 数据库连接池优化（2026-06-14）
- **文件**: `backend/app/database.py`
- **问题**: 同一账号多窗口同时转录时 SQLAlchemy QueuePool 连接池溢出
- **修复**: 增加 `pool_size=10, max_overflow=20, pool_timeout=30, pool_recycle=1800`

### 15. Celery 任务数据库连接优化（2026-06-14）
- **文件**: `backend/app/tasks.py`
- **问题**: Celery 任务在整个执行过程中持有数据库连接（包括下载、GPU转录等长时间操作），导致连接池耗尽
- **修复**: 重构为短连接模式，长时间操作不持有数据库连接
- **新增函数**: `_update_task_status(task_id, **kwargs)` 短连接更新任务状态，`_get_task_field(task_id, field)` 短连接获取字段值
- **关键**: 不返回游离 Task 对象，扣费阶段重新查询

### 16. B站标题重复修复（2026-06-14）
- **文件**: `backend/app/services/bilibili.py`
- **问题**: B站 API 返回的 `title` 已包含分P标题，代码又拼接了一次导致重复
- **修复**: 增加 `part_title not in title` 判断

### 17. Whisper GPU 参数优化（2026-06-14）
- **文件**: GPU 服务器 `~/whisper-api/main.py`
- **修改**: `beam_size` 从 5 降到 1，新增 `best_of=1, temperature=0, condition_on_previous_text=False`
- **效果**: 8分钟视频转录时间从 2分55秒 降到 1分26秒

### 18. 转录预估时间系数调整（2026-06-14）
- **文件**: `frontend/src/app/dashboard/processing/page.tsx`
- **修改**: 预估系数从 `0.4` 调整为 `0.2`（匹配 GPU 优化后的实际速度）

---

## 十三、已完成：AI 笔记优化任务清单（2026-06-14）

### 优先级1：Markdown 渲染器升级 ✅
- **文件**: `frontend/src/app/dashboard/result/page.tsx`, `frontend/tailwind.config.ts`
- **修改**: 安装 `react-markdown` + `remark-gfm` + `@tailwindcss/typography`，替换手写的 `renderMarkdown` 函数为 `<ReactMarkdown remarkPlugins={[remarkGfm]}>`，删除底部 `renderMarkdown` 函数，tailwind 配置添加 typography 插件

### 优先级2：历史记录快速查看优化 ✅
- **文件**: `frontend/src/app/dashboard/history/page.tsx`, `backend/app/routers/tasks.py`
- **修改**: 已完成的任务标题改为可点击链接（增大点击区域），后端 `list_tasks` 接口新增 `summary` 字段（overview 前50字），历史记录列表显示笔记摘要预览

### 优先级3：AI 生成失败时保留转录结果 ✅
- **文件**: `backend/app/tasks.py`, `backend/app/routers/tasks.py`, `frontend/src/app/dashboard/result/page.tsx`
- **修改**: Celery 任务中 DeepSeek 失败时任务状态仍为 `done`，保留 transcript，notes/summary 为空，error_message 记录失败原因；字幕直出路径同样保留转录结果不标记 failed；前端结果页 notes/summary 为空但 transcript 有内容时显示"AI 笔记生成失败"提示，并提供"手动编写笔记"入口

### 优先级4：DeepSeek 参数优化 ✅
- **文件**: `backend/app/services/deepseek.py`
- **修改**: `max_tokens` 从 4000 提升到 6000；转录文本截断策略优化为首尾各取 6000 字符，中间插入 `[...中间部分已省略...]`

### 优先级5：笔记编辑功能 ✅
- **文件**: `frontend/src/app/dashboard/result/page.tsx`, `backend/app/routers/tasks.py`
- **修改**: 学习笔记 tab 增加"编辑"按钮，点击后变为 textarea 可编辑，支持保存/取消；后端新增 `PUT /api/tasks/{task_id}/notes` 接口；AI 生成失败和暂无笔记时也可手动编写

### 优先级6：转录原文搜索/跳转功能 ✅
- **文件**: `frontend/src/app/dashboard/result/page.tsx`
- **修改**: 转录原文 tab 顶部增加搜索框，支持关键词高亮（黄色标记），当前匹配项加深高亮，上/下导航按钮跳转匹配项，自动滚动到匹配位置

### 优先级7：PDF 导出功能 ✅
- **文件**: `frontend/src/app/dashboard/result/page.tsx`
- **修改**: 使用浏览器 `window.print()` 方案，新窗口渲染格式化 HTML（含 marked.js 解析 Markdown），自动触发打印/保存 PDF；顶部导航栏新增"导出 PDF"按钮

### 19. 管理后台 + 系统监控（2026-06-14）
- **新增文件**: `backend/app/routers/admin.py`, `backend/app/services/monitor.py`, `frontend/src/app/admin/page.tsx`
- **修改文件**: `backend/app/main.py`, `backend/app/config.py`, `backend/celery_worker.py`
- **Admin API**:
  - `GET /api/admin/stats` — 核心数据统计（用户/任务/收入/系统状态/趋势图）
  - `GET /api/admin/users` — 用户列表
  - `GET /api/admin/health-detail` — 系统健康详情（DB/Redis/GPU/DeepSeek）
  - 所有接口需 `Authorization: Bearer {ADMIN_PASSWORD}` 鉴权
- **Admin 页面** (`/admin`):
  - 密码登录，密码存 localStorage
  - 四个 Tab：总览/任务/收入/系统
  - 核心指标卡片、套餐分布、14天趋势图、最近任务/订单
  - 系统健康状态实时展示
- **系统监控**:
  - Celery beat 每5分钟执行 `system_health_check`
  - 检查 PostgreSQL/Redis/GPU服务器/DeepSeek API
  - 异常时通过 Server酱 推送微信通知
  - 配置项：`.env` 中添加 `SERVERCHAN_KEY` 和 `ADMIN_PASSWORD`

---

## 十四、docs 目录文档索引

| 文档 | 用途 |
|---|---|
| 产品需求文档-v3-HAI双机最终版.md | 需求定稿 |
| 定价方案-v2.md | 当前定价方案 |
| 支付接入测试文档.md | 微信支付接入参考 |
| 运维部署手册.md | 日常运维速查 |
| PostgreSQL部署指南.md | PG 部署/备份/恢复 |

---

## 十五、关键文件速查

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
| `frontend/src/app/dashboard/result/page.tsx` | 笔记结果页（转录/总结/思维导图/笔记） |
| `frontend/src/app/dashboard/history/page.tsx` | 历史记录页（筛选/查看/删除） |
| `frontend/src/app/dashboard/profile/page.tsx` | 用户中心（余额/订单/邀请） |
| `frontend/src/app/admin/page.tsx` | 管理后台（数据统计/系统监控） |
| `frontend/src/app/page.tsx` | 首页（Hero/功能/定价/评价/Footer） |
| `frontend/src/app/globals.css` | 全局样式（含滚动动画） |

---

## 十六、上线前优化记录（2026-06-14 第二轮）

### 1. 定价页显示优化
- **文件**: `frontend/src/app/pricing/page.tsx`
- **修改**: `formatMinutes` 函数改为统一显示分钟（如"600分钟"而非"10小时"），使用 `toLocaleString` 千分位格式化
- **原因**: 显示分钟数更有冲击力，小时显得量少

### 2. 正式上线扣费修正
- **文件**: `backend/app/routers/pay.py`
- **修改**: 删除 `TEST_PRICE_MAP` 测试价映射，`actual_price_cent` 直接使用 `plan.price_cent`
- **原测试价**: basic 150分(¥1.5) / pro 350分(¥3.5) / basic_year 690分(¥6.9) / pro_year 2390分(¥23.9)
- **正式价**: basic 1500分(¥15) / pro 3500分(¥35) / basic_year 6900分(¥69) / pro_year 23900分(¥239)

### 3. 导航栏增加"笔记"入口
- **文件**: `dashboard/page.tsx`, `dashboard/history/page.tsx`, `dashboard/profile/page.tsx`
- **修改**: 导航栏在"历史记录"和"用户中心"之间增加"笔记"链接，指向 `/dashboard/history`
- **注意**: 不能指向 `/dashboard/result`，因为该页面需要 `?id=` 参数

### 4. 历史记录"查看"改为文字按钮
- **文件**: `frontend/src/app/dashboard/history/page.tsx`
- **修改**: ExternalLink 图标按钮改为蓝色"查看"文字链接
- **清理**: 移除未使用的 `ExternalLink` import

### 5. 首页 Footer 完善
- **文件**: `frontend/src/app/page.tsx`
- **修改**: 四列布局 Footer（品牌/功能/服务/联系），底部备案信息

### 6. 首页用户评价模块
- **文件**: `frontend/src/app/page.tsx`, `frontend/src/app/globals.css`
- **修改**: 8条评价卡片横向无限滚动，Emoji 头像 + 多彩渐变背景
- **动画**: CSS `@keyframes scroll` 40秒一轮，鼠标悬停暂停
- **数据**: 复制一份实现无缝循环

### 7. 定价页未登录状态
- **文件**: `frontend/src/app/pricing/page.tsx`
- **修改**: 未登录时右上角显示"登录"文字 + "免费开始"蓝色按钮，已登录显示余额 + "升级"

### 8. 笔记结果页增加思维导图标签
- **文件**: `frontend/src/app/dashboard/result/page.tsx`
- **修改**: 新增"思维导图"标签页（GitBranch 图标），位于"AI 总结"和"学习笔记"之间
- **布局**: 中心主题（视频标题）→ 视频摘要 → 核心要点网格 → 适合人群/学习建议
- **数据源**: 复用 `task.summary` 数据

### 9. 首页输入框交互修复
- **文件**: `frontend/src/app/page.tsx`, `frontend/src/app/dashboard/page.tsx`
- **修改**: 
  - 首页"开始转录"按钮：未登录 → 跳转 `/login`，已登录 → 跳转 `/dashboard?url=视频链接`
  - 工作台接收 `?url=` 参数，自动填充输入框并调用解析 API

### 10. Next.js 14 Suspense 边界修复
- **文件**: `dashboard/page.tsx`, `dashboard/result/page.tsx`, `dashboard/processing/page.tsx`
- **修改**: 所有使用 `useSearchParams()` 的页面需要包裹 `Suspense` 边界
- **模式**: 将原组件重命名为 `XxxInner`，导出包裹 `Suspense` 的 `Xxx` 组件

---

## 十七、待部署文件清单

以下文件已修改但尚未部署到服务器（118.25.22.220）：

### 前端
```
frontend/src/app/page.tsx
frontend/src/app/globals.css
frontend/src/app/pricing/page.tsx
frontend/src/app/dashboard/page.tsx
frontend/src/app/dashboard/history/page.tsx
frontend/src/app/dashboard/profile/page.tsx
frontend/src/app/dashboard/result/page.tsx
frontend/src/app/dashboard/processing/page.tsx
```

### 后端
```
backend/app/routers/pay.py
backend/app/routers/admin.py
backend/app/services/monitor.py
backend/app/main.py
backend/app/config.py
backend/celery_worker.py
```

### 部署步骤
```bash
# 1. 拷贝所有前端文件到服务器
scp d:/project_web/ai-sp-z-wz/frontend/src/app/page.tsx ubuntu@118.25.22.220:/home/ubuntu/video-notes/frontend/src/app/page.tsx
scp d:/project_web/ai-sp-z-wz/frontend/src/app/globals.css ubuntu@118.25.22.220:/home/ubuntu/video-notes/frontend/src/app/globals.css
scp d:/project_web/ai-sp-z-wz/frontend/src/app/pricing/page.tsx ubuntu@118.25.22.220:/home/ubuntu/video-notes/frontend/src/app/pricing/page.tsx
scp d:/project_web/ai-sp-z-wz/frontend/src/app/dashboard/page.tsx ubuntu@118.25.22.220:/home/ubuntu/video-notes/frontend/src/app/dashboard/page.tsx
scp d:/project_web/ai-sp-z-wz/frontend/src/app/dashboard/history/page.tsx ubuntu@118.25.22.220:/home/ubuntu/video-notes/frontend/src/app/dashboard/history/page.tsx
scp d:/project_web/ai-sp-z-wz/frontend/src/app/dashboard/profile/page.tsx ubuntu@118.25.22.220:/home/ubuntu/video-notes/frontend/src/app/dashboard/profile/page.tsx
scp d:/project_web/ai-sp-z-wz/frontend/src/app/dashboard/result/page.tsx ubuntu@118.25.22.220:/home/ubuntu/video-notes/frontend/src/app/dashboard/result/page.tsx
scp d:/project_web/ai-sp-z-wz/frontend/src/app/dashboard/processing/page.tsx ubuntu@118.25.22.220:/home/ubuntu/video-notes/frontend/src/app/dashboard/processing/page.tsx

# 2. 拷贝后端文件
scp d:/project_web/ai-sp-z-wz/backend/app/routers/pay.py ubuntu@118.25.22.220:/home/ubuntu/video-notes/backend/app/routers/pay.py
scp d:/project_web/ai-sp-z-wz/backend/app/routers/admin.py ubuntu@118.25.22.220:/home/ubuntu/video-notes/backend/app/routers/admin.py
scp d:/project_web/ai-sp-z-wz/backend/app/services/monitor.py ubuntu@118.25.22.220:/home/ubuntu/video-notes/backend/app/services/monitor.py
scp d:/project_web/ai-sp-z-wz/backend/app/main.py ubuntu@118.25.22.220:/home/ubuntu/video-notes/backend/app/main.py
scp d:/project_web/ai-sp-z-wz/backend/app/config.py ubuntu@118.25.22.220:/home/ubuntu/video-notes/backend/app/config.py
scp d:/project_web/ai-sp-z-wz/backend/celery_worker.py ubuntu@118.25.22.220:/home/ubuntu/video-notes/backend/celery_worker.py

# 3. 服务器上 .env 添加配置
# SERVERCHAN_KEY=你的SendKey
# ADMIN_PASSWORD=flownote_admin_2026

# 4. 构建前端
cd /home/ubuntu/video-notes/frontend && npm run build

# 5. 重启服务
bash ~/video-notes/stop.sh && bash ~/video-notes/start.sh
```

---

## 十八、服务器环境信息

| 项目 | 值 |
|---|---|
| 服务器 IP | 118.25.22.220 |
| SSH 用户 | ubuntu |
| 项目目录 | /home/ubuntu/video-notes |
| 前端框架 | Next.js 14.2.35 |
| 后端框架 | FastAPI |
| 数据库 | PostgreSQL |
| 缓存 | Redis |
| 任务队列 | Celery + Redis |
| 支付 | 微信支付 Native |
| 域名 | flownote.cn |
| ICP 备案 | 青ICP备2026000930号-1 |
| 公网安备 | 青公网安备63010502000671号 |

---

## 十九、会话记录

### 2026-06-15 会话

**会话轮数**：第 8 轮（当前会话已达第 8 轮，建议开启新窗口继续）

**会话主题**：
1. 项目整体情况确认（基于 docs/PROJECT_CONTEXT.md）
2. 用户误提的"任务管理页面删除按钮"需求（已确认 FlowNote 项目无此功能/角色体系）
3. 基于 docs/产品需求文档-v3-HAI双机最终版.md 和 docs/定价方案-v2.md 撰写小红书推广文案

**关键输出**：
- 已输出普通种草版小红书文案（标题 × 3、正文、标签）
- 已输出创始人故事版小红书文案（基于"学 AI/编程从 B站学习课程"设定）
- 已给出发布时间段、发布频率、内容配比等运营建议
- 已给出创始人故事版配图方案（9 张图脚本）

**重要提醒**：
- 创始人故事为产品文档外素材，需确保真实性
- 避免直接点名竞品，建议使用"同类工具/某产品"等模糊表述
- 小红书发布避免过度营销话术，首图建议 3:4 竖图

**下一步待办**（可选）：
- 根据用户反馈调整文案风格/目标人群
- 生成图片设计 brief 文档
- 制定一周发布排期表
