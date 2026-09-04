#!/data/data/com.termux/files/usr/bin/bash
# ========================================================
#   تحديث محرك Termux إلى أحدث نسخة من المستودع
# ========================================================

set -e
cd "$(dirname "$0")"

echo "========================================================"
echo "  🔄 تحديث محرك Termux إلى أحدث إصدار..."
echo "========================================================"

git pull origin main

if [ ! -d "node_modules" ]; then
    npm install --omit=dev
fi

sed -i 's/if (!creds.me)/if (!creds.me || !creds.registered)/g' node_modules/@whiskeysockets/baileys/lib/Socket/socket.js 2>/dev/null || true

chmod +x start.sh update.sh 2>/dev/null || true

echo "========================================================"
echo "  ✓ تم التحديث بنجاح! لتشغيل المحرك اكتب: ./start.sh"
echo "========================================================"
