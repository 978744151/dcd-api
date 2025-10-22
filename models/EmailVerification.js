const mongoose = require('mongoose');

const emailVerificationSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  code: {
    type: String,
    required: true,
    length: 6
  },
  type: {
    type: String,
    enum: ['login', 'register', 'reset_password'],
    default: 'login'
  },
  isUsed: {
    type: Boolean,
    default: false
  },
  expiresAt: {
    type: Date,
    required: true,
    default: () => new Date(Date.now() + 10 * 60 * 1000) // 10分钟后过期
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// 创建索引，自动删除过期的验证码
emailVerificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// 创建复合索引，提高查询效率
emailVerificationSchema.index({ email: 1, code: 1, type: 1 });

module.exports = mongoose.model('EmailVerification', emailVerificationSchema);