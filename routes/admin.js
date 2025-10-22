
const Router = require('koa-router');
const jwt = require('koa-jwt');
const Province = require('../models/Province');
const City = require('../models/City');
const District = require('../models/District');
const Brand = require('../models/Brand');
const Mall = require('../models/Mall');
const BrandStore = require('../models/BrandStore');
const User = require('../models/User');
const Joi = require('joi');
const mongoose = require('mongoose');
const Report = require('../models/Report');
const Dictionary = require('../models/Dictionary');

const router = new Router({
  prefix: '/api/admin'
});

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



// 品牌门店：在某省/市/区某商场内的品牌入驻点
// 品牌门店：在某省/市/区某商场内的品牌入驻点
router.post('/brand-stores', auth, requireAdmin, async (ctx) => {
  try {
    const { error, value } = Joi.object({
      brand: Joi.string().required(),
      mall: Joi.string().required(), // 支持逗号分隔的商场ID
      storeName: Joi.string().allow('', null),
      score: Joi.number(),
      floor: Joi.string().allow('', null),
      unitNumber: Joi.string().allow('', null),
      openingHours: Joi.string().allow('', null),
      storeAddress: Joi.string().allow('', null),
      isOla: Joi.boolean().default(false),
      isActive: Joi.boolean().default(true),
      phone: Joi.string().allow('', null),
    }).validate(ctx.request.body);

    if (error) {
      ctx.status = 400;
      ctx.body = { success: false, message: error.details[0].message };
      return;
    }

    // 解析商场ID列表
    const mallIds = value.mall.split(',').map(id => id.trim()).filter(id => id);

    if (mallIds.length === 0) {
      ctx.status = 400;
      ctx.body = { success: false, message: '请提供有效的商场ID' };
      return;
    }

    // 检查已存在的品牌-商场组合
    const existingStores = await BrandStore.find({
      brand: value.brand,
      mall: { $in: mallIds }
    });

    // 获取已存在的商场ID列表
    const existingMallIds = existingStores.map(store => store.mall.toString());

    // 过滤出未添加的商场ID
    const newMallIds = mallIds.filter(mallId => !existingMallIds.includes(mallId));

    if (newMallIds.length === 0) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '所有选中的商场都已添加过该品牌门店',
        data: {
          skipped: mallIds.length,
          created: 0,
          existingStores: existingStores
        }
      };
      return;
    }

    // 获取未添加商场的信息，包含省市区和地址
    const malls = await Mall.find({ _id: { $in: newMallIds } })
      .populate('province', 'name')
      .populate('city', 'name')
      .populate('district', 'name');

    if (malls.length !== newMallIds.length) {
      ctx.status = 400;
      ctx.body = { success: false, message: '部分商场ID无效' };
      return;
    }

    // 批量创建门店记录（只为未添加的商场）
    const storePromises = malls.map(mall => {
      const storeData = {
        brand: value.brand,
        mall: mall._id,
        province: mall.province._id,
        city: mall.city._id,
        district: mall.district ? mall.district._id : null,
        storeAddress: value.storeAddress || mall.address, // 优先使用传入的地址，否则使用商场地址
        storeName: value.storeName,
        score: value.score,
        floor: value.floor,
        unitNumber: value.unitNumber,
        openingHours: value.openingHours,
        isOla: value.isOla,
        isActive: value.isActive,
        phone: value.phone
      };

      const store = new BrandStore(storeData);
      return store.save();
    });

    const createdStores = await Promise.all(storePromises);

    // 返回创建的门店列表，包含商场信息和统计数据
    const responseData = createdStores.map((store, index) => ({
      ...store.toObject(),
      mallInfo: {
        name: malls[index].name,
        address: malls[index].address,
        province: malls[index].province.name,
        city: malls[index].city.name,
        district: malls[index].district ? malls[index].district.name : null
      }
    }));

    // 获取被跳过的商场信息（用于提示）
    const skippedMalls = await Mall.find({ _id: { $in: existingMallIds } }, 'name');
    const skippedMallNames = skippedMalls.map(mall => mall.name);

    ctx.body = {
      success: true,
      message: `成功创建${createdStores.length}个品牌门店${existingMallIds.length > 0 ? `，跳过${existingMallIds.length}个已存在的门店` : ''}`,
      data: {
        created: responseData,
        skipped: existingMallIds.length,
        skippedMalls: skippedMallNames,
        total: mallIds.length
      }
    };
  } catch (error) {
    ctx.status = 500;
    ctx.body = { success: false, message: '创建品牌门店失败', error: error.message };
  }
});

