const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  // 接收通知的用户
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // 触发通知的用户
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // 通知类型
  type: {
    type: String,
    enum: ['comment', 'reply', 'like', 'follow', 'system'],
    required: true
  },
  // 通知标题
  title: {
    type: String,
    required: true,
    maxlength: 100
  },
  // 通知内容
  content: {
    type: String,
    required: true,
    maxlength: 500
  },
  // 相关的博客（如果是评论、点赞等）
  relatedBlog: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'blogs'
  },
  // 相关的评论（如果是回复评论）
  relatedComment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment'
  },
  // 是否已读
  isRead: {
    type: Boolean,
    default: false
  },
  // 已读时间
  readAt: {
    type: Date
  },
  // 通知优先级
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  // 通知创建时间
  createdAt: {
    type: Date,
    default: Date.now
  },
  // 通知过期时间（可选，用于自动清理旧通知）
  expiresAt: {
    type: Date
  }
}, {
  timestamps: true
});

// 创建接收者索引，便于查询用户的通知
notificationSchema.index({ recipient: 1, createdAt: -1 });

// 创建未读通知索引
notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

// 创建通知类型索引
notificationSchema.index({ recipient: 1, type: 1, createdAt: -1 });

// 创建发送者索引
notificationSchema.index({ sender: 1, createdAt: -1 });

// 自动删除过期通知
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Notification', notificationSchema);