#!/bin/bash

echo "🔧 安装DCD后台管理系统..."

# 检查Node.js版本
echo "📦 检查Node.js版本..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js未安装，请先安装Node.js 16+"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    echo "❌ Node.js版本过低，需要16+版本"
    exit 1
fi

echo "✅ Node.js版本检查通过: $(node -v)"

# 检查MongoDB
echo "📊 检查MongoDB..."
if ! command -v mongod &> /dev/null; then
    echo "⚠️  MongoDB未安装，请先安装MongoDB"
    echo "   安装指南: https://docs.mongodb.com/manual/installation/"
fi

# 安装后端依赖
echo "📦 安装后端依赖..."
npm install

# 安装前端依赖
echo "📦 安装前端依赖..."
cd client
npm install
cd ..

# 初始化数据库
echo "🗄️  初始化数据库..."
npm run init-db

echo "✅ 安装完成！"
echo ""
echo "🚀 启动系统:"
echo "   ./start.sh"
echo ""
echo "📱 访问地址: http://localhost:5002"
echo "👤 默认账号: admin@dcd.com / admin123" 