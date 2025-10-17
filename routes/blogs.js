const Router = require('koa-router');
const jwt = require('koa-jwt');
const Joi = require('joi');
const mongoose = require('mongoose');
const Blog = require('../models/blogs');
const Comment = require('../models/comments');
const User = require('../models/User');  // 添加这一行
const History = require('../models/History');
const Favorite = require('../models/Favorite');
const { validateContent } = require('../utils/contentFilter');
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

// 获取本人所有博客
router.get('/my', auth, async (ctx) => {
    try {
        const { page = 1, limit = 10, sortByLatest } = ctx.query;
        const skip = (page - 1) * limit;
        const userId = ctx.state.user.userId;

        // 构建查询条件 - 只查询当前用户的博客
        const query = { user: userId };

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
                select: 'username email role avatar'
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
                createName: blog.user?.username || '未知用户',
                images: blog.blogImage?.map(img => img.image) || [],
                defaultImage: blog.blogImage?.[0]?.image || null
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
            message: '获取个人博客列表失败',
            error: error.message
        };
    }
});

// 获取所有博客
router.get('/all', async (ctx) => {
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

        // 新增：支持通过 id 或 _id 精确查询
        const idQuery = ctx.query.id || ctx.query._id;
        if (idQuery) {
            if (mongoose.Types.ObjectId.isValid(idQuery)) {
                query._id = idQuery;
            } else {
                ctx.status = 400;
                ctx.body = { success: false, message: '博客ID无效' };
                return;
            }
        }

        let blogs;
        if (sortByLatest === 'true') {
            // 按最新创建时间排序
            blogs = await Blog.find(query)
                .populate({
                    path: 'user',
                    select: 'username email role avatar'
                })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit));
        } else {
            // 综合排序使用 find + populate，便于直接获取用户信息
            blogs = await Blog.find(query)
                .populate({
                    path: 'user',
                    select: 'username email role avatar'
                })
                .sort({ viewCount: -1, favoriteCount: -1, createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit));
        }

        const blogsWithStats = sortByLatest === 'true'
            ? await Promise.all(blogs.map(async (blog) => {
                const commentCount = await Comment.countDocuments({ blog: blog._id });
                const viewCount = blog.viewCount || 0;
                const favoriteCount = blog.favoriteCount || 0;

                return {
                    ...blog.toObject(),
                    commentCount,
                    favoriteCount,
                    viewCount,
                    createName: blog.user?.username || '未知用户',
                    images: blog.blogImage?.map(img => img.image) || [],
                    defaultImage: blog.blogImage?.[0]?.image || null,
                };
            }))
            : await Promise.all(blogs.map(async (blog) => {
                const commentCount = await Comment.countDocuments({ blog: blog._id });
                const viewCount = blog.viewCount || 0;
                const favoriteCount = blog.favoriteCount || 0;
                return {
                    ...blog.toObject(),
                    commentCount,
                    favoriteCount,
                    viewCount,
                    createName: blog.user?.username || '未知用户',
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
router.get('/detail/:id', async (ctx) => {
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

        // 视图计数：原子自增一次
        await Blog.updateOne({ _id: blog._id }, { $inc: { viewCount: 1 } });

        // 获取评论统计
        const commentCount = await Comment.countDocuments({ blog: blog._id });
        const favoriteCount = blog.favoriteCount || 0;

        const blogWithStats = {
            ...blog.toObject(),
            commentCount,
            favoriteCount,
            viewCount: (blog.viewCount || 0) + 1,
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
router.post('/create', auth, async (ctx) => {
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

        // 验证标题内容
        const titleValidation = validateContent(value.title, {
            minLength: 1,
            maxLength: 200,
            strictMode: true
        });

        if (!titleValidation.isValid) {
            ctx.status = 400;
            ctx.body = {
                success: false,
                message: `标题${titleValidation.message}`
            };
            return;
        }

        // 验证博客内容
        if (value.content && value.content.trim()) {
            const contentValidation = validateContent(value.content, {
                minLength: 1,
                maxLength: 50000,
                strictMode: true
            });

            if (!contentValidation.isValid) {
                ctx.status = 400;
                ctx.body = {
                    success: false,
                    message: `内容${contentValidation.message}`
                };
                return;
            }
        }

        const blog = new Blog({
            ...value,
            user: ctx.state.user.userId
        });

        await blog.save();
        await blog.populate({
            path: 'user',
            select: 'username  avatar'
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
            content: Joi.string().allow(''),
            tags: Joi.array().items(Joi.string()).optional(), // Add parentheses here too
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

        // 验证标题内容
        if (value.title) {
            const titleValidation = validateContent(value.title, {
                minLength: 1,
                maxLength: 200,
                strictMode: true
            });

            if (!titleValidation.isValid) {
                ctx.status = 400;
                ctx.body = {
                    success: false,
                    message: `标题${titleValidation.message}`
                };
                return;
            }
        }

        // 验证博客内容
        if (value.content && value.content.trim()) {
            const contentValidation = validateContent(value.content, {
                minLength: 1,
                maxLength: 50000,
                strictMode: true
            });

            if (!contentValidation.isValid) {
                ctx.status = 400;
                ctx.body = {
                    success: false,
                    message: `内容${contentValidation.message}`
                };
                return;
            }
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
router.delete('/delete/:id', auth, async (ctx) => {
    console.log('删除博客', ctx);
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
        console.log('删除博客失败', error);
        ctx.status = 500;
        ctx.body = {
            success: false,
            message: '删除博客失败',
            error: error.message
        };
    }
});

// 获取博客的评论列表
router.get('/comments/:id', async (ctx) => {
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

// 添加博客到历史记录
router.get('/history/:id', auth, async (ctx) => {
    try {
        const { id } = ctx.params;
        const { duration = 0, source = 'direct' } = ctx.request.body;
        const userId = ctx.state.user.id;

        // 验证博客是否存在
        const blog = await Blog.findById(id);
        if (!blog) {
            ctx.status = 404;
            ctx.body = {
                success: false,
                message: '博客不存在'
            };
            return;
        }

        // 使用upsert更新或创建历史记录
        await History.findOneAndUpdate(
            { user: userId, blog: id },
            {
                visitedAt: new Date(),
                duration,
                source
            },
            { upsert: true, new: true }
        );

        ctx.body = {
            success: true,
            message: '历史记录已更新'
        };
    } catch (error) {
        ctx.status = 500;
        ctx.body = {
            success: false,
            message: '添加历史记录失败',
            error: error.message
        };
    }
});

// 获取用户的浏览历史
router.get('/history', auth, async (ctx) => {
    try {
        const { page = 1, limit = 10 } = ctx.query;
        const userId = ctx.state.user.id;
        const skip = (page - 1) * limit;

        const histories = await History.find({ user: userId })
            .populate({
                path: 'blog',
                model: 'blogs',
                select: 'title content blogImage createdAt user summary description',
                populate: {
                    path: 'user',
                    model: 'User',
                    select: 'username avatar'
                }
            })
            .sort({ visitedAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await History.countDocuments({ user: userId });

        // 处理历史记录数据，添加defaultImage字段
        const processedHistories = histories.map(history => {
            const historyObj = history.toObject();
            if (historyObj.blog) {
                historyObj.blog.defaultImage = historyObj.blog.blogImage?.[0]?.image || null;
            }
            return historyObj;
        });

        ctx.body = {
            success: true,
            data: {
                histories: processedHistories,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / limit)
                }
            }
        };
    } catch (error) {
        console.log('获取浏览历史失败', error);
        ctx.status = 500;
        ctx.body = {
            success: false,
            message: '获取浏览历史失败',
            error: error.message
        };
    }
});

// 清空浏览历史
router.delete('/history', auth, async (ctx) => {
    try {
        const userId = ctx.state.user.id;
        await History.deleteMany({ user: userId });

        ctx.body = {
            success: true,
            message: '浏览历史已清空'
        };
    } catch (error) {
        ctx.status = 500;
        ctx.body = {
            success: false,
            message: '清空浏览历史失败',
            error: error.message
        };
    }
});

// 收藏博客
router.post('/favorite/:id', auth, async (ctx) => {
    console.log('收藏博客', ctx);
    try {
        const { id } = ctx.params;
        const { category = '默认收藏', note = '' } = ctx.request.body;
        const userId = ctx.state.user.userId;

        // 验证博客是否存在
        const blog = await Blog.findById(id);
        if (!blog) {
            ctx.status = 404;
            ctx.body = {
                success: false,
                message: '博客不存在'
            };
            return;
        }

        // 检查是否已收藏
        const existingFavorite = await Favorite.findOne({ user: userId, blog: id });
        if (existingFavorite) {
            ctx.status = 200;
            ctx.body = {
                success: false,
                message: '已收藏该博客'
            };
            return;
        }

        // 创建收藏记录
        const favorite = new Favorite({
            user: userId,
            blog: id,
            blogTitle: blog.title,
            category,
            note
        });

        // 更新博客的收藏数量
        blog.favoriteCount += 1;
        await blog.save();

        await favorite.save();

        ctx.body = {
            success: true,
            message: '收藏成功',
            data: favorite
        };
    } catch (error) {
        console.log('收藏博客失败', error);
        ctx.status = 500;
        ctx.body = {
            success: false,
            message: '收藏失败',
            error: error.message
        };
    }
});

// 取消收藏博客
router.post('/unfavorite/:id', auth, async (ctx) => {
    try {
        const { id } = ctx.params;
        const userId = ctx.state.user.userId;

        const result = await Favorite.findOneAndDelete({ user: userId, blog: id });
        if (!result) {
            ctx.status = 404;
            ctx.body = {
                success: false,
                message: '未找到收藏记录'
            };
            return;
        }

        // 更新博客的收藏数量
        const blog = await Blog.findById(result.blog);
        if (blog) {
            blog.favoriteCount -= 1;
            await blog.save();
        }

        ctx.body = {
            success: true,
            message: '取消收藏成功'
        };
    } catch (error) {
        ctx.status = 500;
        ctx.body = {
            success: false,
            message: '取消收藏失败',
            error: error.message
        };
    }
});

// 获取用户的收藏列表
router.get('/favorites', auth, async (ctx) => {
    try {
        const { page = 1, limit = 10, category } = ctx.query;
        const userId = ctx.state.user.userId;
        const skip = (page - 1) * limit;

        // 构建查询条件
        const query = { user: userId };
        if (category && category !== '全部') {
            query.category = category;
        }

        const favorites = await Favorite.find(query)
            .populate({
                path: 'blog',
                model: 'blogs',
                select: 'title content blogImage createdAt user summary description favoriteCount',
                populate: {
                    path: 'user',
                    model: 'User',
                    select: 'username avatar'
                }
            })
            .sort({ favoriteAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Favorite.countDocuments(query);

        // 获取收藏分类列表
        const categories = await Favorite.distinct('category', { user: userId });

        // 处理收藏数据，添加defaultImage字段
        const processedFavorites = favorites.map(favorite => {
            const favoriteObj = favorite.toObject();
            if (favoriteObj.blog) {
                favoriteObj.blog.defaultImage = favoriteObj.blog.blogImage?.[0]?.image || null;
            }
            return favoriteObj;
        });

        ctx.body = {
            success: true,
            data: {
                favorites: processedFavorites,
                categories,
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
            message: '获取收藏列表失败',
            error: error.message
        };
    }
});

// 检查博客是否已收藏
router.get('/favorite/status/:id', auth, async (ctx) => {
    try {
        const { id } = ctx.params;
        const userId = ctx.state.user.userId;

        const favorite = await Favorite.findOne({ user: userId, blog: id });

        ctx.body = {
            success: true,
            data: {
                isFavorited: !!favorite,
                favorite: favorite || null
            }
        };
    } catch (error) {
        ctx.status = 500;
        ctx.body = {
            success: false,
            message: '检查收藏状态失败',
            error: error.message
        };
    }
});
// 获取我关注的作者的博客列表（需要登录）
router.get('/following', auth, async (ctx) => {
    try {
        const { page = 1, limit = 10, sortByLatest, search } = ctx.query;
        const skip = (page - 1) * limit;

        const uid = ctx.state?.user?.userId;
        if (!uid) {
            ctx.status = 401;
            ctx.body = { success: false, message: '请先登录' };
            return;
        }

        const me = await User.findById(uid).select('following');
        const followingIds = (me?.following || []).map(id => id);

        // 如果没有关注任何人，直接返回空列表
        if (!followingIds.length) {
            ctx.body = {
                success: true,
                data: {
                    blogs: [],
                    pagination: {
                        page: parseInt(page),
                        limit: parseInt(limit),
                        total: 0,
                        pages: 0
                    }
                }
            };
            return;
        }

        // 构建查询条件
        let query = { user: { $in: followingIds } };
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { content: { $regex: search, $options: 'i' } }
            ];
        }

        let blogs;
        if (sortByLatest === 'true') {
            // 按最新创建时间排序
            blogs = await Blog.find(query)
                .populate({
                    path: 'user',
                    select: 'username email role avatar'
                })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit));
        } else {
            // 综合排序：viewCount -> favoriteCount -> createdAt
            blogs = await Blog.find(query)
                .populate({
                    path: 'user',
                    select: 'username email role avatar'
                })
                .sort({ viewCount: -1, favoriteCount: -1, createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit));
        }

        const blogsWithStats = await Promise.all(blogs.map(async (blog) => {
            const commentCount = await Comment.countDocuments({ blog: blog._id });
            const viewCount = blog.viewCount || 0;
            const favoriteCount = blog.favoriteCount || 0;
            return {
                ...blog.toObject(),
                commentCount,
                favoriteCount,
                viewCount,
                createName: blog.user?.username || '未知用户',
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
            message: '获取关注博客列表失败',
            error: error.message
        };
    }
});

module.exports = router;

