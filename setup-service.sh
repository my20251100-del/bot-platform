#!/usr/bin/env bash
# تثبيت خادم البوت كخدمة systemd على Kali (يعمل تلقائياً مع الإقلاع)
set -e

SERVICE_DIR="/home/maknoon/Desktop/bot-platform"

echo "==> إيقاف العملية اليدوية القديمة (إن وُجدت)..."
pkill -f "engine/index.mjs" 2>/dev/null || true
sleep 1

echo "==> نسخ ملف الخدمة..."
cp "$SERVICE_DIR/bot-engine.service" /etc/systemd/system/bot-engine.service

echo "==> إعادة تحميل systemd..."
systemctl daemon-reload

echo "==> تفعيل التشغيل مع الإقلاع..."
systemctl enable bot-engine

echo "==> بدء الخدمة..."
systemctl restart bot-engine
sleep 3

echo ""
echo "==> الحالة:"
systemctl --no-pager status bot-engine | head -n 10

echo ""
echo "متابعة السجل:     journalctl -u bot-engine -f"
echo "إيقاف:            sudo systemctl stop bot-engine"
echo "إعادة التشغيل:    sudo systemctl restart bot-engine"
