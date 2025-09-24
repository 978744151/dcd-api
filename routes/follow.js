const Router = require('koa-router');
const jwt = require('koa-jwt');
const Joi = require('joi');
const User = require('../models/User');

// JWT中间件
const auth = jwt({ secret: process.env.JWT_SECRET });

const router = new Router({
    prefix: '/api/follow'
});

// 关注用户
router.post('/follow', auth, async (ctx) => {
    try {
        const { error, value } = Joi.object({
            userId: Joi.string().required()
        }).validate(ctx.request.body);

        if (error) {
            ctx.status = 400;
            ctx.body = {
                success: false,
                message: error.details[0].message
            };
            return;
        }

        const { userId } = value;

        // 不能关注自己
        if (userId === ctx.state.user.userId) {
            ctx.status = 400;
            ctx.body = {
                success: false,
                message: '不能关注自己'
            };
            return;
        }

        // 查找要关注的用户
        const userToFollow = await User.findById(userId);
        if (!userToFollow) {
            ctx.status = 400;
            ctx.body = {
                success: false,
                message: '用户不存在'
            };
            return;
        }

        // 检查是否已经关注
        const currentUser = await User.findById(ctx.state.user.userId);
        if (currentUser.following.includes(userId)) {
            ctx.status = 400;
            ctx.body = {
                success: false,
                message: '已经关注该用户'
            };
            return;
        }

        // 添加关注关系
        await User.findByIdAndUpdate(ctx.state.user.userId, {
            $push: { following: userId }
        });
        await User.findByIdAndUpdate(userId, {
            $push: { followers: ctx.state.user.userId }
        });

        ctx.status = 200;
        ctx.body = {
            success: true,
            message: '关注成功'
        };
    } catch (error) {
        ctx.status = 500;
        ctx.body = {
            success: false,
            message: '关注失败',
            error: error.message
        };
    }
});

// 取消关注
router.post('/unfollow', auth, async (ctx) => {
    try {
        const { error, value } = Joi.object({
            userId: Joi.string().required()
        }).validate(ctx.request.body);

        if (error) {
            ctx.status = 400;
            ctx.body = {
                success: false,
                message: error.details[0].message
            };
            return;
        }

        const { userId } = value;

        // 查找要取消关注的用户
        const userToUnfollow = await User.findById(userId);
        if (!userToUnfollow) {
            ctx.status = 400;
            ctx.body = {
                success: false,
                message: '用户不存在'
            };
            return;
        }

        // 检查是否已经关注
        const currentUser = await User.findById(ctx.state.user.userId);
        if (!currentUser.following.includes(userId)) {
            ctx.status = 400;
            ctx.body = {
                success: false,
                message: '未关注该用户'
            };
            return;
        }

        // 移除关注关系
        await User.findByIdAndUpdate(ctx.state.user.userId, {
            $pull: { following: userId }
        });
        await User.findByIdAndUpdate(userId, {
            $pull: { followers: ctx.state.user.userId }
        });

        ctx.status = 200;
        ctx.body = {
            success: true,
            message: '取消关注成功'
        };
    } catch (error) {
        ctx.status = 500;
        ctx.body = {
            success: false,
            message: '取消关注失败',
            error: error.message
        };
    }
});

// 获取用户关注信息
router.get('/info/:userId?', async (ctx) => {
    try {
        const userId = ctx.params.userId || (ctx.state.user ? ctx.state.user.userId : null);

        if (!userId) {
            ctx.status = 400;
            ctx.body = {
                success: false,
                message: '用户ID不能为空'
            };
            return;
        }

        const user = await User.findById(userId)
            .populate('following', 'username avatar')
            .populate('followers', 'username avatar');

        if (!user) {
            ctx.status = 404;
            ctx.body = {
                success: false,
                message: '用户不存在'
            };
            return;
        }

        ctx.status = 200;
        ctx.body = {
            success: true,
            data: {
                followingCount: user.following.length,
                followersCount: user.followers.length,
                following: user.following,
                followers: user.followers,
                isFollowing: ctx.state.user ? user.followers.some(follower => follower._id.toString() === ctx.state.user.userId) : false
            }
        };
    } catch (error) {
        ctx.status = 500;
        ctx.body = {
            success: false,
            message: '获取关注信息失败',
            error: error.message
        };
    }
});

// 检查是否关注
router.get('/status', async (ctx) => {
    try {
        const { error, value } = Joi.object({
            userId: Joi.string().required(),
            followId: Joi.string().required()
        }).validate(ctx.query);

        if (error) {
            ctx.status = 400;
            ctx.body = {
                success: false,
                message: error.details[0].message
            };
            return;
        }

        const { userId, followId } = value;

        // 查找用户的关注列表
        const user = await User.findById(userId);
        if (!user) {
            ctx.status = 400;
            ctx.body = {
                success: false,
                message: '用户不存在'
            };
            return;
        }

        // 检查是否关注
        const isFollowing = user.following.includes(followId);

        ctx.status = 200;
        ctx.body = {
            success: true,
            data: {
                isFollowing
            }
        };
    } catch (error) {
        ctx.status = 500;
        ctx.body = {
            success: false,
            message: '检查关注状态失败',
            error: error.message
        };
    }
});

module.exports = router;