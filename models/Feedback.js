const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
    // 反馈用户
    user: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: true
    },
    // 反馈类型
    type: {
        type: String,
        enum: ['bug', 'feature', 'improvement', 'complaint', 'other', 'question'],
        required: true
    },
    // 反馈标题
    title: {
        type: String,
        required: false,
        trim: true,
        maxlength: 100
    },
    // 反馈内容
    content: {
        type: String,
        required: true,
        trim: true,
        maxlength: 1000
    },
    // 联系方式
    contact: {
        type: String,
        trim: true
    },
    // 优先级
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'urgent'],
        default: 'medium'
    },
    // 状态
    status: {
        type: String,
        enum: ['pending', 'processing', 'resolved', 'closed'],
        default: 'pending'
    },
    // 管理员回复
    adminReply: {
        type: String,
        trim: true
    },
    // 回复时间
    repliedAt: {
        type: Date
    },
    // 回复管理员
    repliedBy: {
        type: mongoose.Schema.ObjectId,
        ref: 'User'
    },
    // 附件
    attachments: [{
        filename: String,
        originalName: String,
        path: String,
        size: Number,
        mimetype: String
    }],
    // 相关页面/功能
    relatedPage: {
        type: String,
        trim: true
    },
    // 浏览器信息
    browserInfo: {
        userAgent: String,
        platform: String,
        language: String
    },
    // 是否已读
    isRead: {
        type: Boolean,
        default: false
    },
    // 评分 (用户对处理结果的满意度)
    rating: {
        type: Number,
        min: 1,
        max: 5
    }
}, {
    timestamps: true
});

// 索引
feedbackSchema.index({ user: 1 });
feedbackSchema.index({ type: 1 });
feedbackSchema.index({ status: 1 });
feedbackSchema.index({ priority: 1 });
feedbackSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Feedback', feedbackSchema);