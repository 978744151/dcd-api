const mongoose = require('mongoose');

const blacklistSchema = new mongoose.Schema({
  // 拉黑者（执行拉黑操作的用户）
  blocker: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // 被拉黑者（被拉黑的用户）
  blocked: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // 拉黑时间
  createdAt: {
    type: Date,
    default: Date.now
  },
  // 拉黑原因（可选）
  reason: {
    type: String,
    maxlength: 200
  }
});

// 创建复合索引，确保同一对用户关系的唯一性
blacklistSchema.index({ blocker: 1, blocked: 1 }, { unique: true });

// 创建单独索引以提高查询性能
blacklistSchema.index({ blocker: 1 });
blacklistSchema.index({ blocked: 1 });

// 静态方法：检查用户A是否拉黑了用户B
blacklistSchema.statics.isBlocked = async function(blockerId, blockedId) {
  const blacklist = await this.findOne({
    blocker: blockerId,
    blocked: blockedId
  });
  return !!blacklist;
};

// 静态方法：检查两个用户之间是否存在拉黑关系（任意方向）
blacklistSchema.statics.hasBlacklistRelation = async function(userId1, userId2) {
  const blacklist = await this.findOne({
    $or: [
      { blocker: userId1, blocked: userId2 },
      { blocker: userId2, blocked: userId1 }
    ]
  });
  return !!blacklist;
};

// 静态方法：获取用户的拉黑列表
blacklistSchema.statics.getBlockedUsers = async function(blockerId, options = {}) {
  const { page = 1, limit = 10 } = options;
  const skip = (page - 1) * limit;
  
  const blacklists = await this.find({ blocker: blockerId })
    .populate('blocked', 'username email avatar')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));
    
  const total = await this.countDocuments({ blocker: blockerId });
  
  return {
    blacklists,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit)
    }
  };
};

module.exports = mongoose.model('Blacklist', blacklistSchema);