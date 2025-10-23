const Blacklist = require('../models/Blacklist');

/**
 * 检查两个用户之间是否存在拉黑关系
 * @param {string} userId1 - 用户1的ID
 * @param {string} userId2 - 用户2的ID
 * @returns {Promise<boolean>} - 是否存在拉黑关系
 */
async function checkBlacklistRelation(userId1, userId2) {
    try {
        return await Blacklist.hasBlacklistRelation(userId1, userId2);
    } catch (error) {
        console.error('检查拉黑关系失败:', error);
        return false;
    }
}

/**
 * 检查用户是否被另一个用户拉黑
 * @param {string} blockerId - 拉黑者ID
 * @param {string} blockedId - 被拉黑者ID
 * @returns {Promise<boolean>} - 是否被拉黑
 */
async function isUserBlocked(blockerId, blockedId) {
    try {
        return await Blacklist.isBlocked(blockerId, blockedId);
    } catch (error) {
        console.error('检查用户是否被拉黑失败:', error);
        return false;
    }
}

/**
 * 获取用户的黑名单列表
 * @param {string} userId - 用户ID
 * @param {number} page - 页码
 * @param {number} limit - 每页数量
 * @returns {Promise<Object>} - 黑名单列表和分页信息
 */
async function getUserBlacklist(userId, page = 1, limit = 10) {
    try {
        const skip = (page - 1) * limit;
        
        const blacklist = await Blacklist.find({ blocker: userId })
            .populate('blocked', 'username avatar email')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await Blacklist.countDocuments({ blocker: userId });

        return {
            success: true,
            data: {
                blacklist,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / limit)
                }
            }
        };
    } catch (error) {
        console.error('获取黑名单列表失败:', error);
        return {
            success: false,
            message: '获取黑名单列表失败',
            error: error.message
        };
    }
}

/**
 * 拉黑用户
 * @param {string} blockerId - 拉黑者ID
 * @param {string} blockedId - 被拉黑者ID
 * @param {string} reason - 拉黑原因（可选）
 * @returns {Promise<Object>} - 操作结果
 */
async function blockUser(blockerId, blockedId, reason = '') {
    try {
        // 检查是否已经拉黑
        const existingBlock = await Blacklist.findOne({
            blocker: blockerId,
            blocked: blockedId
        });

        if (existingBlock) {
            return {
                success: false,
                message: '已经拉黑该用户'
            };
        }

        // 创建拉黑记录
        const blacklistRecord = await Blacklist.create({
            blocker: blockerId,
            blocked: blockedId,
            reason
        });

        return {
            success: true,
            message: '拉黑成功',
            data: blacklistRecord
        };
    } catch (error) {
        console.error('拉黑用户失败:', error);
        return {
            success: false,
            message: '拉黑失败',
            error: error.message
        };
    }
}

/**
 * 取消拉黑用户
 * @param {string} blockerId - 拉黑者ID
 * @param {string} blockedId - 被拉黑者ID
 * @returns {Promise<Object>} - 操作结果
 */
async function unblockUser(blockerId, blockedId) {
    try {
        const result = await Blacklist.findOneAndDelete({
            blocker: blockerId,
            blocked: blockedId
        });

        if (!result) {
            return {
                success: false,
                message: '未找到拉黑记录'
            };
        }

        return {
            success: true,
            message: '取消拉黑成功'
        };
    } catch (error) {
        console.error('取消拉黑失败:', error);
        return {
            success: false,
            message: '取消拉黑失败',
            error: error.message
        };
    }
}

module.exports = {
    checkBlacklistRelation,
    isUserBlocked,
    getUserBlacklist,
    blockUser,
    unblockUser
};