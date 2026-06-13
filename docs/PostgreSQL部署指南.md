# FlowNote PostgreSQL 部署指南

## 概述

本文档指导在腾讯云轻量服务器（2核4G）上部署 PostgreSQL，用于替换原有的 SQLite 数据库。

---

## 一、服务器环境

| 项目 | 配置 |
|------|------|
| 服务器 | 腾讯云轻量应用服务器 |
| CPU/内存 | 2核4G |
| 系统盘 | 80GB SSD |
| 操作系统 | Ubuntu 22.04 LTS |
| 公网IP | 118.25.22.220 |
| 域名 | flownote.cn |

---

## 二、安装 PostgreSQL

### 2.1 添加 PostgreSQL 官方源

```bash
# 导入 GPG 密钥
sudo apt-get install -y wget ca-certificates
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -

# 添加仓库
echo "deb http://apt.postgresql.org/pub/repos/apt/ $(lsb_release -cs)-pgdg main" | sudo tee /etc/apt/sources.list.d/pgdg.list

# 更新包列表
sudo apt-get update
```

### 2.2 安装 PostgreSQL 16

```bash
sudo apt-get install -y postgresql-16 postgresql-client-16 postgresql-contrib-16
```

### 2.3 验证安装

```bash
# 查看版本
psql --version

# 查看服务状态
sudo systemctl status postgresql

# 设置开机自启
sudo systemctl enable postgresql
```

---

## 三、创建数据库和用户

### 3.1 切换到 postgres 用户

```bash
sudo -u postgres psql
```

### 3.2 在 psql 中执行

```sql
-- 创建数据库用户（密码请修改为强密码）
CREATE USER flownote WITH PASSWORD 'FN_QH_bss_0971';

-- 创建数据库
CREATE DATABASE flownote OWNER flownote;

-- 授予权限
GRANT ALL PRIVILEGES ON DATABASE flownote TO flownote;

-- 退出
\q
```

### 3.3 验证连接

```bash
psql -U flownote -d flownote -h localhost -W
```

输入密码后，看到 `flownote=>` 提示符即表示成功。

---

## 四、配置 PostgreSQL（针对 4GB 内存优化）

### 4.1 编辑配置文件

```bash
sudo vi /etc/postgresql/16/main/postgresql.conf
```

### 4.2 修改以下配置项

```ini
# 连接设置
listen_addresses = 'localhost'
max_connections = 50

# 内存设置（针对 4GB 内存优化）
shared_buffers = 256MB                  # 默认 128MB，建议不超过总内存 1/4
effective_cache_size = 1536MB           # 操作系统缓存估算，约为总内存 3/8
work_mem = 4MB                          # 单个查询操作内存
maintenance_work_mem = 64MB             # 维护操作（VACUUM/CREATE INDEX）内存

# WAL 设置
wal_buffers = 16MB
max_wal_size = 1GB
min_wal_size = 512MB

# 日志设置
log_destination = 'stderr'
logging_collector = on
log_directory = 'log'
log_filename = 'postgresql-%Y-%m-%d_%H%M%S.log'
log_statement = 'mod'                   # 记录所有修改语句，便于排查问题
log_min_duration_statement = 1000       # 记录执行超过 1 秒的慢查询

# 时区
timezone = 'Asia/Shanghai'
```

### 4.3 配置访问权限

```bash
sudo vi /etc/postgresql/16/main/pg_hba.conf
```

确保有以下行（本地连接使用密码认证）：

```
# IPv4 本地连接：
host    all             all             127.0.0.1/32            scram-sha-256

# IPv6 本地连接：
host    all             all             ::1/128                 scram-sha-256

# Unix 域套接字连接：
local   all             all                                     peer
```

### 4.4 重启 PostgreSQL

```bash
sudo systemctl restart postgresql
```

---

## 五、配置防火墙

PostgreSQL 只监听 localhost，外部无法直接访问，无需开放 5432 端口到公网。

如需从外部管理（不推荐），可使用 SSH 隧道：

```bash
# 本地终端执行，将远程 5432 端口映射到本地 5433
ssh -L 5433:localhost:5432 root@118.25.22.220
```

---

## 六、后端环境变量配置

### 6.1 编辑 .env 文件

```bash
cd /opt/flownote/backend
vi .env
```

### 6.2 添加/修改数据库连接

```ini
DATABASE_URL=postgresql://flownote:FN_QH_bss_0971@localhost:5432/flownote
```

