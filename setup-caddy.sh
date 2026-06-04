#!/bin/bash

# FlowNote Caddy + HTTPS 一键配置脚本
# 运行前请确保: 域名已解析到本机IP, 防火墙已开放80/443端口

set -e

DOMAIN="flownote.cn"
BACKEND_PORT=8001
FRONTEND_PORT=3000

echo "========================================"
echo "  Caddy + HTTPS 一键配置"
echo "========================================"
echo ""

# 检查 root
if [ "$EUID" -ne 0 ]; then
    echo "❌ 请用 sudo 运行: sudo bash setup-caddy.sh"
    exit 1
fi

# 检查域名解析
echo "[1/6] 检查域名解析..."
SERVER_IP=$(curl -s --connect-timeout 5 ifconfig.me 2>/dev/null || echo "")
if [ -z "$SERVER_IP" ]; then
    echo "⚠️ 无法获取公网IP，跳过解析检查"
else
    DOMAIN_IP=$(dig +short $DOMAIN 2>/dev/null | head -1 || nslookup $DOMAIN 2>/dev/null | grep -A1 "Name:" | tail -1 | awk '{print $2}' | head -1)
    if [ -n "$DOMAIN_IP" ] && [ "$DOMAIN_IP" = "$SERVER_IP" ]; then
        echo "✓ 域名解析正确: $DOMAIN → $SERVER_IP"
    else
        echo "⚠️ 域名 $DOMAIN 解析结果 ($DOMAIN_IP) 与本机IP ($SERVER_IP) 不一致"
        echo "   请确认已在腾讯云控制台添加 A 记录: $DOMAIN → $SERVER_IP"
        echo "   解析生效可能需要 1-10 分钟，可以继续安装"
        echo ""
        read -p "是否继续? (y/N): " confirm
        if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
fi

# 安装 Caddy
echo ""
echo "[2/6] 安装 Caddy..."
apt-get update > /dev/null 2>&1
apt-get install -y debian-keyring debian-archive-keyring apt-transport-https curl > /dev/null 2>&1
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' 2>/dev/null | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg 2>/dev/null || true
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' 2>/dev/null | tee /etc/apt/sources.list.d/caddy-stable.list > /dev/null 2>&1 || true
apt-get update > /dev/null 2>&1
apt-get install -y caddy > /dev/null 2>&1

echo "✓ Caddy 安装完成: $(caddy version | head -1)"

# 写配置
echo ""
echo "[3/6] 写入 Caddyfile..."
cat > /etc/caddy/Caddyfile << EOF
$DOMAIN {
    # API 请求直接代理到后端
    reverse_proxy /api/* localhost:$BACKEND_PORT

    # 其他请求代理到前端
    reverse_proxy localhost:$FRONTEND_PORT
}
EOF
echo "✓ Caddyfile 已写入"
echo "   域名: $DOMAIN"
echo "   前端: localhost:$FRONTEND_PORT"
echo "   API:  localhost:$BACKEND_PORT"

# 防火墙
echo ""
echo "[4/6] 配置防火墙..."
ufw allow 80/tcp comment 'Caddy HTTP' > /dev/null 2>&1 || true
ufw allow 443/tcp comment 'Caddy HTTPS' > /dev/null 2>&1 || true
echo "✓ 防火墙已开放 80/443 端口"

# 腾讯云安全组提醒
echo ""
echo "⚠️ 重要提醒:"
echo "   如果用的是腾讯云，还需要在控制台 → 安全组 → 入站规则"
echo "   添加: TCP 80, TCP 443 (来源 0.0.0.0/0)"
echo ""

# 启动 Caddy
echo "[5/6] 启动 Caddy..."
systemctl enable caddy > /dev/null 2>&1
systemctl restart caddy
sleep 3

# 检查状态
if systemctl is-active --quiet caddy; then
    echo "✓ Caddy 服务运行中"
else
    echo "❌ Caddy 启动失败"
    echo "   查看日志: journalctl -u caddy --no-pager -n 20"
    exit 1
fi

# 验证 HTTPS
echo ""
echo "[6/6] 验证 HTTPS..."
sleep 2
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 10 "https://$DOMAIN" 2>/dev/null || echo "000")

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "301" ] || [ "$HTTP_CODE" = "302" ]; then
    echo "✓ HTTPS 访问正常 (HTTP $HTTP_CODE)"
else
    echo "⚠️ HTTPS 返回状态码: $HTTP_CODE"
    echo "   证书申请可能需要 1-2 分钟，稍后重试: curl -I https://$DOMAIN"
fi

echo ""
echo "========================================"
echo "  Caddy + HTTPS 配置完成"
echo "========================================"
echo ""
echo "访问地址:"
echo "  🌐 前端页面: https://$DOMAIN"
echo "  🔌 API 接口: https://$DOMAIN/api/xxx"
echo ""
echo "SSL 证书:"
echo "  Let's Encrypt 自动申请，自动续期，无需操作"
echo ""
echo "常用命令:"
echo "  查看状态: systemctl status caddy"
echo "  查看日志: journalctl -u caddy -f"
echo "  重载配置: systemctl reload caddy"
echo "  测试配置: caddy validate --config /etc/caddy/Caddyfile"
echo "========================================"
