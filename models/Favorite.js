const mongoose = require('mongoose');

const favoriteSchema = new mongoose.Schema({
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
  // 收藏时的博客标题（防止博客标题修改后收藏记录丢失原标题）
  blogTitle: {
    type: String,
    required: true
  },
  // 收藏分类/标签
  category: {
    type: String,
    default: '默认收藏'
  },
  // 个人备注
  note: {
    type: String,
    maxlength: 500
  },
  // 收藏时间
  favoriteAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// 创建复合索引，确保用户-博客组合的唯一性（同一用户不能重复收藏同一博客）
favoriteSchema.index({ user: 1, blog: 1 }, { unique: true });

// 创建时间索引，便于按收藏时间排序
favoriteSchema.index({ favoriteAt: -1 });

// 创建用户索引，便于查询用户的收藏列表
favoriteSchema.index({ user: 1, favoriteAt: -1 });

// 创建分类索引，便于按分类查询收藏
favoriteSchema.index({ user: 1, category: 1, favoriteAt: -1 });

module.exports = mongoose.model('Favorite', favoriteSchema);