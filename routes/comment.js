const Router = require('koa-router');
const jwt = require('koa-jwt');
const Joi = require('joi');
const mongoose = require('mongoose');
const Comment = require('../models/comments');
const Blog = require('../models/blogs');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { validateContent } = require('../utils/contentFilter');

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
        const user = ctx.state.user
        const comment = await Comment.findById(ctx.params.id);
        console.log(comment)

        if (!comment) {
            ctx.status = 404;
            ctx.body = { success: false, message: '评论不存在' };
            return;
        }

        if (comment.user._id !== user._id && user?.role !== 'admin') {
            ctx.status = 403;
            ctx.body = { success: false, message: '只能删除自己的评论' };
            return;
        }

        ctx.comment = comment;
        await next();
    } catch (error) {
        console.error('服务器错误:', error);
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

        // 验证评论内容
        const contentValidation = validateContent(content, {
            minLength: 1,
            maxLength: 1000,
            strictMode: true
        });

        if (!contentValidation.isValid) {
            ctx.status = 400;
            ctx.body = {
                success: false,
                message: `评论${contentValidation.message}`
            };
            return;
        }

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
                model: 'User',
                select: 'username name avatar'
            });

        // 发送消息提醒给博客作者（如果不是自己评论自己的博客）
        if (blog.user.toString() !== ctx.state.user.userId) {
            try {
                const commenter = await User.findById(ctx.state.user.userId).select('username');
                await Notification.create({
                    recipient: blog.user,
                    sender: ctx.state.user.userId,
                    type: 'comment',
                    title: '新评论通知',
                    content: `${commenter.username} 评论了您的博客《${blog.title}》`,
                    relatedBlog: blogId,
                    relatedComment: comment._id,
                    priority: 'normal'
                });
            } catch (notificationError) {
                console.error('发送评论通知失败:', notificationError);
                // 不影响评论创建的主流程
            }
        }

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
router.post('/reply', requireAuth, async (ctx) => {
    try {
        const schema = Joi.object({
            content: Joi.string().required().messages({
                'any.required': '回复内容不能为空'
            }),
            commentId: Joi.string().required().messages({
                'any.required': '评论ID不能为空'
            }),
            replyTo: Joi.string().optional(),
            blogId: Joi.string().required().messages({
                'any.required': '博客ID不能为空'
            }),
        });
        const userId = ctx.state.user.userId;
        console.log(ctx.state)
        const { error, value } = schema.validate(ctx.request.body);
        if (error) {
            ctx.status = 400;
            ctx.body = { success: false, message: error.details[0].message };
            return;
        }

        const { content, commentId, replyTo } = value;

        // 验证回复内容
        const contentValidation = validateContent(content, {
            minLength: 1,
            maxLength: 1000,
            strictMode: true
        });

        if (!contentValidation.isValid) {
            ctx.status = 400;
            ctx.body = {
                success: false,
                message: `回复${contentValidation.message}`
            };
            return;
        }

        // 检查要回复的评论是否存在
        const parentComment = await Comment.findById(commentId);
        if (!parentComment) {
            ctx.status = 404;
            ctx.body = { success: false, message: '要回复的评论不存在' };
            return;
        }

        // 获取用户信息
        const [currentUser, replyToUser] = await Promise.all([
            User.findById(userId).select('username'),
            User.findById(replyTo || parentComment.user).select('username')
        ]);

        const reply = await Comment.create({
            content,
            user: userId,
            blog: parentComment.blog,
            parentId: parentComment.parentId || parentComment._id,
            replyTo: replyTo || parentComment.user,
            fromUserName: currentUser?.username,
            toUserName: replyToUser?.username
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

        // 发送消息提醒给被回复的用户（如果不是回复自己）
        const replyToUserId = replyTo || parentComment.user;
        if (replyToUserId.toString() !== userId.toString()) {
            try {
                const blog = await Blog.findById(parentComment.blog).select('title');
                await Notification.create({
                    recipient: replyToUserId,
                    sender: userId,
                    type: 'reply',
                    title: '新回复通知',
                    content: `${currentUser.name} 回复了您在《${blog.title}》中的评论`,
                    relatedBlog: parentComment.blog,
                    relatedComment: reply._id,
                    priority: 'normal'
                });
            } catch (notificationError) {
                console.error('发送回复通知失败:', notificationError);
                // 不影响回复创建的主流程
            }
        }

        ctx.body = {
            success: true,
            message: '回复成功',
            data: populatedReply
        };
    } catch (error) {
        console.error('创建回复失败:', error);
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
router.get('/', requireAuth, async (ctx) => {
    try {
        console.log('获取博客评论列表');
        const { blogId, commentId } = ctx.query;

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
            _id: commentId || { $ne: null },
            parentId: null
        })
            .populate({
                path: 'user',
                select: 'username avatar'
            })
            .populate({
                path: 'replies',
                populate: [
                    {
                        path: 'user',
                        select: 'username avatar'
                    },
                    {
                        path: 'replyTo',
                        select: 'username avatar'
                    }
                ],
                options: { sort: { createdAt: 1 } }
            })
            .sort({ createdAt: -1 });

        // 处理评论数据
        const userId = ctx.state.user.userId ? ctx.state.user.userId : null;
        const processedComments = comment.map(comment => {
            const commentObj = comment.toObject();

            // 处理点赞信息
            if (!comment.likes) comment.likes = [];
            commentObj.isLiked = userId ? comment.likes.some(like => like?.toString() === userId?.toString()) : false;
            commentObj.likeCount = comment.likes.length || 0;

            // 处理回复的点赞信息
            if (commentObj.replies) {
                commentObj.replies = commentObj.replies.map(reply => {
                    if (!reply.likes) reply.likes = [];
                    reply.isLiked = userId ? reply.likes.some(like => like?.toString() === userId?.toString()) : false;
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
        console.log(error)
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
router.delete('/delete/:id', requireAuth, requireCommentAuthor, async (ctx) => {
    try {
        console.log('删除评论', ctx);
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
        console.error(error);
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
        const userId = ctx.state.user.userId;
        const { error, value } = schema.validate(ctx.request.body);
        if (error) {
            ctx.status = 400;
            ctx.body = { success: false, message: error.details[0].message };
            return;
        }

        const { commentId } = value;

        const comment = await Comment.findById(commentId);
        if (!comment) {
            ctx.status = 400;
            ctx.body = { success: false, message: '评论不存在' };
            return;
        }

        // 检查用户是否已经点赞
        const likeIndex = comment.likes.findIndex(like => like?.toString() === userId?.toString());

        if (likeIndex === -1) {
            // 未点赞，添加点赞
            comment.likes.push(new mongoose.Types.ObjectId(userId));
            comment.likeCount = comment.likes.length;
            await comment.save();

            // 发送点赞通知给评论作者（如果不是自己点赞自己的评论）
            if (comment.user?.toString() !== userId?.toString()) {
                try {
                    const liker = await User.findById(userId).select('username');
                    const blog = await Blog.findById(comment.blog).select('title');
                    await Notification.create({
                        recipient: comment.user,
                        sender: userId,
                        type: 'like',
                        title: '评论被点赞',
                        content: `${liker.username} 点赞了您在《${blog.title}》中的评论`,
                        relatedBlog: comment.blog,
                        relatedComment: comment._id,
                        priority: 'normal'
                    });
                } catch (notificationError) {
                    console.error('发送点赞通知失败:', notificationError);
                    // 不影响点赞功能，继续执行
                }
            }

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
        console.error(error);
        ctx.status = 500;
        ctx.body = { success: false, message: error };
    }
});
router.get('/detail', async (ctx) => {
    try {
        const { id } = ctx.query;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            ctx.status = 400;
            ctx.body = { success: false, message: '评论ID无效' };
            return;
        }

        const comment = await Comment.findById(id)
            .populate({
                path: 'user',
                select: 'username email role avatar'
            })
            .populate({
                path: 'blog',
                select: 'title user'
            });

        // if (!comment) {
        //     ctx.status = 404;
        //     ctx.body = { success: false, message: '评论不存在' };
        //     return;
        // }

        ctx.body = { success: true, data: comment };
    } catch (error) {
        console.error('获取评论详情失败:', error);
        ctx.status = 500;
        ctx.body = { success: false, message: '服务器错误' };
    }
});

module.exports = router;

// 根据ID获取评论详情（用于后台处理举报定位评论）
