#!/bin/bash

# FlowNote 一键启动脚本
# 用于 Ubuntu 服务器，启动前后端 + Celery Worker
# 路径: ~/video-notes/

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

BASE_DIR="$HOME/video-notes"
BACKEND_DIR="$BASE_DIR/backend"
FRONTEND_DIR="$BASE_DIR/frontend"
LOG_DIR="$BASE_DIR/logs"

mkdir -p "$LOG_DIR"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  FlowNote 服务启动脚本${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# 检查 Redis
if ! pgrep -x "redis-server" > /dev/null; then
    echo -e "${YELLOW}⚠ Redis 未运行，尝试启动...${NC}"
    redis-server --daemonize yes 2>/dev/null || {
        echo -e "${RED}✗ Redis 启动失败，请手动安装: sudo apt install redis-server${NC}"
        exit 1
    }
    sleep 1
    echo -e "${GREEN}✓ Redis 已启动${NC}"
else
    echo -e "${GREEN}✓ Redis 运行中${NC}"
fi

# 检查目录
if [ ! -d "$BACKEND_DIR" ]; then
    echo -e "${RED}✗ 后端目录不存在: $BACKEND_DIR${NC}"
    exit 1
fi
if [ ! -d "$FRONTEND_DIR" ]; then
    echo -e "${RED}✗ 前端目录不存在: $FRONTEND_DIR${NC}"
    exit 1
fi

# 停止已有服务
echo ""
echo -e "${YELLOW}[1/5] 停止已有服务...${NC}"
pkill -f "uvicorn app.main:app --host 0.0.0.0 --port 8001" 2>/dev/null || true
pkill -f "celery -A celery_worker worker" 2>/dev/null || true
pkill -f "npm run dev" 2>/dev/null || true
pkill -f "next-server" 2>/dev/null || true
sleep 2
echo -e "${GREEN}✓ 旧服务已清理${NC}"

# 清理缓存
echo ""
echo -e "${YELLOW}[2/5] 清理 Python 缓存...${NC}"
find "$BACKEND_DIR" -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
find "$BACKEND_DIR" -name "*.pyc" -delete 2>/dev/null || true
echo -e "${GREEN}✓ 缓存已清理${NC}"

# 启动后端
echo ""
echo -e "${YELLOW}[3/5] 启动 FastAPI 后端 (端口 8001)...${NC}"
cd "$BACKEND_DIR"
if [ -f "venv/bin/activate" ]; then
    source venv/bin/activate
    echo -e "  ${BLUE}→ 使用虚拟环境: venv${NC}"
elif [ -f ".venv/bin/activate" ]; then
    source .venv/bin/activate
    echo -e "  ${BLUE}→ 使用虚拟环境: .venv${NC}"
else
    echo -e "${YELLOW}⚠ 未找到虚拟环境，使用系统 Python${NC}"
fi
nohup uvicorn app.main:app --host 0.0.0.0 --port 8001 > "$LOG_DIR/backend.log" 2>&1 &
sleep 4
if curl -s http://localhost:8001/api/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ 后端启动成功${NC}"
else
    echo -e "${RED}✗ 后端启动失败${NC}"
    echo -e "  查看日志: tail -f $LOG_DIR/backend.log"
    exit 1
fi

# 启动 Celery
echo ""
echo -e "${YELLOW}[4/5] 启动 Celery Worker...${NC}"
cd "$BACKEND_DIR"
if [ -f "venv/bin/activate" ]; then source venv/bin/activate
elif [ -f ".venv/bin/activate" ]; then source .venv/bin/activate; fi
nohup celery -A celery_worker worker --loglevel=info > "$LOG_DIR/celery.log" 2>&1 &
sleep 2
echo -e "${GREEN}✓ Celery Worker 已启动${NC}"

# 启动前端
echo ""
echo -e "${YELLOW}[5/5] 启动 Next.js 前端 (端口 3000)...${NC}"
cd "$FRONTEND_DIR"
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}⚠ node_modules 不存在，正在安装依赖...${NC}"
    npm install
fi
nohup npm run dev > "$LOG_DIR/frontend.log" 2>&1 &
sleep 4
# 检测前端端口（ss/netstat 比 lsof 更可靠）
if command -v ss > /dev/null 2>&1; then
    PORT_CHECK=$(ss -tlnp 2>/dev/null | grep ':3000' || true)
elif command -v netstat > /dev/null 2>&1; then
    PORT_CHECK=$(netstat -tlnp 2>/dev/null | grep ':3000' || true)
else
    PORT_CHECK=""
fi
if [ -n "$PORT_CHECK" ] || pgrep -f "next-server" > /dev/null 2>&1 || pgrep -f "npm run dev" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ 前端启动成功${NC}"
else
    echo -e "${RED}✗ 前端启动失败${NC}"
    echo -e "  查看日志: tail -f $LOG_DIR/frontend.log"
fi

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}  所有服务已启动！${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "访问地址:"
echo -e "  ${GREEN}前端:${NC} https://flownote.cn"
echo -e "  ${GREEN}后端:${NC} http://localhost:8001"
echo -e "  ${GREEN}健康检查:${NC} http://localhost:8001/api/health"
echo ""
echo -e "日志文件:"
echo -e "  ${BLUE}后端:${NC}   tail -f $LOG_DIR/backend.log"
echo -e "  ${BLUE}Celery:${NC} tail -f $LOG_DIR/celery.log"
echo -e "  ${BLUE}前端:${NC}   tail -f $LOG_DIR/frontend.log"
echo ""
echo -e "管理命令:"
echo -e "  ${YELLOW}停止:${NC} bash ~/video-notes/stop.sh"
echo -e "  ${YELLOW}状态:${NC} bash ~/video-notes/status.sh"
echo -e "${BLUE}========================================${NC}"