// 更新品牌门店
router.put('/brand-stores/:id', auth, requireAdmin, async (ctx) => {
  try {
    const { error, value } = Joi.object({
      brand: Joi.string(),
      mall: Joi.string(),
      province: Joi.string(),
      city: Joi.string(),
      district: Joi.string().allow(null, ''),
      storeName: Joi.string().allow('', null),
      score: Joi.number().allow(null, 0),
      floor: Joi.string().allow('', null),
      unitNumber: Joi.string().allow('', null),
      openingHours: Joi.string().allow('', null),
      storeAddress: Joi.string().allow('', null),
      isActive: Joi.boolean(),
      isOla: Joi.boolean(),
      phone: Joi.string().allow('', null),
    }).validate(ctx.request.body);

    if (error) {
      ctx.status = 400;
      ctx.body = { success: false, message: error.details[0].message };
      return;
    }

    // 检查是否存在相同品牌和商场的组合（排除当前更新的记录）
    if (value.brand && value.mall) {
      const exists = await BrandStore.findOne({
        brand: value.brand,
        mall: value.mall,
        _id: { $ne: ctx.params.id }
      });
      if (exists) {
        ctx.status = 409;
        ctx.body = { success: false, message: '该品牌已入驻此商场' };
        return;
      }
    }

    const store = await BrandStore.findByIdAndUpdate(
      ctx.params.id,
      value,
      { new: true, runValidators: true }
    ).populate('brand', 'name')
      .populate('mall', 'name')
      .populate('province', 'name')
      .populate('city', 'name')
      .populate('district', 'name');

    if (!store) {
      ctx.status = 404;
      ctx.body = { success: false, message: '品牌门店不存在' };
      return;
    }

    ctx.body = { success: true, message: '品牌门店更新成功', data: store };
  } catch (error) {
    ctx.status = 500;
    ctx.body = { success: false, message: '更新品牌门店失败', error: error.message };
  }
});

// 更新品牌状态
router.post('/brands-status', auth, requireAdmin, async (ctx) => {
  console.log(1234)
  try {
    const { error, value } = Joi.object({
      id: Joi.string().required(),
      status: Joi.string().valid('pending', 'approved', 'rejected').required(),
    }).validate(ctx.request.body);

    if (error) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: error.details[0].message
      };
      return;
    }
    const brand = await Brand.findByIdAndUpdate(
      value.id,
      { status: value.status },
      { new: true, runValidators: true }
    );

    if (!brand) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: '品牌不存在'
      };
      return;
    }

    ctx.body = {
      success: true,
      message: '品牌状态更新成功',
      data: brand
    };
  } catch (error) {
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '更新品牌状态失败',
      error: error.message
    };
  }
});

// 删除品牌门店
router.delete('/brand-stores/:id', auth, requireAdmin, async (ctx) => {
  try {
    const store = await BrandStore.findByIdAndDelete(ctx.params.id);
    if (!store) {
      ctx.status = 404;
      ctx.body = { success: false, message: '品牌门店不存在' };
      return;
    }
    ctx.body = { success: true, message: '品牌门店删除成功' };
  } catch (error) {
    ctx.status = 500;
    ctx.body = { success: false, message: '删除品牌门店失败', error: error.message };
  }
});

