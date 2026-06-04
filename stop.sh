#!/bin/bash

echo "========================================"
echo "  FlowNote 服务停止脚本"
echo "========================================"
echo ""

echo "[1/3] 停止 FastAPI 后端..."
pkill -f "uvicorn app.main:app --host 0.0.0.0 --port 8001" 2>/dev/null && echo "  ✓ 后端已停止" || echo "  - 后端未运行"

echo "[2/3] 停止 Celery Worker..."
pkill -f "celery -A celery_worker worker" 2>/dev/null && echo "  ✓ Celery 已停止" || echo "  - Celery 未运行"

echo "[3/3] 停止 Next.js 前端..."
pkill -f "npm run dev" 2>/dev/null && echo "  ✓ 前端已停止" || echo "  - 前端未运行"
pkill -f "next-server" 2>/dev/null && echo "  ✓ next-server 已停止" || echo "  - next-server 未运行"

echo ""
echo "========================================"
echo "  所有服务已停止"
echo "========================================"
