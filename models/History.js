const mongoose = require('mongoose');

const historySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  blog: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Blog',
    required: true
  },
  visitedAt: {
    type: Date,
    default: Date.now
  },
  // 访问时长（秒）
  duration: {
    type: Number,
    default: 0
  },
  // 访问来源
  source: {
    type: String,
    enum: ['direct', 'search', 'recommendation', 'share'],
    default: 'direct'
  }
}, {
  timestamps: true
});

// 创建复合索引，确保用户-博客组合的唯一性（同一用户对同一博客只保留最新的访问记录）
historySchema.index({ user: 1, blog: 1 }, { unique: true });

// 创建时间索引，便于按时间排序
historySchema.index({ visitedAt: -1 });

// 创建用户索引，便于查询用户的历史记录
historySchema.index({ user: 1, visitedAt: -1 });

module.exports = mongoose.model('History', historySchema);