// 获取品牌门店列表
router.get('/brand-stores', auth, async (ctx) => {
  try {
    const { page = 1, limit = 0, brand, brandId, mallId, provinceId, cityId, districtId } = ctx.query;
    const skip = (page - 1) * limit;
    let query = {};
    if (brand) query.brand = brand;
    if (brandId) query.brand = brandId;
    if (mallId) query.mall = mallId;
    if (provinceId) query.province = provinceId;
    if (cityId) query.city = cityId;
    if (districtId) query.district = districtId;

    const stores = await BrandStore.find(query)
      .populate('brand', 'name')
      .populate('mall', 'name address')
      .populate('province', 'name')
      .populate('city', 'name')
      .populate('district', 'name')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await BrandStore.countDocuments(query);

    ctx.body = {
      success: true,
      data: {
        stores,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: limit > 0 ? Math.ceil(total / limit) : 1
        }
      }
    };
  } catch (error) {
    ctx.status = 500;
    ctx.body = { success: false, message: '获取品牌门店列表失败', error: error.message };
  }
});

// 省份管理
// 创建省份
router.post('/provinces', auth, requireAdmin, async (ctx) => {
  try {
    const { error, value } = Joi.object({
      name: Joi.string().required(),
      code: Joi.string().required(),
      brandCount: Joi.number().default(0),
      mallCount: Joi.number().default(0),
      districtCount: Joi.number().default(0)
    }).validate(ctx.request.body);

    if (error) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: error.details[0].message
      };
      return;
    }

    const province = new Province(value);
    await province.save();

    ctx.body = {
      success: true,
      message: '省份创建成功',
      data: province
    };
  } catch (error) {
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '创建省份失败',
      error: error.message
    };
  }
});

// 更新省份
router.put('/provinces/:id', auth, requireAdmin, async (ctx) => {
  try {
    const { error, value } = Joi.object({
      name: Joi.string(),
      code: Joi.string(),
      brandCount: Joi.number(),
      mallCount: Joi.number(),
      districtCount: Joi.number(),
      isActive: Joi.boolean()
    }).validate(ctx.request.body);

    if (error) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: error.details[0].message
      };
      return;
    }

    const province = await Province.findByIdAndUpdate(
      ctx.params.id,
      value,
      { new: true, runValidators: true }
    );

    if (!province) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: '省份不存在'
      };
      return;
    }

    ctx.body = {
      success: true,
      message: '省份更新成功',
      data: province
    };
  } catch (error) {
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '更新省份失败',
      error: error.message
    };
  }
});

// 删除省份
router.delete('/provinces/:id', auth, requireAdmin, async (ctx) => {
  try {
    const province = await Province.findByIdAndDelete(ctx.params.id);
    if (!province) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: '省份不存在'
      };
      return;
    }

    ctx.body = {
      success: true,
      message: '省份删除成功'
    };
  } catch (error) {
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '删除省份失败',
      error: error.message
    };
  }
});

// 城市管理
// 创建城市
router.post('/cities', auth, requireAdmin, async (ctx) => {
  try {
    const { error, value } = Joi.object({
      name: Joi.string().required(),
      code: Joi.string().required(),
      province: Joi.string().required(),
      brandCount: Joi.number().default(0),
      mallCount: Joi.number().default(0),
      districtCount: Joi.number().default(0)
    }).validate(ctx.request.body);

    if (error) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: error.details[0].message
      };
      return;
    }

    const city = new City(value);
    await city.save();

    ctx.body = {
      success: true,
      message: '城市创建成功',
      data: city
    };
  } catch (error) {
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '创建城市失败',
      error: error.message
    };
  }
});

// 更新城市
router.put('/cities/:id', auth, requireAdmin, async (ctx) => {
  try {
    const { error, value } = Joi.object({
      name: Joi.string(),
      code: Joi.string(),
      province: Joi.string(),
      brandCount: Joi.number(),
      mallCount: Joi.number(),
      districtCount: Joi.number(),
      isActive: Joi.boolean()
    }).validate(ctx.request.body);

    if (error) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: error.details[0].message
      };
      return;
    }

    const city = await City.findByIdAndUpdate(
      ctx.params.id,
      value,
      { new: true, runValidators: true }
    );

    if (!city) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: '城市不存在'
      };
      return;
    }

    ctx.body = {
      success: true,
      message: '城市更新成功',
      data: city
    };
  } catch (error) {
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '更新城市失败',
      error: error.message
    };
  }
});

// 删除城市
router.delete('/cities/:id', auth, requireAdmin, async (ctx) => {
  try {
    const city = await City.findByIdAndDelete(ctx.params.id);
    if (!city) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: '城市不存在'
      };
      return;
    }

    ctx.body = {
      success: true,
      message: '城市删除成功'
    };
  } catch (error) {
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '删除城市失败',
      error: error.message
    };
  }
});

