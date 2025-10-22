const Router = require('koa-router');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Joi = require('joi');

const router = new Router({
    prefix: '/api/user'
});

// JWT验证中间件
const authenticateToken = async (ctx, next) => {
    const authHeader = ctx.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        ctx.status = 401;
        ctx.body = { error: '访问令牌缺失' };
        return;
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        ctx.user = decoded;
        await next();
    } catch (error) {
        ctx.status = 403;
        ctx.body = { error: '无效的访问令牌' };
    }
};

// 管理员权限检查中间件
const requireAdmin = async (ctx, next) => {
    const user = await User.findById(ctx.user.userId);
    if (!user || user.role !== 'admin') {
        ctx.status = 403;
        ctx.body = {
            success: false,
            message: '需要管理员权限'
        };
        return;
    }
    await next();
};

// 获取用户个人信息
router.get('/profile', authenticateToken, async (ctx) => {
    try {
        const user = await User.findById(ctx.user.userId).select('-password');

        if (!user) {
            ctx.status = 404;
            ctx.body = { error: '用户不存在' };
            return;
        }

        ctx.body = {
            success: true,
            data: user
        };
    } catch (error) {
        console.error('获取用户信息失败:', error);
        ctx.status = 500;
        ctx.body = { error: '服务器内部错误' };
    }
});

// 更新用户个人信息
router.put('/profile', authenticateToken, async (ctx) => {
    try {
        // 验证请求数据
        const { error, value } = updateProfileSchema.validate(ctx.request.body);
        if (error) {
            ctx.status = 400;
            ctx.body = { error: error.details[0].message };
            return;
        }

        const { username, email, phone, avatar, bio } = value;

        // 检查邮箱是否已被其他用户使用（仅当尝试更新邮箱时）
        // if (email) {
        //     ctx.status = 400;
        //     ctx.body = { error: '邮箱不允许修改' };
        //     return;
        // }

        // 更新用户信息
        const updateData = {};
        if (username) updateData.username = username;
        // 邮箱不允许修改，所以不处理email字段
        if (phone !== undefined) updateData.phone = phone;
        if (avatar) updateData.avatar = avatar;
        if (bio !== undefined) updateData.bio = bio;
        updateData.updatedAt = new Date();

        const updatedUser = await User.findByIdAndUpdate(
            ctx.user.userId,
            updateData,
            { new: true, runValidators: true }
        ).select('-password');

        if (!updatedUser) {
            ctx.status = 404;
            ctx.body = { error: '用户不存在' };
            return;
        }

        ctx.body = {
            success: true,
            message: '个人信息更新成功',
            data: updatedUser
        };
    } catch (error) {
        console.error('更新用户信息失败:', error);
        if (error.name === 'ValidationError') {
            ctx.status = 400;
            ctx.body = { error: '数据验证失败' };
        } else {
            ctx.status = 500;
            ctx.body = { error: '服务器内部错误' };
        }
    }
});

// 更改密码
router.put('/password', authenticateToken, async (ctx) => {
    try {
        // 验证请求数据
        const { error, value } = changePasswordSchema.validate(ctx.request.body);
        if (error) {
            ctx.status = 400;
            ctx.body = { error: error.details[0].message };
            return;
        }

        const { currentPassword, newPassword } = value;

        // 获取用户信息（包含密码）
        const user = await User.findById(ctx.user.userId);
        if (!user) {
            ctx.status = 404;
            ctx.body = { error: '用户不存在' };
            return;
        }

        // 验证当前密码
        const isCurrentPasswordValid = await user.comparePassword(currentPassword);
        if (!isCurrentPasswordValid) {
            ctx.status = 400;
            ctx.body = { error: '当前密码不正确' };
            return;
        }

        // 更新密码
        user.password = newPassword;
        await user.save();

        ctx.body = {
            success: true,
            message: '密码修改成功'
        };
    } catch (error) {
        console.error('修改密码失败:', error);
        ctx.status = 500;
        ctx.body = { error: '服务器内部错误' };
    }
});

// ============ 用户管理API（管理员权限） ============

