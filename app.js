const Koa = require('koa');
const Router = require('koa-router');
const bodyParser = require('koa-bodyparser');
const cors = require('koa-cors');
const serve = require('koa-static');
const mount = require('koa-mount');
const session = require('koa-session');
// 启用 Gzip 压缩
const compress = require('koa-compress')

const path = require('path');
require('dotenv').config({ path: './config.env' });

const app = new Koa();
const router = new Router();

// 根据环境变量设置配置
const isProduction = process.env.NODE_ENV === 'production';
const PORT = isProduction ? process.env.PROD_PORT : process.env.DEV_PORT;
const HOST = isProduction ? process.env.PROD_HOST : process.env.DEV_HOST;
const MONGODB_URI = isProduction ? process.env.PROD_MONGODB_URI : process.env.DEV_MONGODB_URI;

// 更新环境变量以供其他模块使用
process.env.PORT = PORT;
process.env.HOST = HOST;
process.env.MONGODB_URI = MONGODB_URI;

console.log(`🚀 启动模式: ${isProduction ? '生产环境' : '开发环境'}`);
console.log(`📡 服务器地址: ${HOST}`);
console.log(`🗄️  数据库: ${MONGODB_URI}`);

// 数据库连接
const connectDB = require('./config/database');
connectDB();
app.use(compress())
app.use(async (ctx, next) => {
  if (ctx.path.startsWith('/api/')) {
    ctx.set('Cache-Control', 'public, max-age=300') // 5分钟缓存
  }
  await next()
})
// 中间件配置
// 中间件配置
app.use(cors({
  origin: function (ctx) {
    // 允许所有域名访问
    return '*';

    // 或者指定特定域名（推荐生产环境使用）
    // const allowedOrigins = [
    //   'http://localhost:5002',
    //   'http://localhost:5173',
    //   'http://localhost:8080',
    //   'https://yourdomain.com'
    // ];
    // const origin = ctx.header.origin;
    // return allowedOrigins.includes(origin) ? origin : false;
  },
  credentials: true, // 允许携带凭证（cookies、authorization headers等）
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'], // 允许的HTTP方法
  allowHeaders: [
    'Content-Type',
    'Authorization',
    'Accept',
    'X-Requested-With',
    'Cache-Control',
    'Access-Control-Allow-Credentials'
  ], // 允许的请求头
  exposeHeaders: ['Authorization'], // 暴露给客户端的响应头
  maxAge: 86400 // 预检请求的缓存时间（秒）
}));
app.use(bodyParser());
app.use(serve(path.join(__dirname, 'public')));

// 使用 koa-mount 挂载 uploads 目录
app.use(mount('/uploads', serve(path.join(__dirname, 'uploads'))));

// 会话配置
app.keys = [process.env.SESSION_SECRET || 'default-secret'];
app.use(session({
  key: 'koa.sess',
  maxAge: 86400000,
  autoCommit: true,
  overwrite: true,
  httpOnly: true,
  signed: true,
  rolling: false,
  renew: false,
}, app));

// 错误处理中间件
app.use(async (ctx, next) => {
  try {
    await next();
  } catch (err) {
    ctx.status = err.status || 500;
    ctx.body = {
      success: false,
      message: err.message || '服务器内部错误',
      error: process.env.NODE_ENV === 'development' ? err.stack : {}
    };
    ctx.app.emit('error', err, ctx);
  }
});

// 路由配置
const authRoutes = require('./routes/auth');
const mapRoutes = require('./routes/map');
const adminRoutes = require('./routes/admin');
const mallRoutes = require('./routes/mall');
const uploadRoutes = require('./routes/upload');

app.use(authRoutes.routes()).use(authRoutes.allowedMethods());
app.use(mapRoutes.routes()).use(mapRoutes.allowedMethods());
app.use(adminRoutes.routes()).use(adminRoutes.allowedMethods());
app.use(mallRoutes.routes()).use(mallRoutes.allowedMethods());
app.use(uploadRoutes.routes()).use(uploadRoutes.allowedMethods());

// 生产环境下静态托管前端构建产物，并提供 SPA 回退
// const distDir = path.join(__dirname, 'client', 'dist');
// app.use(serve(distDir));

// router.get(/^(?!\/api).*/, async (ctx, next) => {
//   // 仅对非 /api 开头的请求返回前端 index.html
//   if (ctx.method !== 'GET') return next();
//   try {
//     ctx.type = 'html';
//     ctx.body = require('fs').createReadStream(path.join(distDir, 'index.html'));
//   } catch (e) {
//     // 若前端未构建，返回简单提示
//     ctx.body = 'Frontend not built. Run "cd client && npm run build".';
//   }
// });

app.use(router.routes());
app.use(router.allowedMethods());

// 启动服务器
app.listen(PORT, () => {
  console.log(`🎉 服务器运行在 ${HOST}`);
  console.log(`🌍 环境: ${process.env.NODE_ENV}`);
  if (isProduction) {
    console.log(`🔒 生产环境已启动`);
  } else {
    console.log(`🛠️  开发环境已启动`);
  }
});

module.exports = app;