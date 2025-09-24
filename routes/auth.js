const Router = require('koa-router');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Joi = require('joi');

const router = new Router({
  prefix: '/api/auth'
});

// 注册验证规则
const registerSchema = Joi.object({
  username: Joi.string().min(3).max(30).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  role: Joi.string().valid('admin', 'user').default('user'),
});

// 登录验证规则
const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});
// 生成随机卡通头像
const avatarStyles = ['adventurer', 'avataaars', 'big-ears', 'big-smile', 'glass', 'notionists-neutral', 'bottts', 'croodles', 'micah', 'miniavs', 'open-peeps', 'personas', 'pixel-art', 'fun-emoji', 'pixel-art-neutral'];
const randomStyle = avatarStyles[Math.floor(Math.random() * avatarStyles.length)];
const hair = ['long01', 'long02'
  ,
  'long03'
  ,
  'long04'
  ,
  'long05'
  ,
  'long06'
  ,
  'long07'
  ,
  'long08'
  ,
  'long09'
  ,
  'long10'
  ,
  'long11'
  ,
  'long12'
  ,
  'long13'
  ,
  'long14'
  ,
  'long15'
  ,
  'long16'
  ,
  'long17'
  ,
  'long18'
  ,
  'long19'
  ,
  'long20'
  ,
  'long21'
  ,
  'long22'
  ,
  'long23'
  ,
  'long24'
  ,
  'long25'
  ,
  'long26'
  ,
  'short01'
  ,
  'short02'
  ,
  'short03'
  ,
  'short04'
  ,
  'short05'
  ,
  'short06'
  ,
  'short07'
  ,
  'short08'
  ,
  'short09'
  ,
  'short10'
  ,
  'short11'
  ,
  'short12'
  ,
  'short13'
  ,
  'short14'
  ,
  'short15'
  ,
  'short16'
  ,
  'short17'
  ,
  'short18'
  ,
  'short19'
]
const hairStyle = hair[Math.floor(Math.random() * hair.length)];
console.log('hairStyle', Math.floor(Math.random() * hair.length));
const avatarUrl = `https://api.dicebear.com/9.x/${randomStyle}/svg`;
// 用户注册
router.post('/register', async (ctx) => {
  try {
    const { error, value } = registerSchema.validate(ctx.request.body);
    if (error) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: error.details[0].message
      };
      return;
    }

    const { username, email, password, role } = value;

    // 检查用户是否已存在
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '用户名或邮箱已存在'
      };
      return;
    }

    // 创建新用户
    const user = new User({
      username,
      email,
      password,
      role,
      avatar: avatarUrl // 添加随机头像

    });

    await user.save();

    // 生成JWT token
    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    ctx.body = {
      success: true,
      message: '注册成功',
      data: {
        user: {
          avatar: avatarUrl, // 添加随机头像
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role
        },
        token
      }
    };
  } catch (error) {
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '注册失败',
      error: error.message
    };
  }
});

// 用户登录
router.post('/login', async (ctx) => {
  try {
    const { error, value } = loginSchema.validate(ctx.request.body);
    if (error) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: error.details[0].message
      };
      return;
    }

    const { email, password } = value;

    // 查找用户
    const user = await User.findOne({ email });
    if (!user) {
      ctx.status = 401;
      ctx.body = {
        success: false,
        message: '邮箱或密码错误'
      };
      return;
    }

    // 验证密码
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      ctx.status = 401;
      ctx.body = {
        success: false,
        message: '邮箱或密码错误'
      };
      return;
    }

    // 检查用户状态
    if (!user.isActive) {
      ctx.status = 401;
      ctx.body = {
        success: false,
        message: '账户已被禁用'
      };
      return;
    }

    // 更新最后登录时间
    user.lastLogin = new Date();
    await user.save();

    // 生成JWT token
    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    ctx.body = {
      success: true,
      message: '登录成功',
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
          avatar: user.avatar,
          createdAt: user.createdAt,
        },
        token
      }
    };
  } catch (error) {
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '登录失败',
      error: error.message
    };
  }
});

// 获取当前用户信息
router.get('/me', async (ctx) => {
  try {
    const token = ctx.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      ctx.status = 401;
      ctx.body = {
        success: false,
        message: '未提供认证令牌'
      };
      return;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');

    if (!user) {
      ctx.status = 401;
      ctx.body = {
        success: false,
        message: '用户不存在'
      };
      return;
    }

    ctx.body = {
      success: true,
      data: { user }
    };
  } catch (error) {
    ctx.status = 401;
    ctx.body = {
      success: false,
      message: '无效的认证令牌'
    };
  }
});

module.exports = router; 