> **注意**：如果密码与上述不同，请替换为实际密码。

---

## 七、安装 Python 依赖

### 7.1 安装 psycopg2

```bash
cd /opt/flownote/backend

# 激活虚拟环境
source venv/bin/activate

# 安装 PostgreSQL 适配器
pip install psycopg2-binary==2.9.9

# 或者安装全部依赖（requirements.txt 已更新）
pip install -r requirements.txt
```

---

## 八、启动后端服务

### 8.1 首次启动（自动建表）

```bash
cd /opt/flownote/backend
source venv/bin/activate

# 测试启动，观察是否有报错
python -c "from app.main import app; print('Import OK')"
```

### 8.2 重启服务

```bash
# 如果使用 systemd 管理
sudo systemctl restart flownote-api
sudo systemctl restart flownote-celery

# 或者手动重启
# pkill -f uvicorn
# pkill -f celery
# 然后重新启动
```

---

## 九、数据迁移（从 SQLite 迁移到 PostgreSQL）

### 9.1 备份现有 SQLite 数据

```bash
cd /opt/flownote/backend
cp videonotes.db videonotes.db.backup.$(date +%Y%m%d)
```

### 9.2 安装迁移工具

```bash
pip install sqlite3-to-postgres
```

### 9.3 执行迁移

```bash
# 方法1：使用 pgloader（推荐，处理类型转换更好）
sudo apt-get install pgloader

pgloader sqlite:///opt/flownote/backend/videonotes.db postgresql://flownote:FN_QH_bss_0971@localhost:5432/flownote
```

或者手动迁移：

```bash
# 方法2：使用 Python 脚本
python << 'EOF'
import sqlite3
import psycopg2
from datetime import datetime

# SQLite 连接
sqlite_conn = sqlite3.connect('/opt/flownote/backend/videonotes.db')
sqlite_conn.row_factory = sqlite3.Row
sqlite_cur = sqlite_conn.cursor()

# PostgreSQL 连接
pg_conn = psycopg2.connect(
    host='localhost',
    database='flownote',
    user='flownote',
    password='FN_QH_bss_0971'
)
pg_cur = pg_conn.cursor()

# 获取所有表
sqlite_cur.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;")
tables = [row[0] for row in sqlite_cur.fetchall()]

for table in tables:
    if table.startswith('sqlite_'):
        continue
    
    print(f"Migrating table: {table}")
    
    # 获取 SQLite 数据
    sqlite_cur.execute(f"SELECT * FROM {table}")
    rows = sqlite_cur.fetchall()
    
    if not rows:
        continue
    
    # 获取列名
    columns = [description[0] for description in sqlite_cur.description]
    placeholders = ','.join(['%s'] * len(columns))
    columns_str = ','.join(columns)
    
    # 插入 PostgreSQL
    for row in rows:
        pg_cur.execute(
            f"INSERT INTO {table} ({columns_str}) VALUES ({placeholders})",
            tuple(row)
        )
    
    pg_conn.commit()
    print(f"  Migrated {len(rows)} rows")

pg_cur.close()
pg_conn.close()
sqlite_cur.close()
sqlite_conn.close()
print("Migration completed!")
EOF
```

### 9.4 验证迁移

```bash
sudo -u postgres psql -d flownote -c "SELECT COUNT(*) FROM users;"
sudo -u postgres psql -d flownote -c "SELECT COUNT(*) FROM tasks;"
sudo -u postgres psql -d flownote -c "SELECT COUNT(*) FROM orders;"
```

---

## 十、备份策略

### 10.1 创建备份脚本

```bash
sudo tee /opt/flownote/scripts/backup_db.sh << 'EOF'
#!/bin/bash

BACKUP_DIR="/opt/flownote/backups"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="flownote"
DB_USER="flownote"
RETENTION_DAYS=7

# 创建备份目录
mkdir -p $BACKUP_DIR

# 执行备份
pg_dump -U $DB_USER -d $DB_NAME -F c -f "$BACKUP_DIR/flownote_${DATE}.dump"

# 压缩备份
gzip "$BACKUP_DIR/flownote_${DATE}.dump"

# 删除 7 天前的备份
find $BACKUP_DIR -name "flownote_*.dump.gz" -mtime +$RETENTION_DAYS -delete

echo "Backup completed: flownote_${DATE}.dump.gz"
EOF

chmod +x /opt/flownote/scripts/backup_db.sh
```

### 10.2 配置定时任务

