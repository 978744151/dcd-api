const Router = require('koa-router');
const Joi = require('joi');
const mongoose = require('mongoose');
const Report = require('../models/Report');
const User = require('../models/User');
const jwt = require('koa-jwt');

const auth = jwt({ secret: process.env.JWT_SECRET });

// 验证管理员权限
const requireAdmin = async (ctx, next) => {
  if (!ctx.state.user || ctx.state.user.role !== 'admin') {
    ctx.status = 403;
    ctx.body = { success: false, message: '需要管理员权限' };
    return;
  }
  await next();
};

const router = new Router({ prefix: '/api/report' });

// 举报类型列表（公开，无需登录）
router.get('/types', async (ctx) => {
  const reasonTypes = [
    { key: 'spam', label: '垃圾信息' },
    { key: 'porn', label: '涉黄' },
    { key: 'illegal', label: '违法违规' },
    { key: 'abuse', label: '辱骂/仇恨' },
    { key: 'plagiarism', label: '抄袭/盗用' },
    { key: 'fraud', label: '诈骗' },
    { key: 'privacy', label: '泄露隐私' },
    { key: 'other', label: '其他' }
  ];
  const targetTypes = [
    { key: 'blog', label: '博客' },
    { key: 'comment', label: '评论' },
    { key: 'user', label: '用户' },
    { key: 'mall', label: '商场' },
    { key: 'brand', label: '品牌' },
    { key: 'brandStore', label: '品牌门店' },
  ];

  ctx.body = {
    success: true,
    data: { reasonTypes, targetTypes }
  };
});

// 提交举报（公开，无需登录）
router.post('/', async (ctx) => {
  try {
    const schema = Joi.object({
      targetType: Joi.string().valid('blog', 'comment', 'user', 'mall', 'brand', 'brandStore').required(),
      targetId: Joi.string().required(),
      reasonType: Joi.string().valid('spam', 'porn', 'illegal', 'abuse', 'plagiarism', 'fraud', 'privacy', 'other').required(),
      description: Joi.string().allow('', null),
      contact: Joi.string().allow('', null),
      evidenceImages: Joi.array().items(Joi.string()).default([]),
      blogId: Joi.string().allow('', null),
    });

    const { error, value } = schema.validate(ctx.request.body);
    if (error) {
      ctx.status = 400;
      ctx.body = { success: false, message: error.details[0].message };
      return;
    }

    if (!mongoose.Types.ObjectId.isValid(value.targetId)) {
      ctx.status = 400;
      ctx.body = { success: false, message: '无效的目标ID' };
      return;
    }


    const report = new Report({
      targetType: value.targetType,
      targetId: new mongoose.Types.ObjectId(value.targetId),
      reasonType: value.reasonType,
      description: value.description,
      contact: value.contact,
      evidenceImages: value.evidenceImages,
      status: 'pending',
      reporterIp: ctx.ip,
      blogId: value.blogId,
    });

    await report.save();

    ctx.body = {
      success: true,
      message: '举报已提交，我们会尽快处理',
      data: { id: report._id }
    };
  } catch (err) {
    ctx.status = 500;
    ctx.body = { success: false, message: '提交举报失败', error: err.message };
  }
});

// 举报列表（可选：无需登录，支持分页、筛选）
router.get('/', async (ctx) => {
  try {
    const { page = 1, limit = 10, status, targetType, reporterIp, startDate, endDate, search } = ctx.query;
    const skip = (Number(page) - 1) * Number(limit);

    // 举报原因类型转译
    const reasonTypeMap = {
      'spam': '垃圾信息',
      'porn': '涉黄',
      'illegal': '违法违规',
      'abuse': '辱骂/仇恨',
      'plagiarism': '抄袭/盗用',
      'fraud': '诈骗',
      'privacy': '泄露隐私',
      'other': '其他'
    };

    const query = {};

    if (status) query.status = status; // pending / reviewing / resolved / rejected
    if (targetType) query.targetType = targetType;
    if (reporterIp) query.reporterIp = reporterIp;

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    if (search) {
      // 按描述和联系方式模糊搜索
      query.$or = [
        { description: { $regex: search, $options: 'i' } },
        { contact: { $regex: search, $options: 'i' } }
      ];
    }

    const sort = { createdAt: -1 };

    const reports = await Report.find(query)
      .sort(sort)
      .skip(skip)
      .limit(Number(limit))
      .lean();

    // 为每个举报记录添加reasonTypeStr转译
    const reportsWithTranslation = reports.map(report => ({
      ...report,
      reasonTypeStr: reasonTypeMap[report.reasonType] || report.reasonType
    }));

    const total = await Report.countDocuments(query);

    ctx.body = {
      success: true,
      data: {
        page: Number(page),
        limit: Number(limit),
        total,
        list: reportsWithTranslation
      }
    };
  } catch (err) {
    ctx.status = 500;
    ctx.body = { success: false, message: '获取举报列表失败', error: err.message };
  }
});

// 更新举报状态（管理员）
router.put('/:id/status', auth, requireAdmin, async (ctx) => {
  try {
    const { id } = ctx.params;
    const schema = Joi.object({
      status: Joi.string().valid('pending', 'resolved').required(),
    });
    const { error, value } = schema.validate(ctx.request.body);
    if (error) {
      ctx.status = 400;
      ctx.body = { success: false, message: error.details[0].message };
      return;
    }
    if (!mongoose.Types.ObjectId.isValid(id)) {
      ctx.status = 400;
      ctx.body = { success: false, message: '无效的举报ID' };
      return;
    }

    const update = { status: value.status };
    if (value.status === 'resolved') {
      update.handledBy = ctx.state.user.userId || ctx.state.user.id;
      update.handledAt = new Date();
    } else {
      update.handledBy = undefined;
      update.handledAt = undefined;
      update.handleResult = undefined;
    }

    const report = await Report.findByIdAndUpdate(id, update, { new: true }).lean();
    if (!report) {
      ctx.status = 404;
      ctx.body = { success: false, message: '举报不存在' };
      return;
    }

    ctx.body = { success: true, message: '状态更新成功', data: report };
  } catch (err) {
    ctx.status = 500;
    ctx.body = { success: false, message: '更新举报状态失败', error: err.message };
  }
});

module.exports = router;