#!/bin/bash

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

LOG_DIR="$HOME/video-notes/logs"

echo "========================================"
echo "  FlowNote 服务状态"
echo "========================================"
echo ""

echo -n "FastAPI 后端 (8001): "
if pgrep -f "uvicorn app.main:app --host 0.0.0.0 --port 8001" > /dev/null; then
    PID=$(pgrep -f "uvicorn app.main:app --host 0.0.0.0 --port 8001")
    echo -e "${GREEN}运行中${NC} (PID: $PID)"
else
    echo -e "${RED}已停止${NC}"
fi

echo -n "Celery Worker:      "
if pgrep -f "celery -A celery_worker worker" > /dev/null; then
    PID=$(pgrep -f "celery -A celery_worker worker")
    echo -e "${GREEN}运行中${NC} (PID: $PID)"
else
    echo -e "${RED}已停止${NC}"
fi

echo -n "Next.js 前端 (3000): "
# 用 ss 或 netstat 检测端口，比 lsof 更可靠
if command -v ss > /dev/null 2>&1; then
    PORT_CHECK=$(ss -tlnp 2>/dev/null | grep ':3000' || true)
elif command -v netstat > /dev/null 2>&1; then
    PORT_CHECK=$(netstat -tlnp 2>/dev/null | grep ':3000' || true)
else
    PORT_CHECK=""
fi
# 同时检查进程名，双保险
if [ -n "$PORT_CHECK" ] || pgrep -f "next-server" > /dev/null 2>&1 || pgrep -f "npm run dev" > /dev/null 2>&1; then
    PID=$(pgrep -f "next-server" | head -1)
    if [ -z "$PID" ]; then
        PID=$(pgrep -f "npm run dev" | head -1)
    fi
    echo -e "${GREEN}运行中${NC} (PID: ${PID:-?})"
else
    echo -e "${RED}已停止${NC}"
fi

echo -n "Redis:              "
if pgrep -x "redis-server" > /dev/null; then
    echo -e "${GREEN}运行中${NC}"
else
    echo -e "${YELLOW}未运行${NC}"
fi

echo ""
echo "========================================"
echo "日志文件:"
echo "  后端:   $LOG_DIR/backend.log"
echo "  Celery: $LOG_DIR/celery.log"
echo "  前端:   $LOG_DIR/frontend.log"
echo ""
echo "快速命令:"
echo "  启动: bash ~/video-notes/start.sh"
echo "  停止: bash ~/video-notes/stop.sh"
echo "  查看日志: tail -f $LOG_DIR/backend.log"
echo "========================================"