// 区县管理
// 创建区县
router.post('/districts', auth, requireAdmin, async (ctx) => {
  try {
    const { error, value } = Joi.object({
      name: Joi.string().required(),
      code: Joi.string().required(),
      city: Joi.string().required(),
      province: Joi.string().required(),
      brandCount: Joi.number().default(0),
      mallCount: Joi.number().default(0)
    }).validate(ctx.request.body);

    if (error) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: error.details[0].message
      };
      return;
    }

    const district = new District(value);
    await district.save();

    ctx.body = {
      success: true,
      message: '区县创建成功',
      data: district
    };
  } catch (error) {
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '创建区县失败',
      error: error.message
    };
  }
});

// 更新区县
router.put('/districts/:id', auth, requireAdmin, async (ctx) => {
  try {
    const { error, value } = Joi.object({
      name: Joi.string(),
      code: Joi.string(),
      city: Joi.string(),
      province: Joi.string(),
      brandCount: Joi.number(),
      mallCount: Joi.number(),
      isActive: Joi.boolean()
    }).validate(ctx.request.body);

    if (error) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: error.details[0].message
      };
      return;
    }

    const district = await District.findByIdAndUpdate(
      ctx.params.id,
      value,
      { new: true, runValidators: true }
    );

    if (!district) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: '区县不存在'
      };
      return;
    }

    ctx.body = {
      success: true,
      message: '区县更新成功',
      data: district
    };
  } catch (error) {
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '更新区县失败',
      error: error.message
    };
  }
});

// 删除区县
router.delete('/districts/:id', auth, requireAdmin, async (ctx) => {
  try {
    const district = await District.findByIdAndDelete(ctx.params.id);
    if (!district) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: '区县不存在'
      };
      return;
    }

    ctx.body = {
      success: true,
      message: '区县删除成功'
    };
  } catch (error) {
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '删除区县失败',
      error: error.message
    };
  }
});

// 品牌管理
// 创建品牌
router.post('/brands', auth, requireAdmin, async (ctx) => {
  try {
    const { error, value } = Joi.object({
      name: Joi.string().required(),
      code: Joi.string(),
      description: Joi.string(),
      logo: Joi.string(),
      website: Joi.string().uri(),
      category: Joi.string(),
      province: Joi.string(),
      city: Joi.string(),
      district: Joi.string(),
      address: Joi.string(),
      contactPhone: Joi.string(),
      contactEmail: Joi.string().email(),
      sort: Joi.number(),
    }).validate(ctx.request.body);

    if (error) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: error.details[0].message
      };
      return;
    }

    const brand = new Brand(value);
    await brand.save();

    ctx.body = {
      success: true,
      message: '品牌创建成功',
      data: brand
    };
  } catch (error) {
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '创建品牌失败',
      error: error.message
    };
  }
});

// 更新品牌
router.put('/brands/:id', auth, requireAdmin, async (ctx) => {
  try {
    const { error, value } = Joi.object({
      name: Joi.string().required(),
      code: Joi.string().allow('', null),
      description: Joi.string().allow('', null),
      logo: Joi.string().allow('', null),
      website: Joi.string().uri().allow('', null),
      category: Joi.string().allow('', null),
      province: Joi.string().allow('', null),
      city: Joi.string().allow('', null),
      district: Joi.string().allow('', null),
      address: Joi.string().allow('', null),
      contactPhone: Joi.string().allow('', null),
      contactEmail: Joi.string().email().allow('', null),
      isActive: Joi.boolean(),
      sort: Joi.number(),
      score: Joi.number(),
      status: Joi.string().valid('pending', 'approved', 'rejected'),
    }).validate(ctx.request.body);

    if (error) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: error.details[0].message
      };
      return;
    }

    const brand = await Brand.findByIdAndUpdate(
      ctx.params.id,
      value,
      { new: true, runValidators: true }
    );

    if (!brand) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: '品牌不存在'
      };
      return;
    }

    ctx.body = {
      success: true,
      message: '品牌更新成功',
      data: brand
    };
  } catch (error) {
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '更新品牌失败',
      error: error.message
    };
  }
});

