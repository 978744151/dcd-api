const Router = require('koa-router');
const jwt = require('koa-jwt');
const Joi = require('joi');
const mongoose = require('mongoose');
const Mall = require('../models/Mall');
const Brand = require('../models/Brand');
const BrandStore = require('../models/BrandStore');

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

const router = new Router({
  prefix: '/api/mall'
});

// 商场管理
// 创建商场
router.post('/', auth, requireAdmin, async (ctx) => {
  try {
    const { error, value } = Joi.object({
      name: Joi.string().required(),
      code: Joi.string().allow('', null),
      description: Joi.string().allow('', null),
      logo: Joi.string().allow('', null),
      website: Joi.string().uri().allow('', null),
      province: Joi.string().allow('', null),
      city: Joi.string().allow('', null),
      district: Joi.string().allow('', null),
      address: Joi.string().allow('', null),
      contactPhone: Joi.string().allow('', null),
      contactEmail: Joi.string().email().allow('', null),
      floorCount: Joi.number().default(1),
      totalArea: Joi.number().default(0),
      parkingSpaces: Joi.number().default(0),
      openingHours: Joi.string()
    }).validate(ctx.request.body);

    if (error) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: error.details[0].message
      };
      return;
    }

    const mall = new Mall(value);
    await mall.save();

    ctx.body = {
      success: true,
      message: '商场创建成功',
      data: mall
    };
  } catch (error) {
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '创建商场失败',
      error: error.message
    };
  }
});

// 更新商场
router.put('/:id', auth, requireAdmin, async (ctx) => {
  try {
    const { error, value } = Joi.object({
      name: Joi.string().allow('', null),
      code: Joi.string().allow('', null),
      description: Joi.string().allow('', null),
      logo: Joi.string().allow('', null),
      website: Joi.string().uri().allow('', null),
      province: Joi.string().allow('', null),
      city: Joi.string().allow('', null),
      district: Joi.string().allow('', null),
      address: Joi.string().allow('', null),
      contactPhone: Joi.string().allow('', null),
      contactEmail: Joi.string().email().allow('', null),
      floorCount: Joi.number().allow('', null),
      totalArea: Joi.number().allow('', null),
      parkingSpaces: Joi.number().allow('', null),
      openingHours: Joi.string().allow('', null),
      isActive: Joi.boolean().allow('', null)
    }).validate(ctx.request.body);

    if (error) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: error.details[0].message
      };
      return;
    }

    const mall = await Mall.findByIdAndUpdate(
      ctx.params.id,
      value,
      { new: true, runValidators: true }
    );

    if (!mall) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: '商场不存在'
      };
      return;
    }

    ctx.body = {
      success: true,
      message: '商场更新成功',
      data: mall
    };
  } catch (error) {
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '更新商场失败',
      error: error.message
    };
  }
});

// 删除商场
router.delete('/:id', auth, requireAdmin, async (ctx) => {
  try {
    const mall = await Mall.findByIdAndDelete(ctx.params.id);
    if (!mall) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: '商场不存在'
      };
      return;
    }

    ctx.body = {
      success: true,
      message: '商场删除成功'
    };
  } catch (error) {
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '删除商场失败',
      error: error.message
    };
  }
});

// 获取指定商场下的品牌列表
router.get('/:mallId/brands', auth, async (ctx) => {
  try {
    const { page = 1, limit = 10, search } = ctx.query;
    const { mallId } = ctx.params;
    console.log(mallId)
    const skip = (page - 1) * limit;

    // 验证商场ID
    const { error: mallIdError } = Joi.string().required().validate(mallId);
    if (mallIdError) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '商场ID无效'
      };
      return;
    }

    // 验证商场是否存在
    const mall = await Mall.findById(mallId);
    if (!mall) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: '商场不存在'
      };
      return;
    }

    // 获取该商场下所有有门店的品牌ID
    const brandStoreAgg = await BrandStore.aggregate([
      {
        $match: {
          mall: new mongoose.Types.ObjectId(mallId),
          isActive: true
        }
      },
      {
        $group: {
          _id: '$brand',
          storeCount: { $sum: 1 }
        }
      }
    ]);

    if (brandStoreAgg.length === 0) {
      ctx.body = {
        success: true,
        data: {
          brands: [],
          mall: {
            _id: mall._id,
            name: mall.name,
            address: mall.address
          },
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

    const brandIds = brandStoreAgg.map(item => item._id);
    const storeCountMap = new Map();
    brandStoreAgg.forEach(item => {
      storeCountMap.set(item._id.toString(), item.storeCount);
    });

    // 构建品牌查询条件
    let brandQuery = {
      _id: { $in: brandIds },
      isActive: true
    };

    if (search) {
      brandQuery.name = { $regex: search, $options: 'i' };
    }

    // 获取品牌总数（用于分页）
    const total = await Brand.countDocuments(brandQuery);

    // 获取品牌列表
    const brandList = await Brand.find(brandQuery)
      .select('name logo category description sort')
      .sort({ sort: 1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // 为每个品牌添加门店数量
    const brands = brandList.map(brand => ({
      ...brand.toObject(),
      storeCount: storeCountMap.get(brand._id.toString()) || 0
    }));

    ctx.body = {
      success: true,
      data: {
        brands,
        mall: {
          _id: mall._id,
          name: mall.name,
          address: mall.address
        },
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
      message: '获取商场品牌列表失败',
      error: error.message
    };
  }
});

module.exports = router;