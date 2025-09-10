# DCD后台管理系统

基于Koa + Node.js + React + Ant Design的现代化后台管理系统，用于管理全国地图品牌和商场数据。

## 项目架构

### 后端技术栈
- **Koa.js** - Node.js Web框架
- **MongoDB** - 数据库
- **Mongoose** - MongoDB ODM
- **JWT** - 身份认证
- **Joi** - 数据验证
- **bcryptjs** - 密码加密

### 前端技术栈
- **React 18** - 前端框架
- **TypeScript** - 类型安全
- **Ant Design** - UI组件库
- **React Router** - 路由管理
- **Axios** - HTTP客户端
- **@ant-design/plots** - 图表库

## 功能特性

### 数据管理
- ✅ 省份管理（增删改查）
- ✅ 城市管理（增删改查）
- ✅ 区县管理（增删改查）
- ✅ 品牌管理（增删改查）
- ✅ 商场管理（增删改查）
- ✅ 用户管理

### 数据展示
- ✅ 仪表盘数据概览
- ✅ 统计图表展示
- ✅ 地图数据展示
- ✅ 分页表格展示

### 系统功能
- ✅ 用户认证登录
- ✅ 权限管理
- ✅ 响应式设计
- ✅ 数据验证

## 项目结构

```
dcd-koa/
├── app.js                 # 主应用文件
├── config.env             # 环境配置
├── package.json           # 项目依赖
├── config/
│   └── database.js        # 数据库配置
├── models/                # 数据模型
│   ├── User.js           # 用户模型
│   ├── Province.js       # 省份模型
│   ├── City.js           # 城市模型
│   ├── District.js       # 区县模型
│   ├── Brand.js          # 品牌模型
│   └── Mall.js           # 商场模型
├── routes/                # 路由文件
│   ├── auth.js           # 认证路由
│   ├── map.js            # 地图数据路由
│   └── admin.js          # 管理路由
└── client/                # React前端
    ├── src/
    │   ├── components/    # 组件
    │   ├── pages/         # 页面
    │   ├── services/      # API服务
    │   ├── contexts/      # 上下文
    │   └── App.tsx        # 主应用
    └── package.json       # 前端依赖
```

## 快速开始

### 环境要求
- Node.js >= 16
- MongoDB >= 4.4
- npm >= 8

### 安装依赖

1. 安装后端依赖
```bash
npm install
```

2. 安装前端依赖
```bash
cd client
npm install
```

### 配置环境

1. 复制环境配置文件
```bash
cp config.env.example config.env
```

2. 修改配置文件
```env
# 服务器配置
PORT=5002
HOST=http://8.155.53.210:5002

# 数据库配置
MONGODB_URI=mongodb://localhost:27017/dcd_management

# JWT配置
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRES_IN=7d

# 会话配置
SESSION_SECRET=your_session_secret_here
```

### 启动服务

1. 启动后端服务
```bash
# 开发模式
npm run dev

# 生产模式
npm start
```

2. 启动前端服务
```bash
cd client
npm start
```

3. 访问系统
- 前端地址: http://localhost:5002
- 后端API: http://localhost:5002/api

## API接口

### 认证接口
- `POST /api/auth/login` - 用户登录
- `POST /api/auth/register` - 用户注册
- `GET /api/auth/me` - 获取当前用户信息

### 地图数据接口
- `GET /api/map/national` - 获取全国统计数据
- `GET /api/map/provinces` - 获取省份列表
- `GET /api/map/cities` - 获取城市列表
- `GET /api/map/districts` - 获取区县列表
- `GET /api/map/brands` - 获取品牌列表
- `GET /api/map/malls` - 获取商场列表

### 管理接口
- `POST /api/admin/provinces` - 创建省份
- `PUT /api/admin/provinces/:id` - 更新省份
- `DELETE /api/admin/provinces/:id` - 删除省份
- 其他CRUD接口类似...

## 默认账号

- 管理员账号: admin@dcd.com
- 管理员密码: admin123

## 部署说明

### 生产环境部署

1. 构建前端
```bash
cd client
npm run build
```

2. 配置Nginx
```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        root /path/to/dcd-koa/client/build;
        try_files $uri $uri/ /index.html;
    }
    
    location /api {
        proxy_pass http://localhost:5002;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

3. 使用PM2启动后端
```bash
npm install -g pm2
pm2 start app.js --name dcd-backend
```

## 开发说明

### 添加新功能
1. 在`models/`目录下创建数据模型
2. 在`routes/`目录下添加路由
3. 在`client/src/pages/`目录下创建页面组件
4. 在`client/src/services/`目录下添加API服务

### 代码规范
- 使用ESLint进行代码检查
- 遵循TypeScript类型定义
- 使用Prettier格式化代码

## 许可证

MIT License

## 联系方式

如有问题，请联系开发团队。 