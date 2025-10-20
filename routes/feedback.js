const Router = require('koa-router');
const jwt = require('koa-jwt');
const Feedback = require('../models/Feedback');
const User = require('../models/User');
const Joi = require('joi');
const mongoose = require('mongoose');

const router = new Router({
  prefix: '/api/feedback'
});

// JWT认证中间件
const auth = jwt({ secret: process.env.JWT_SECRET });

// 管理员权限检查
const requireAdmin = async (ctx, next) => {
  const user = await User.findById(ctx.state.user.userId);
  if (!user || user.role !== 'admin') {
    ctx.status = 403;
    ctx.body = {
      success: false,
      message: '需要管理员权限'
    };
    return;
  }
  await next();
};

// 创建反馈
router.post('/', auth, async (ctx) => {
  try {
    const { error, value } = Joi.object({
      type: Joi.string().valid('bug', 'feature', 'improvement', 'complaint', 'other', 'question').required(),
      title: Joi.string().max(100),
      content: Joi.string().max(1000).required(),
      contact: Joi.string().allow('', null),
      priority: Joi.string().valid('low', 'medium', 'high', 'urgent').default('medium'),
      relatedPage: Joi.string().allow('', null),
      browserInfo: Joi.object({
        userAgent: Joi.string(),
        platform: Joi.string(),
        language: Joi.string()
      }).allow(null)
    }).validate(ctx.request.body);

    if (error) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: error.details[0].message
      };
      return;
    }

    const feedback = new Feedback({
      ...value,
      user: ctx.state.user.userId
    });

    await feedback.save();
    await feedback.populate('user', 'username email');

    ctx.body = {
      success: true,
      message: '反馈提交成功',
      data: feedback
    };
  } catch (error) {
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '提交反馈失败',
      error: error.message
    };
  }
});

// 获取用户自己的反馈列表
router.get('/my', auth, async (ctx) => {
  try {
    const { page = 1, limit = 10, type, status } = ctx.query;
    const skip = (page - 1) * limit;

    const query = { user: ctx.state.user.id };
    if (type) query.type = type;
    if (status) query.status = status;

    const feedbacks = await Feedback.find(query)
      .populate('user', 'username email')
      .populate('repliedBy', 'username')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Feedback.countDocuments(query);

    ctx.body = {
      success: true,
      data: {
        feedbacks,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    };
  } catch (error) {
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '获取反馈列表失败',
      error: error.message
    };
  }
});

// 获取所有反馈列表 (管理员)
router.get('/', auth, requireAdmin, async (ctx) => {
  try {
    const { page = 1, limit = 10, type, status, priority, isRead } = ctx.query;
    const skip = (page - 1) * limit;

    const query = {};
    if (type) query.type = type;
    // if (status) query.status = status;
    if (priority) query.priority = priority;
    console.log(isRead);
    if (isRead) query.isRead = isRead === 'true';

    const feedbacks = await Feedback.find(query)
      .populate('user', 'username email')
      .populate('repliedBy', 'username')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Feedback.countDocuments(query);

    // 统计信息
    const stats = await Feedback.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    ctx.body = {
      success: true,
      data: {
        feedbacks,
        stats,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    };
  } catch (error) {
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '获取反馈列表失败',
      error: error.message
    };
  }
});

// 获取单个反馈详情
router.get('/:id', auth, async (ctx) => {
  try {
    const feedback = await Feedback.findById(ctx.params.id)
      .populate('user', 'username email avatar')
      .populate('repliedBy', 'username');

    if (!feedback) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: '反馈不存在'
      };
      return;
    }

    // 检查权限：用户只能查看自己的反馈，管理员可以查看所有
    const user = await User.findById(ctx.state.user.id);
    if (user.role !== 'admin' && feedback.user._id.toString() !== ctx.state.user.id) {
      ctx.status = 403;
      ctx.body = {
        success: false,
        message: '无权访问此反馈'
      };
      return;
    }

    ctx.body = {
      success: true,
      data: feedback
    };
  } catch (error) {
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '获取反馈详情失败',
      error: error.message
    };
  }
});

