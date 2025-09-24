const Router = require('koa-router');
const jwt = require('koa-jwt');
const Joi = require('joi');
const mongoose = require('mongoose');
const Blog = require('../models/blogs');
const Comment = require('../models/comments');
const User = require('../models/User');  // 添加这一行
// JWT中间件
const auth = jwt({ secret: process.env.JWT_SECRET });

// 验证管理员权限
const requireAdmin = async (ctx, next) => {
    if (ctx.state.user.role !== 'admin') {
        ctx.status = 403;
        ctx.body = {
            success: false,
            message: '需要管理员权限'
        };
        return;
    }
    await next();
};

// 验证博客作者权限
const requireAuthor = async (ctx, next) => {
    try {
        const blog = await Blog.findById(ctx.params.id);
        if (!blog) {
            ctx.status = 404;
            ctx.body = {
                success: false,
                message: '博客不存在'
            };
            return;
        }

        // 管理员或博客作者可以操作
        if (ctx.state.user.role !== 'admin' && blog.user.toString() !== ctx.state.user.id) {
            ctx.status = 403;
            ctx.body = {
                success: false,
                message: '无权限操作此博客'
            };
            return;
        }

        ctx.blog = blog;
        await next();
    } catch (error) {
        ctx.status = 500;
        ctx.body = {
            success: false,
            message: '权限验证失败',
            error: error.message
        };
    }
};

const router = new Router({
    prefix: '/api/blogs'
});

// 获取所有博客
router.get('/', async (ctx) => {
    try {
        const { page = 1, limit = 10, sortByLatest, search, userId } = ctx.query;
        const skip = (page - 1) * limit;

        // 构建查询条件
        let query = {};
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { content: { $regex: search, $options: 'i' } }
            ];
        }
        if (userId) {
            query.user = userId;
        }

        // 构建排序条件
        let sort = {};
        if (sortByLatest === 'true') {
            sort.createdAt = -1;
        } else {
            sort.createdAt = 1;
        }

        const blogs = await Blog.find(query)
            .populate({
                path: 'user',
                select: 'username email role avatar'  // 改为 username
            })
            .sort(sort)
            .skip(skip)
            .limit(parseInt(limit));

        // 获取每个博客的评论统计
        const blogsWithStats = await Promise.all(blogs.map(async (blog) => {
            const commentCount = await Comment.countDocuments({ blog: blog._id });
            const comments = await Comment.find({ blog: blog._id });
            const likeCount = comments.reduce((total, comment) => total + (comment.likes || 0), 0);

            return {
                ...blog.toObject(),
                commentCount,
                likeCount,
                createName: blog.user?.username || '未知用户',  // 改为 username
                images: blog.blogImage?.map(img => img.image) || [],
                defaultImage: blog.blogImage?.[0]?.image || null,
            };
        }));

        const total = await Blog.countDocuments(query);

        ctx.body = {
            success: true,
            data: {
                blogs: blogsWithStats,
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
            message: '获取博客列表失败',
            error: error.message
        };
    }
});

// 根据ID获取博客详情
router.get('/:id', async (ctx) => {
    try {
        const { error: idError } = Joi.string().required().validate(ctx.params.id);
        if (idError) {
            ctx.status = 400;
            ctx.body = {
                success: false,
                message: '博客ID无效'
            };
            return;
        }

        const blog = await Blog.findById(ctx.params.id)
            .populate({
                path: 'user',
                select: 'username email role avatar'
            });

        if (!blog) {
            ctx.status = 404;
            ctx.body = {
                success: false,
                message: '博客不存在'
            };
            return;
        }

        // 获取评论统计
        const commentCount = await Comment.countDocuments({ blog: blog._id });
        const comments = await Comment.find({ blog: blog._id });
        const likeCount = comments.reduce((total, comment) => total + (comment.likes || 0), 0);

        const blogWithStats = {
            ...blog.toObject(),
            commentCount,
            likeCount,
            createName: blog.user?.username || '未知用户',
            images: blog.blogImage?.map(img => img.image) || [],
            defaultImage: blog.blogImage?.[0]?.image || null
        };

        ctx.body = {
            success: true,
            data: blogWithStats
        };
    } catch (error) {
        ctx.status = 500;
        ctx.body = {
            success: false,
            message: '获取博客详情失败',
            error: error.message
        };
    }
});

// 创建博客
router.post('/', auth, async (ctx) => {
    try {
        const { error, value } = Joi.object({
            title: Joi.string().required(),
            content: Joi.string().allow(''),
            tags: Joi.array().items(Joi.string()).optional(), // Add parentheses here too
            blogImage: Joi.array().items(
                Joi.object({
                    image: Joi.string().required()
                })
            ).default([])
        }).validate(ctx.request.body);

        if (error) {
            ctx.status = 400;
            ctx.body = {
                success: false,
                message: error.details[0].message
            };
            return;
        }

        const blog = new Blog({
            ...value,
            user: ctx.state.user.userId
        });

        await blog.save();
        await blog.populate({
            path: 'user',
            select: 'username email role avatar'
        });


        ctx.status = 201;
        ctx.body = {
            success: true,
            message: '博客创建成功',
            data: blog
        };
    } catch (error) {
        ctx.status = 500;
        ctx.body = {
            success: false,
            message: '创建博客失败',
            error: error.message
        };
    }
});

// 更新博客
router.put('/:id', auth, requireAuthor, async (ctx) => {
    try {
        const { error, value } = Joi.object({
            title: Joi.string(),
            content: Joi.string(),
            blogImage: Joi.array().items(
                Joi.object({
                    image: Joi.string().required()
                })
            )
        }).validate(ctx.request.body);

        if (error) {
            ctx.status = 400;
            ctx.body = {
                success: false,
                message: error.details[0].message
            };
            return;
        }

        const blog = await Blog.findByIdAndUpdate(
            ctx.params.id,
            value,
            { new: true, runValidators: true }
        ).populate({
            path: 'user',
            select: 'username email role avatar'
        });

        ctx.body = {
            success: true,
            message: '博客更新成功',
            data: blog
        };
    } catch (error) {
        ctx.status = 500;
        ctx.body = {
            success: false,
            message: '更新博客失败',
            error: error.message
        };
    }
});

// 删除博客
router.delete('/:id', auth, requireAuthor, async (ctx) => {
    try {
        // 删除博客相关的评论
        await Comment.deleteMany({ blog: ctx.params.id });

        // 删除博客
        await Blog.findByIdAndDelete(ctx.params.id);

        ctx.body = {
            success: true,
            message: '博客删除成功'
        };
    } catch (error) {
        ctx.status = 500;
        ctx.body = {
            success: false,
            message: '删除博客失败',
            error: error.message
        };
    }
});

// 获取博客的评论列表
router.get('/:id/comments', async (ctx) => {
    try {
        const { page = 1, limit = 10 } = ctx.query;
        const skip = (page - 1) * limit;

        const comments = await Comment.find({ blog: ctx.params.id })
            .populate({
                path: 'user',
                select: 'username email role avatar'
            })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Comment.countDocuments({ blog: ctx.params.id });

        ctx.body = {
            success: true,
            data: {
                comments,
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
            message: '获取评论列表失败',
            error: error.message
        };
    }
});

module.exports = router;
