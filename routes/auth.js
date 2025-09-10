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
  role: Joi.string().valid('admin', 'user').default('user')
});

// 登录验证规则
const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

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
      role
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
          role: user.role
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