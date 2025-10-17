const Router = require('koa-router');
const jwt = require('koa-jwt');
const Joi = require('joi');
const Notification = require('../models/Notification');

const router = new Router({ prefix: '/api/notifications' });

// JWT 中间件
const requireAuth = jwt({ secret: process.env.JWT_SECRET });

// 获取用户的通知列表
router.get('/', requireAuth, async (ctx) => {
    try {
        const { page = 1, limit = 20, type, isRead } = ctx.query;
        const userId = ctx.state.user.id || ctx.state.user.userId;
        const skip = (page - 1) * limit;

        // 构建查询条件
        const query = { recipient: userId };
        if (type && type !== 'all') {
            query.type = type;
        }
        if (isRead !== undefined) {
            query.isRead = isRead === 'true';
        }

        const notifications = await Notification.find(query)
            .populate('sender', 'username avatar')
            .populate('relatedBlog', 'title')
            .populate('relatedComment', 'content')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Notification.countDocuments(query);
        const unreadCount = await Notification.countDocuments({
            recipient: userId,
            isRead: false
        });

        ctx.body = {
            success: true,
            data: {
                notifications,
                unreadCount,
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
            message: '获取通知列表失败',
            error: error.message
        };
    }
});

// 获取未读通知数量
router.get('/unread-count', requireAuth, async (ctx) => {
    try {
        const userId = ctx.state.user.id || ctx.state.user.userId;
        const unreadCount = await Notification.countDocuments({
            recipient: userId,
            isRead: false
        });

        ctx.body = {
            success: true,
            data: { unreadCount }
        };
    } catch (error) {
        ctx.status = 500;
        ctx.body = {
            success: false,
            message: '获取未读通知数量失败',
            error: error.message
        };
    }
});

// 标记单个通知为已读
router.post('/read/:id', requireAuth, async (ctx) => {
    console.log(ctx)
    try {
        const { id } = ctx.params;
        const userId = ctx.state.user.userId;

        const notification = await Notification.findOneAndUpdate(
            { _id: id, recipient: userId },
            {
                isRead: true,
                readAt: new Date()
            },
            { new: true }
        );

        if (!notification) {
            ctx.status = 404;
            ctx.body = {
                success: false,
                message: '通知不存在或无权限访问'
            };
            return;
        }

        ctx.body = {
            success: true,
            message: '通知已标记为已读',
            data: notification
        };
    } catch (error) {
        console.log('标记通知已读失败', error);
        ctx.status = 500;
        ctx.body = {
            success: false,
            message: '标记通知已读失败',
            error: error.message
        };
    }
});

// 标记所有通知为已读
router.post('/read-all', requireAuth, async (ctx) => {
    try {
        const userId = ctx.state.user.userId;
        const { type } = ctx.request.body;

        // 构建查询条件
        const query = { recipient: userId, isRead: false };
        if (type && type !== 'all') {
            query.type = type;
        }

        const result = await Notification.updateMany(
            query,
            {
                isRead: true,
                readAt: new Date()
            }
        );

        ctx.body = {
            success: true,
            message: `已标记 ${result.modifiedCount} 条通知为已读`
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

// 删除单个通知
router.delete('/:id', requireAuth, async (ctx) => {
    try {
        const { id } = ctx.params;
        const userId = ctx.state.user.id || ctx.state.user.userId;

        const notification = await Notification.findOneAndDelete({
            _id: id,
            recipient: userId
        });

        if (!notification) {
            ctx.status = 404;
            ctx.body = {
                success: false,
                message: '通知不存在或无权限删除'
            };
            return;
        }

        ctx.body = {
            success: true,
            message: '通知已删除'
        };
    } catch (error) {
        ctx.status = 500;
        ctx.body = {
            success: false,
            message: '删除通知失败',
            error: error.message
        };
    }
});

// 批量删除通知
router.delete('/', requireAuth, async (ctx) => {
    try {
        const userId = ctx.state.user.id || ctx.state.user.userId;
        const { ids, type, deleteRead } = ctx.request.body;

        let query = { recipient: userId };

        if (ids && Array.isArray(ids)) {
            // 删除指定ID的通知
            query._id = { $in: ids };
        } else {
            // 根据条件批量删除
            if (type && type !== 'all') {
                query.type = type;
            }
            if (deleteRead === true) {
                query.isRead = true;
            }
        }

        const result = await Notification.deleteMany(query);

        ctx.body = {
            success: true,
            message: `已删除 ${result.deletedCount} 条通知`
        };
    } catch (error) {
        ctx.status = 500;
        ctx.body = {
            success: false,
            message: '批量删除通知失败',
            error: error.message
        };
    }
});

// 获取通知统计信息
router.get('/stats', requireAuth, async (ctx) => {
    try {
        const userId = ctx.state.user.id || ctx.state.user.userId;

        const stats = await Notification.aggregate([
            { $match: { recipient: userId } },
            {
                $group: {
                    _id: '$type',
                    total: { $sum: 1 },
                    unread: {
                        $sum: {
                            $cond: [{ $eq: ['$isRead', false] }, 1, 0]
                        }
                    }
                }
            }
        ]);

        const totalStats = {
            total: 0,
            unread: 0,
            byType: {}
        };

        stats.forEach(stat => {
            totalStats.total += stat.total;
            totalStats.unread += stat.unread;
            totalStats.byType[stat._id] = {
                total: stat.total,
                unread: stat.unread
            };
        });

        ctx.body = {
            success: true,
            data: totalStats
        };
    } catch (error) {
        ctx.status = 500;
        ctx.body = {
            success: false,
            message: '获取通知统计失败',
            error: error.message
        };
    }
});

module.exports = router;