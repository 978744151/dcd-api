const Router = require('koa-router');
const jwt = require('koa-jwt');
const Joi = require('joi');
const Comment = require('../models/comments');
const Blog = require('../models/blogs');
const User = require('../models/User');

const router = new Router({ prefix: '/api/comment' });

// JWT 中间件
const requireAuth = jwt({ secret: process.env.JWT_SECRET });

// 管理员权限验证
const requireAdmin = async (ctx, next) => {
    if (ctx.user.role !== 'admin') {
        ctx.status = 403;
        ctx.body = { success: false, message: '需要管理员权限' };
        return;
    }
    await next();
};

// 评论作者权限验证
const requireCommentAuthor = async (ctx, next) => {
    try {
        const comment = await Comment.findById(ctx.params.id);
        if (!comment) {
            ctx.status = 404;
            ctx.body = { success: false, message: '评论不存在' };
            return;
        }

        if (comment.user.toString() !== ctx.user._id.toString() && ctx.user.role !== 'admin') {
            ctx.status = 403;
            ctx.body = { success: false, message: '只能删除自己的评论' };
            return;
        }

        ctx.comment = comment;
        await next();
    } catch (error) {
        ctx.status = 500;
        ctx.body = { success: false, message: '服务器错误' };
    }
};

/**
 * @swagger
 * /api/comment:
 *   post:
 *     summary: 创建评论
 *     tags: [comment]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *               - blogId
 *             properties:
 *               content:
 *                 type: string
 *                 description: 评论内容
 *               blogId:
 *                 type: string
 *                 description: 博客ID
 */
router.post('/create', requireAuth, async (ctx) => {
    try {
        const schema = Joi.object({
            content: Joi.string().required().messages({
                'any.required': '评论内容不能为空',
                'string.empty': '评论内容不能为空'
            }),
            blogId: Joi.string().required().messages({
                'any.required': '博客ID不能为空'
            })
        });

        const { error, value } = schema.validate(ctx.request.body);
        if (error) {
            ctx.status = 400;
            ctx.body = { success: false, message: error.details[0].message };
            return;
        }

        const { content, blogId } = value;

        // 检查博客是否存在
        const blog = await Blog.findById(blogId);
        if (!blog) {
            ctx.status = 404;
            ctx.body = { success: false, message: '博客不存在' };
            return;
        }
        const comment = await Comment.create({
            content,
            blog: blogId,
            user: ctx.state.user.userId
        });

        // 填充用户信息
        const populatedComment = await Comment.findById(comment._id)
            .populate({
                path: 'user',
                select: 'name avatar'
            });

        ctx.body = {
            success: true,
            message: '评论创建成功',
            data: populatedComment
        };
    } catch (error) {
        console.error('创建评论失败:', error);
        ctx.status = 500;
        ctx.body = { success: false, message: '服务器错误' };
    }
});

/**
 * @swagger
 * /api/comment/reply:
 *   post:
 *     summary: 回复评论
 *     tags: [comment]
 *     security:
 *       - bearerAuth: []
 */
router.post('/reply', async (ctx) => {
    try {
        const schema = Joi.object({
            content: Joi.string().required().messages({
                'any.required': '回复内容不能为空'
            }),
            commentId: Joi.string().required().messages({
                'any.required': '评论ID不能为空'
            }),
            replyTo: Joi.string().optional()
        });

        const { error, value } = schema.validate(ctx.request.body);
        if (error) {
            ctx.status = 400;
            ctx.body = { success: false, message: error.details[0].message };
            return;
        }

        const { content, commentId, replyTo } = value;

        // 检查要回复的评论是否存在
        const parentComment = await Comment.findById(commentId);
        if (!parentComment) {
            ctx.status = 404;
            ctx.body = { success: false, message: '要回复的评论不存在' };
            return;
        }

        // 获取用户信息
        const [currentUser, replyToUser] = await Promise.all([
            User.findById(ctx.user._id).select('name'),
            User.findById(replyTo || parentComment.user).select('name')
        ]);

        const reply = await Comment.create({
            content,
            user: ctx.user._id,
            blog: parentComment.blog,
            parentId: parentComment.parentId || parentComment._id,
            replyTo: replyTo || parentComment.user,
            fromUserName: currentUser.name,
            toUserName: replyToUser.name
        });

        // 填充用户信息
        const populatedReply = await Comment.findById(reply._id)
            .populate({
                path: 'user',
                select: 'name avatar'
            })
            .populate({
                path: 'replyTo',
                select: 'name avatar'
            });

        ctx.body = {
            success: true,
            message: '回复成功',
            data: populatedReply
        };
    } catch (error) {
        ctx.status = 500;
        ctx.body = { success: false, message: '服务器错误' };
    }
});

