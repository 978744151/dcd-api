#!/bin/bash

echo "🚀 启动DCD后台管理系统..."

# # 检查MongoDB是否运行
# echo "📊 检查MongoDB连接..."
# if ! command -v mongod &> /dev/null; then
#     echo "❌ MongoDB未安装，请先安装MongoDB"
#     exit 1
# fi

# # 初始化数据库
# echo "🗄️  初始化数据库..."
# npm run init-db

# 启动后端服务
echo "🔧 启动后端服务..."
npm run dev &

# 等待后端启动
sleep 3

# 启动前端服务
echo "🎨 启动前端服务..."
cd client
npm start &

echo "✅ 系统启动完成！"
echo "📱 前端地址: http://localhost:5002"
echo "🔗 后端API: http://localhost:5002/api"
echo "👤 默认管理员账号: admin@dcd.com / admin123"

# 等待用户中断
wait 