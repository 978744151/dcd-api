const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  // 举报目标类型
  targetType: {
    type: String,
    enum: ['blog', 'comment', 'user', 'mall', 'brand', 'brandStore'],
    required: true
  },
  // 举报目标ID（通用 ObjectId，不绑定具体 ref）
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },
  blogId: {
    type: String,
    required: false
  },
  // 举报原因类型
  reasonType: {
    type: String,
    enum: ['spam', 'porn', 'illegal', 'abuse', 'plagiarism', 'fraud', 'privacy', 'other'],
    required: true
  },
  // 举报原因类型中文描述
  reasonTypeStr: {
    type: String
  },
  // 详细说明
  description: {
    type: String
  },
  // 联系方式（邮箱/电话/IM）
  contact: {
    type: String
  },
  // 证据图片URL列表
  evidenceImages: [{
    type: String
  }],
  // 举报状态
  status: {
    type: String,
    enum: ['pending', 'reviewing', 'resolved', 'rejected'],
    default: 'pending',
    index: true
  },
  // 举报人IP（匿名也能记录）
  reporterIp: {
    type: String
  },
  // 处理信息（可选）
  handledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  handledAt: {
    type: Date
  },
  handleResult: {
    type: String
  }
}, {
  timestamps: true
});

// 复合索引：同一目标的举报类型快速查询
reportSchema.index({ targetType: 1, targetId: 1, status: 1 });

module.exports = mongoose.model('Report', reportSchema);