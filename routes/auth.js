const Router = require('koa-router');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const EmailVerification = require('../models/EmailVerification');
const Joi = require('joi');
const nodemailer = require('nodemailer');

const router = new Router({
  prefix: '/api/auth'
});

// 发送邮箱验证码
router.post('/send-code', async (ctx) => {
  try {
    // 验证请求数据
    const { error, value } = sendCodeSchema.validate(ctx.request.body);
    if (error) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: error.details[0].message
      };
      return;
    }

    const { email, type } = value;

    // 检查邮箱发送频率限制（1分钟内只能发送一次）
    const recentCode = await EmailVerification.findOne({
      email,
      type,
      createdAt: { $gte: new Date(Date.now() - 60000) } // 1分钟内
    });

    if (recentCode) {
      ctx.status = 429;
      ctx.body = {
        success: false,
        message: '验证码发送过于频繁，请稍后再试'
      };
      return;
    }

    // 生成验证码
    const code = generateVerificationCode();

    // 保存验证码到数据库
    const verification = new EmailVerification({
      email,
      code,
      type,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10分钟后过期
    });
    await verification.save();

    // 发送邮件
    try {
      await sendVerificationEmail(email, code, type);
      ctx.body = {
        success: true,
        message: '验证码已发送到您的邮箱'
      };
    } catch (emailError) {
      console.error('邮件发送失败:', emailError);
      // 删除已保存的验证码记录
      await EmailVerification.deleteOne({ _id: verification._id });
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: '邮件发送失败，请稍后重试'
      };
    }
  } catch (error) {
    console.error('发送验证码错误:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '服务器内部错误'
    };
  }
});

// 邮箱验证码登录
router.post('/email-login', async (ctx) => {
  try {
    // 验证请求数据
    const { error, value } = emailLoginSchema.validate(ctx.request.body);
    if (error) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: error.details[0].message
      };
      return;
    }

    const { email, code } = value;

    // 查找有效的验证码
    const verification = await EmailVerification.findOne({
      email,
      code,
      type: 'login',
      isUsed: false,
      expiresAt: { $gt: new Date() }
    });

    if (!verification) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '验证码无效或已过期'
      };
      return;
    }

    // 查找用户，如果不存在则自动创建
    let user = await User.findOne({ email });
    if (!user) {
      // 自动创建新用户
      const avatarStyles = ['adventurer', 'avataaars', 'big-ears', 'big-smile', 'glass', 'notionists-neutral', 'bottts', 'croodles', 'micah', 'miniavs', 'open-peeps', 'personas', 'pixel-art', 'fun-emoji', 'pixel-art-neutral'];
      const randomStyle = avatarStyles[Math.floor(Math.random() * avatarStyles.length)];
      const avatarUrl = `https://api.dicebear.com/9.x/${randomStyle}/svg`;

      user = new User({
        username: email.split('@')[0], // 使用邮箱前缀作为用户名
        email: email,
        password: 'auto_generated_' + Date.now(), // 自动生成密码
        role: 'user',
        avatar: avatarUrl,
        isActive: true
      });

      await user.save();
      console.log('自动创建新用户:', email);
    }

    // 检查用户状态
    if (!user.isActive) {
      ctx.status = 403;
      ctx.body = {
        success: false,
        message: '账户已被禁用'
      };
      return;
    }

    // 标记验证码为已使用
    verification.isUsed = true;
    await verification.save();

    // 更新用户最后登录时间
    user.lastLoginAt = new Date();
    await user.save();

    // 生成JWT令牌
    const token = jwt.sign(
      {
        userId: user._id,
        email: user.email,
        role: user.role
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    ctx.body = {
      success: true,
      message: '登录成功',
      data: {
        token,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
          avatar: user.avatar,
          createdAt: user.createdAt
        }
      }
    };
  } catch (error) {
    console.error('邮箱验证码登录错误:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '服务器内部错误'
    };
  }
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

// 邮箱验证码发送验证规则
const sendCodeSchema = Joi.object({
  email: Joi.string().email().required(),
  type: Joi.string().valid('login', 'register', 'reset_password').default('login')
});

// 邮箱验证码登录验证规则
const emailLoginSchema = Joi.object({
  email: Joi.string().email().required(),
  code: Joi.string().length(6).required()
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

// 配置邮件发送器
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.qq.com',
  port: process.env.SMTP_PORT || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// 生成6位数字验证码
const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// 发送验证码邮件
const sendVerificationEmail = async (email, code, type = 'login') => {
  const typeMap = {
    login: '登录',
    register: '注册',
    reset_password: '重置密码'
  };

  const mailOptions = {
    from: process.env.SMTP_USER,
    to: email,
    subject: `懂商帝 - ${typeMap[type]}验证码`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #007AFF;">懂商帝验证码</h2>
        <p>您好！</p>
        <p>您正在进行${typeMap[type]}操作，验证码为：</p>
        <div style="background-color: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0;">
          <span style="font-size: 24px; font-weight: bold; color: #007AFF; letter-spacing: 5px;">${code}</span>
        </div>
        <p>验证码有效期为10分钟，请及时使用。</p>
        <p>如果这不是您的操作，请忽略此邮件。</p>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        <p style="color: #999; font-size: 12px;">此邮件由系统自动发送，请勿回复。</p>
      </div>
    `
  };

  return transporter.sendMail(mailOptions);
};
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

    // 检查邮箱是否已存在
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '邮箱已存在'
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
      { userId: user._id, email: user.email, role: user.role, id: user._id },
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
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '邮箱或密码错误'
      };
      return;
    }

    // 验证密码
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '邮箱或密码错误'
      };
      return;
    }

    // 检查用户状态
    if (!user.isActive) {
      ctx.status = 400;
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
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '未提供认证令牌'
      };
      return;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');

    if (!user) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '用户不存在'
      };
      return;
    }

    // 统计关注者和关注数量
    const followersCount = user.followers ? user.followers.length : 0;
    const followingCount = user.following ? user.following.length : 0;

    // 更新用户模型中的计数字段（如果不一致的话）
    if (user.followersCount !== followersCount || user.followingCount !== followingCount) {
      await User.findByIdAndUpdate(decoded.userId, {
        followersCount,
        followingCount
      });
    }

    ctx.body = {
      success: true,
      data: {
        user: {
          ...user.toObject(),
          followersCount,
          followingCount
        }
      }
    };
  } catch (error) {
    ctx.status = 400;
    ctx.body = {
      success: false,
      message: '无效的认证令牌'
    };
  }
});

module.exports = router;