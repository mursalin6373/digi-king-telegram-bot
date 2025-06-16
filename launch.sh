#!/bin/bash

echo "🚀 Starting Digi-King Telegram Bot Launch Campaign..."
echo "==================================================="
echo ""

# Check if MongoDB is running
if ! pgrep -x "mongod" > /dev/null; then
    echo "⚠️  MongoDB not running. Starting MongoDB..."
    sudo systemctl start mongod || echo "⚠️  Could not start MongoDB automatically"
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

echo "🤖 Starting bot in background..."
nohup node src/index.js > bot.log 2>&1 &
BOT_PID=$!
echo "Bot PID: $BOT_PID"

# Wait a moment for bot to initialize
sleep 3

echo "📊 Starting dashboard..."
cd dashboard
nohup python3 -m http.server 8080 > ../dashboard.log 2>&1 &
DASHBOARD_PID=$!
cd ..
echo "Dashboard PID: $DASHBOARD_PID"

echo ""
echo "✅ Launch completed!"
echo "🌐 Services:"
echo "   • Bot API: http://localhost:3000"
echo "   • Dashboard: http://localhost:8080"
echo ""
echo "📋 Process IDs:"
echo "   • Bot: $BOT_PID"
echo "   • Dashboard: $DASHBOARD_PID"
echo ""
echo "📝 Logs:"
echo "   • Bot: tail -f bot.log"
echo "   • Dashboard: tail -f dashboard.log"
echo ""
echo "🛑 To stop services:"
echo "   kill $BOT_PID $DASHBOARD_PID"
echo ""