/**
 * @swagger
 * /api/comment:
 *   get:
 *     summary: 获取博客评论列表
 *     tags: [comment]
 */
router.get('/', async (ctx) => {
    try {
        console.log('获取博客评论列表');
        const { blogId } = ctx.query;

        // 检查博客是否存在
        const blog = await Blog.findById(blogId);
        if (!blog) {
            ctx.status = 404;
            ctx.body = { success: false, message: '博客不存在' };
            return;
        }

        // 获取顶级评论及其回复
        const comment = await Comment.find({
            blog: blogId,
            parentId: null
        })
            .populate({
                path: 'user',
                select: 'name avatar'
            })
            .populate({
                path: 'replies',
                populate: [
                    {
                        path: 'user',
                        select: 'name avatar'
                    },
                    {
                        path: 'replyTo',
                        select: 'name avatar'
                    }
                ],
                options: { sort: { createdAt: 1 } }
            })
            .sort({ createdAt: -1 });

        // 处理评论数据
        const userId = ctx.user ? ctx.user._id.toString() : null;
        const processedComments = comment.map(comment => {
            const commentObj = comment.toObject();

            // 处理点赞信息
            if (!comment.likes) comment.likes = [];
            commentObj.isLiked = userId ? comment.likes.some(like => like.toString() === userId) : false;
            commentObj.likeCount = comment.likes.length || 0;

            // 处理回复的点赞信息
            if (commentObj.replies) {
                commentObj.replies = commentObj.replies.map(reply => {
                    if (!reply.likes) reply.likes = [];
                    reply.isLiked = userId ? reply.likes.some(like => like.toString() === userId) : false;
                    reply.likeCount = reply.likes.length || 0;
                    reply.fromUserName = reply.fromUserName || reply.user?.name || '';
                    reply.toUserName = reply.toUserName || reply.replyTo?.name || '';
                    return reply;
                });
            }

            return commentObj;
        });

        ctx.body = {
            success: true,
            message: '获取评论列表成功',
            data: {
                comment: processedComments,
                total: processedComments.length
            }
        };
    } catch (error) {
        ctx.status = 500;
        ctx.body = { success: false, message: '服务器错误' };
    }
});

/**
 * @swagger
 * /api/comment/{id}:
 *   delete:
 *     summary: 删除评论
 *     tags: [comment]
 *     security:
 *       - bearerAuth: []
 */
router.delete('/:id', requireAuth, requireCommentAuthor, async (ctx) => {
    try {
        // 删除评论及其所有回复
        await Comment.deleteMany({
            $or: [
                { _id: ctx.params.id },
                { parentId: ctx.params.id }
            ]
        });

        ctx.body = {
            success: true,
            message: '评论删除成功'
        };
    } catch (error) {
        ctx.status = 500;
        ctx.body = { success: false, message: '服务器错误' };
    }
});

/**
 * @swagger
 * /api/comment/like:
 *   post:
 *     summary: 点赞/取消点赞评论
 *     tags: [comment]
 *     security:
 *       - bearerAuth: []
 */
router.post('/like', requireAuth, async (ctx) => {
    try {
        const schema = Joi.object({
            commentId: Joi.string().required().messages({
                'any.required': '评论ID不能为空'
            })
        });

        const { error, value } = schema.validate(ctx.request.body);
        if (error) {
            ctx.status = 400;
            ctx.body = { success: false, message: error.details[0].message };
            return;
        }

        const { commentId } = value;

        const comment = await Comment.findById(commentId);
        if (!comment) {
            ctx.status = 404;
            ctx.body = { success: false, message: '评论不存在' };
            return;
        }

        // 检查用户是否已经点赞
        const likeIndex = comment.likes.indexOf(ctx.user._id);

        if (likeIndex === -1) {
            // 未点赞，添加点赞
            comment.likes.push(ctx.user._id);
            comment.likeCount = comment.likes.length;
            await comment.save();

            ctx.body = {
                success: true,
                message: '点赞成功',
                data: {
                    likeCount: comment.likeCount,
                    isLiked: true
                }
            };
        } else {
            // 已点赞，取消点赞
            comment.likes.splice(likeIndex, 1);
            comment.likeCount = comment.likes.length;
            await comment.save();

            ctx.body = {
                success: true,
                message: '取消点赞成功',
                data: {
                    likeCount: comment.likeCount,
                    isLiked: false
                }
            };
        }
    } catch (error) {
        ctx.status = 500;
        ctx.body = { success: false, message: '服务器错误' };
    }
});

module.exports = router;