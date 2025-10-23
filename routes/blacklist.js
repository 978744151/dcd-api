const Router = require('koa-router');
const User = require('../models/User');
const Blacklist = require('../models/Blacklist');

const router = new Router({
    prefix: '/api/blacklist'
});

// 认证中间件
const authenticateToken = async (ctx, next) => {
    const authHeader = ctx.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        ctx.status = 401;
        ctx.body = { success: false, message: '访问令牌缺失' };
        return;
    }

    try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        ctx.user = decoded;
        await next();
    } catch (error) {
        ctx.status = 403;
        ctx.body = { success: false, message: '无效的访问令牌' };
    }
};

// 拉黑用户
router.post('/:id', authenticateToken, async (ctx) => {
    try {
        const { id: blockedId } = ctx.params;
        const blockerId = ctx.user.userId;
        const { reason } = ctx.request.body;

        // 验证被拉黑用户ID
        if (!blockedId || blockedId === blockerId) {
            ctx.status = 400;
            ctx.body = {
                success: false,
                message: '无效的用户ID或不能拉黑自己'
            };
            return;
        }

        // 检查被拉黑用户是否存在
        const blockedUser = await User.findById(blockedId);
        if (!blockedUser) {
            ctx.status = 404;
            ctx.body = {
                success: false,
                message: '用户不存在'
            };
            return;
        }

        // 检查是否已经拉黑
        const existingBlacklist = await Blacklist.findOne({
            blocker: blockerId,
            blocked: blockedId
        });

        if (existingBlacklist) {
            ctx.status = 400;
            ctx.body = {
                success: false,
                message: '该用户已在黑名单中'
            };
            return;
        }

        // 创建拉黑记录
        const blacklist = new Blacklist({
            blocker: blockerId,
            blocked: blockedId,
            reason: reason || ''
        });

        await blacklist.save();

        ctx.body = {
            success: true,
            message: '用户已添加到黑名单',
            data: {
                blacklistId: blacklist._id,
                blockedUser: {
                    id: blockedUser._id,
                    username: blockedUser.username,
                    email: blockedUser.email
                },
                createdAt: blacklist.createdAt
            }
        };
    } catch (error) {
        ctx.status = 500;
        ctx.body = {
            success: false,
            message: '拉黑用户失败',
            error: error.message
        };
    }
});

// 取消拉黑用户
router.delete('/:id', authenticateToken, async (ctx) => {
    try {
        const { id: blockedId } = ctx.params;
        const blockerId = ctx.user.userId;

        // 验证被取消拉黑用户ID
        if (!blockedId) {
            ctx.status = 400;
            ctx.body = {
                success: false,
                message: '无效的用户ID'
            };
            return;
        }

        // 查找并删除拉黑记录
        const blacklist = await Blacklist.findOneAndDelete({
            blocker: blockerId,
            blocked: blockedId
        });

        if (!blacklist) {
            ctx.status = 404;
            ctx.body = {
                success: false,
                message: '该用户不在黑名单中'
            };
            return;
        }

        ctx.body = {
            success: true,
            message: '已从黑名单中移除用户'
        };
    } catch (error) {
        ctx.status = 500;
        ctx.body = {
            success: false,
            message: '取消拉黑失败',
            error: error.message
        };
    }
});

// 获取黑名单列表
router.get('/', authenticateToken, async (ctx) => {
    try {
        const blockerId = ctx.user.userId;
        const { page = 1, limit = 10 } = ctx.query;

        const result = await Blacklist.getBlockedUsers(blockerId, { page, limit });

        ctx.body = {
            success: true,
            data: {
                blacklists: result.blacklists.map(blacklist => ({
                    id: blacklist._id,
                    blockedUser: blacklist.blocked,
                    reason: blacklist.reason,
                    createdAt: blacklist.createdAt
                })),
                pagination: result.pagination
            }
        };
    } catch (error) {
        ctx.status = 500;
        ctx.body = {
            success: false,
            message: '获取黑名单失败',
            error: error.message
        };
    }
});  

// 检查用户是否被拉黑
router.get('/check/:id', authenticateToken, async (ctx) => {
    try {
        const { id: targetUserId } = ctx.params;
        const currentUserId = ctx.user.userId;

        const isBlocked = await Blacklist.hasBlacklistRelation(currentUserId, targetUserId);

        ctx.body = {
            success: true,
            data: {
                isBlocked,
                message: isBlocked ? '存在拉黑关系' : '无拉黑关系'
            }
        };
    } catch (error) {
        ctx.status = 500;
        ctx.body = {
            success: false,
            message: '检查拉黑状态失败',
            error: error.message
        };
    }
});

module.exports = router;