// 更新反馈状态 (管理员)
router.put('/:id/status', auth, requireAdmin, async (ctx) => {
  try {
    const { error, value } = Joi.object({
      status: Joi.string().valid('pending', 'processing', 'resolved', 'closed').required()
    }).validate(ctx.request.body);

    if (error) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: error.details[0].message
      };
      return;
    }

    const feedback = await Feedback.findByIdAndUpdate(
      ctx.params.id,
      {
        status: value.status,
        isRead: true
      },
      { new: true, runValidators: true }
    ).populate('user', 'username email');

    if (!feedback) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: '反馈不存在'
      };
      return;
    }

    ctx.body = {
      success: true,
      message: '状态更新成功',
      data: feedback
    };
  } catch (error) {
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '更新状态失败',
      error: error.message
    };
  }
});

// 管理员回复反馈
router.put('/:id/reply', auth, requireAdmin, async (ctx) => {
  try {
    const { error, value } = Joi.object({
      adminReply: Joi.string().required(),
      status: Joi.string().valid('pending', 'processing', 'resolved', 'closed').default('resolved')
    }).validate(ctx.request.body);

    if (error) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: error.details[0].message
      };
      return;
    }

    const feedback = await Feedback.findByIdAndUpdate(
      ctx.params.id,
      {
        adminReply: value.adminReply,
        status: value.status,
        repliedAt: new Date(),
        repliedBy: ctx.state.user.id,
        isRead: true
      },
      { new: true, runValidators: true }
    ).populate('user', 'username email')
      .populate('repliedBy', 'username');

    if (!feedback) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: '反馈不存在'
      };
      return;
    }

    ctx.body = {
      success: true,
      message: '回复成功',
      data: feedback
    };
  } catch (error) {
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '回复失败',
      error: error.message
    };
  }
});

// 用户评分反馈处理结果
router.put('/:id/rating', auth, async (ctx) => {
  try {
    const { error, value } = Joi.object({
      rating: Joi.number().min(1).max(5).required()
    }).validate(ctx.request.body);

    if (error) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: error.details[0].message
      };
      return;
    }

    const feedback = await Feedback.findById(ctx.params.id);

    if (!feedback) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: '反馈不存在'
      };
      return;
    }

    // 检查权限：只有反馈的创建者可以评分
    if (feedback.user.toString() !== ctx.state.user.id) {
      ctx.status = 403;
      ctx.body = {
        success: false,
        message: '无权对此反馈评分'
      };
      return;
    }

    feedback.rating = value.rating;
    await feedback.save();

    ctx.body = {
      success: true,
      message: '评分成功',
      data: feedback
    };
  } catch (error) {
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '评分失败',
      error: error.message
    };
  }
});

// 删除反馈 (管理员)
router.delete('/:id', auth, requireAdmin, async (ctx) => {
  try {
    const feedback = await Feedback.findByIdAndDelete(ctx.params.id);

    if (!feedback) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: '反馈不存在'
      };
      return;
    }

    ctx.body = {
      success: true,
      message: '反馈删除成功'
    };
  } catch (error) {
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '删除反馈失败',
      error: error.message
    };
  }
});

// 批量标记为已读 (管理员)
router.put('/batch/read', auth, requireAdmin, async (ctx) => {
  try {
    const { error, value } = Joi.object({
      ids: Joi.array().items(Joi.string()).required()
    }).validate(ctx.request.body);

    if (error) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: error.details[0].message
      };
      return;
    }

    await Feedback.updateMany(
      { _id: { $in: value.ids } },
      { isRead: true }
    );

    ctx.body = {
      success: true,
      message: '批量标记已读成功'
    };
  } catch (error) {
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '批量标记已读失败',
      error: error.message
    };
  }
});

module.exports = router;