```bash
sudo crontab -e
```

添加以下行（每天凌晨 3 点备份）：

```
0 3 * * * /opt/flownote/scripts/backup_db.sh >> /var/log/flownote_backup.log 2>&1
```

### 10.3 手动备份

```bash
# 全量备份
pg_dump -U flownote -d flownote -F c -f flownote_backup.dump

# 恢复备份
pg_restore -U flownote -d flownote -c flownote_backup.dump
```

---

## 十一、监控与维护

### 11.1 查看数据库大小

```bash
sudo -u postgres psql -d flownote -c "
SELECT pg_size_pretty(pg_database_size('flownote'));
"
```

### 11.2 查看表大小

```bash
sudo -u postgres psql -d flownote -c "
SELECT relname as table_name, pg_size_pretty(pg_total_relation_size(relid)) as size
FROM pg_catalog.pg_statio_user_tables
ORDER BY pg_total_relation_size(relid) DESC;
"
```

### 11.3 查看活跃连接

```bash
sudo -u postgres psql -d flownote -c "
SELECT pid, usename, application_name, client_addr, state, query_start, query
FROM pg_stat_activity
WHERE datname = 'flownote';
"
```

### 11.4 定期 VACUUM（自动清理）

PostgreSQL 默认已启用 autovacuum，一般无需手动干预。如需手动执行：

```bash
sudo -u postgres psql -d flownote -c "VACUUM ANALYZE;"
```

---

## 十二、故障排查

### 12.1 无法连接数据库

```bash
# 检查 PostgreSQL 是否运行
sudo systemctl status postgresql

# 检查监听端口
sudo ss -tlnp | grep 5432

# 查看日志
sudo tail -f /var/log/postgresql/postgresql-16-main.log
```

### 12.2 连接数过多

```bash
# 查看当前连接数
sudo -u postgres psql -c "SELECT count(*) FROM pg_stat_activity;"

# 终止指定连接
sudo -u postgres psql -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'flownote' AND pid <> pg_backend_pid();"
```

### 12.3 内存不足

如果服务器内存吃紧，进一步降低 PostgreSQL 内存配置：

```ini
shared_buffers = 128MB
work_mem = 2MB
maintenance_work_mem = 32MB
effective_cache_size = 512MB
```

---

## 十三、回滚方案（紧急）

如果 PostgreSQL 部署出现问题，可以快速回滚到 SQLite：

```bash
# 1. 停止后端服务
sudo systemctl stop flownote-api
sudo systemctl stop flownote-celery

# 2. 修改 .env，改回 SQLite
sed -i 's|DATABASE_URL=postgresql://.*|DATABASE_URL=sqlite:///./videonotes.db|' /opt/flownote/backend/.env

# 3. 恢复 requirements.txt（移除 psycopg2）
# 手动编辑 requirements.txt 删除 psycopg2-binary 行

# 4. 重启服务
sudo systemctl start flownote-api
sudo systemctl start flownote-celery
```

---

## 十四、配置清单

| 配置项 | 值 | 位置 |
|--------|-----|------|
| 数据库名 | `flownote` | PostgreSQL |
| 用户名 | `flownote` | PostgreSQL |
| 密码 | `FN_QH_bss_0971` | PostgreSQL / .env |
| 监听地址 | `localhost` | postgresql.conf |
| 端口 | `5432` | 默认 |
| 最大连接数 | `50` | postgresql.conf |
| shared_buffers | `256MB` | postgresql.conf |
| 后端连接串 | `postgresql://flownote:FN_QH_bss_0971@localhost:5432/flownote` | .env |

---

## 十五、部署后验证清单

- [ ] PostgreSQL 服务运行正常
- [ ] 数据库 `flownote` 已创建
- [ ] 用户 `flownote` 可以正常连接
- [ ] 后端 `.env` 中 `DATABASE_URL` 已更新
- [ ] `psycopg2-binary` 已安装
- [ ] 后端服务可以正常启动
- [ ] 自动建表成功（检查 `Base.metadata.create_all`）
- [ ] 数据迁移完成（如有旧数据）
- [ ] 备份脚本配置完成
- [ ] 定时任务已启用
- [ ] 微信支付回调正常
- [ ] 微信登录正常
- [ ] 创建任务/转录流程正常

---

> **部署时间**：预计 30-60 分钟（含数据迁移）
> **维护窗口**：建议在低峰期（凌晨）执行
> **风险等级**：中（有回滚方案）