// 删除品牌
router.delete('/brands/:id', auth, requireAdmin, async (ctx) => {
  try {
    const brand = await Brand.findByIdAndDelete(ctx.params.id);
    if (!brand) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: '品牌不存在'
      };
      return;
    }

    ctx.body = {
      success: true,
      message: '品牌删除成功'
    };
  } catch (error) {
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '删除品牌失败',
      error: error.message
    };
  }
});









// 获取字典列表
router.get('/dictionaries', async (ctx) => {
  try {
    const { page = 1, limit = 20, type, search } = ctx.query;
    const skip = (page - 1) * limit;

    let query = {};
    if (type) {
      query.type = type;
    }
    if (search) {
      query.$or = [
        { label: { $regex: search, $options: 'i' } },
        { value: { $regex: search, $options: 'i' } },
        { type: { $regex: search, $options: 'i' } }
      ];
    }

    const dictionaries = await Dictionary.find(query)
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ type: 1, sort: 1, createdAt: -1 });

    const total = await Dictionary.countDocuments(query);

    ctx.body = {
      success: true,
      data: {
        dictionaries,
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
      message: '获取字典列表失败',
      error: error.message
    };
  }
});

// 获取字典类型列表
router.get('/dictionaries/types', async (ctx) => {
  try {
    const types = await Dictionary.distinct('type');

    ctx.body = {
      success: true,
      data: { types }
    };
  } catch (error) {
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '获取字典类型失败',
      error: error.message
    };
  }
});

// 创建字典项
router.post('/dictionaries', async (ctx) => {
  try {
    const { type, label, value, sort, description, isActive } = ctx.request.body;

    // 验证必需字段
    if (!type || !label || !value) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '类型、标签和值都是必需的'
      };
      return;
    }

    const dictionary = new Dictionary({
      type,
      label,
      value,
      sort: sort || 0,
      description,
      isActive: isActive !== undefined ? isActive : true
    });

    await dictionary.save();

    ctx.body = {
      success: true,
      data: { dictionary },
      message: '字典项创建成功'
    };
  } catch (error) {
    if (error.code === 11000) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '该类型下的值已存在'
      };
    } else {
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: '创建字典项失败',
        error: error.message
      };
    }
  }
});

// 更新字典项
router.put('/dictionaries/:id', async (ctx) => {
  try {
    const { id } = ctx.params;
    const { type, label, value, sort, description, isActive } = ctx.request.body;

    const dictionary = await Dictionary.findByIdAndUpdate(
      id,
      {
        type,
        label,
        value,
        sort,
        description,
        isActive
      },
      { new: true, runValidators: true }
    );

    if (!dictionary) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: '字典项不存在'
      };
      return;
    }

    ctx.body = {
      success: true,
      data: { dictionary },
      message: '字典项更新成功'
    };
  } catch (error) {
    if (error.code === 11000) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '该类型下的值已存在'
      };
    } else {
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: '更新字典项失败',
        error: error.message
      };
    }
  }
});

// 删除字典项
router.delete('/dictionaries/:id', async (ctx) => {
  try {
    const { id } = ctx.params;

    const dictionary = await Dictionary.findByIdAndDelete(id);

    if (!dictionary) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: '字典项不存在'
      };
      return;
    }

    ctx.body = {
      success: true,
      message: '字典项删除成功'
    };
  } catch (error) {
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '删除字典项失败',
      error: error.message
    };
  }
});

// 批量更新字典项排序
router.put('/dictionaries/batch/sort', async (ctx) => {
  try {
    const { items } = ctx.request.body; // [{ id, sort }, ...]

    if (!Array.isArray(items)) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '请提供有效的排序数据'
      };
      return;
    }

    // 批量更新排序
    const updatePromises = items.map(item =>
      Dictionary.findByIdAndUpdate(item.id, { sort: item.sort })
    );

    await Promise.all(updatePromises);

    ctx.body = {
      success: true,
      message: '排序更新成功'
    };
  } catch (error) {
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '更新排序失败',
      error: error.message
    };
  }
});

module.exports = router;