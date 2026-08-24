#!/bin/bash
sed -i '/# WhatsApp \/ Evolution API — Notificação de Chamados/,/WHATSAPP_NOTIFY_GROUP=SEU_GRUPO_ID@g.us/d' .env.example
sed -i '/EVOLUTION_SERVER_URL=http:\/\/localhost:8080/d' .env.example

cat << 'INNER_EOF' >> .env.example

# Telegram Notifications
# Create a bot with BotFather and get the token
TELEGRAM_BOT_TOKEN="SEU_TOKEN_AQUI"
# To get the group ID, add the bot to the group, send a message and call the /getUpdates endpoint
TELEGRAM_CHAT_ID="-1000000000000"
INNER_EOF