// 获取用户列表
router.get('/list', authenticateToken, requireAdmin, async (ctx) => {
    try {
        const { page = 1, limit = 20, search } = ctx.query;
        const skip = (page - 1) * limit;

        let query = {};
        if (search) {
            query.$or = [
                { username: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }

        const users = await User.find(query)
            .select('-password')
            .skip(skip)
            .limit(parseInt(limit))
            .sort({ createdAt: -1 });

        const total = await User.countDocuments(query);

        ctx.body = {
            success: true,
            data: {
                users,
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
            message: '获取用户列表失败',
            error: error.message
        };
    }
});

// 更新用户状态
router.put('/:id/status', authenticateToken, requireAdmin, async (ctx) => {
    try {
        const { isActive } = ctx.request.body;

        const user = await User.findByIdAndUpdate(
            ctx.params.id,
            { isActive },
            { new: true }
        ).select('-password');

        if (!user) {
            ctx.status = 404;
            ctx.body = {
                success: false,
                message: '用户不存在'
            };
            return;
        }

        ctx.body = {
            success: true,
            message: '用户状态更新成功',
            data: user
        };
    } catch (error) {
        ctx.status = 500;
        ctx.body = {
            success: false,
            message: '更新用户状态失败',
            error: error.message
        };
    }
});

// 创建用户
router.post('/', authenticateToken, requireAdmin, async (ctx) => {
    try {
        const { error, value } = createUserSchema.validate(ctx.request.body);
        if (error) {
            ctx.status = 400;
            ctx.body = {
                success: false,
                message: error.details[0].message
            };
            return;
        }

        const { username, email, password, role = 'user' } = value;

        // 检查邮箱是否已存在
        const existingUser = await User.findOne({ email });

        if (existingUser) {
            ctx.status = 400;
            ctx.body = {
                success: false,
                message: '邮箱已存在'
            };
            return;
        }

        // 创建新用户
        const user = new User({
            username,
            email,
            password,
            role,
            isActive: true
        });

        await user.save();

        // 返回用户信息（不包含密码）
        const userResponse = await User.findById(user._id).select('-password');

        ctx.body = {
            success: true,
            message: '用户创建成功',
            data: userResponse
        };
    } catch (error) {
        ctx.status = 500;
        ctx.body = {
            success: false,
            message: '创建用户失败',
            error: error.message
        };
    }
});

// 更新用户信息
router.put('/:id', authenticateToken, requireAdmin, async (ctx) => {
    try {
        const { error, value } = updateUserSchema.validate(ctx.request.body);
        if (error) {
            ctx.status = 400;
            ctx.body = {
                success: false,
                message: error.details[0].message
            };
            return;
        }

        const { username, email, role, isActive } = value;

        // 检查邮箱是否已被其他用户使用
        if (email) {
            const existingUser = await User.findOne({
                $and: [
                    { _id: { $ne: ctx.params.id } },
                    { email }
                ]
            });

            if (existingUser) {
                ctx.status = 400;
                ctx.body = {
                    success: false,
                    message: '邮箱已被使用'
                };
                return;
            }
        }

        // 更新用户信息
        const updateData = {};
        if (username) updateData.username = username;
        if (email) updateData.email = email;
        if (role) updateData.role = role;
        if (isActive !== undefined) updateData.isActive = isActive;

        const user = await User.findByIdAndUpdate(
            ctx.params.id,
            updateData,
            { new: true, runValidators: true }
        ).select('-password');

        if (!user) {
            ctx.status = 404;
            ctx.body = {
                success: false,
                message: '用户不存在'
            };
            return;
        }

        ctx.body = {
            success: true,
            message: '用户信息更新成功',
            data: user
        };
    } catch (error) {
        ctx.status = 500;
        ctx.body = {
            success: false,
            message: '更新用户信息失败',
            error: error.message
        };
    }
});

// 删除用户
router.delete('/:id', authenticateToken, requireAdmin, async (ctx) => {
    try {
        const user = await User.findByIdAndDelete(ctx.params.id);

        if (!user) {
            ctx.status = 404;
            ctx.body = {
                success: false,
                message: '用户不存在'
            };
            return;
        }

        ctx.body = {
            success: true,
            message: '用户删除成功'
        };
    } catch (error) {
        ctx.status = 500;
        ctx.body = {
            success: false,
            message: '删除用户失败',
            error: error.message
        };
    }
});

// 获取单个用户信息
router.get('/:id', authenticateToken, requireAdmin, async (ctx) => {
    try {
        const user = await User.findById(ctx.params.id).select('-password');

        if (!user) {
            ctx.status = 404;
            ctx.body = {
                success: false,
                message: '用户不存在'
            };
            return;
        }

        ctx.body = {
            success: true,
            data: user
        };
    } catch (error) {
        ctx.status = 500;
        ctx.body = {
            success: false,
            message: '获取用户信息失败',
            error: error.message
        };
    }
});

// 验证规则
const updateProfileSchema = Joi.object({
    username: Joi.string().min(1).max(15).optional(),
    email: Joi.string().email().optional(),
    phone: Joi.string().pattern(/^1[3-9]\d{9}$/).optional().allow(''),
    avatar: Joi.string().uri().optional(),
    bio: Joi.string().max(200).optional().allow(''),
    role: Joi.string().valid('admin', 'user').optional().allow(null),
    isActive: Joi.boolean().allow()
});

const changePasswordSchema = Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: Joi.string().min(6).required()
});

// 用户管理相关的验证规则
const createUserSchema = Joi.object({
    username: Joi.string().min(1).max(15).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    role: Joi.string().valid('admin', 'user').default('user').allow(null)
});

const updateUserSchema = Joi.object({
    username: Joi.string().min(1).max(15).optional(),
    email: Joi.string().email().optional(),
    role: Joi.string().valid('admin', 'user').optional().allow(null),
    isActive: Joi.boolean().optional()
});

module.exports = router;