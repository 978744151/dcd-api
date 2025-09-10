const mongoose = require('mongoose');
require('dotenv').config({ path: '../config.env' });

// 导入所有模型
const User = require('../models/User');
const Brand = require('../models/Brand');
const BrandStore = require('../models/BrandStore');
const Province = require('../models/Province');
const City = require('../models/City');
const District = require('../models/District');
const Mall = require('../models/Mall');

async function migrateData() {
  try {
    // 连接开发环境数据库
    const devConnection = await mongoose.createConnection(process.env.DEV_MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    // 连接生产环境数据库
    const prodConnection = await mongoose.createConnection(process.env.PROD_MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('数据库连接成功');

    // 获取开发环境的模型
    const DevUser = devConnection.model('User', User.schema);
    const DevBrand = devConnection.model('Brand', Brand.schema);
    const DevBrandStore = devConnection.model('BrandStore', BrandStore.schema);
    const DevProvince = devConnection.model('Province', Province.schema);
    const DevCity = devConnection.model('City', City.schema);
    const DevDistrict = devConnection.model('District', District.schema);
    const DevMall = devConnection.model('Mall', Mall.schema);

    // 获取生产环境的模型
    const ProdUser = prodConnection.model('User', User.schema);
    const ProdBrand = prodConnection.model('Brand', Brand.schema);
    const ProdBrandStore = prodConnection.model('BrandStore', BrandStore.schema);
    const ProdProvince = prodConnection.model('Province', Province.schema);
    const ProdCity = prodConnection.model('City', City.schema);
    const ProdDistrict = prodConnection.model('District', District.schema);
    const ProdMall = prodConnection.model('Mall', Mall.schema);

    // 迁移数据的函数
    async function migrateCollection(DevModel, ProdModel, collectionName) {
      console.log(`开始迁移 ${collectionName}...`);

      // 清空生产环境的集合（可选，根据需要决定）
      // await ProdModel.deleteMany({});

      // 获取开发环境数据
      const devData = await DevModel.find({});

      if (devData.length > 0) {
        // 批量插入到生产环境
        await ProdModel.insertMany(devData, { ordered: false });
        console.log(`${collectionName} 迁移完成: ${devData.length} 条记录`);
      } else {
        console.log(`${collectionName} 没有数据需要迁移`);
      }
    }

    // 按顺序迁移各个集合
    await migrateCollection(DevProvince, ProdProvince, 'provinces');
    await migrateCollection(DevCity, ProdCity, 'cities');
    await migrateCollection(DevDistrict, ProdDistrict, 'districts');
    await migrateCollection(DevMall, ProdMall, 'malls');
    await migrateCollection(DevBrand, ProdBrand, 'brands');
    await migrateCollection(DevBrandStore, ProdBrandStore, 'brandstores');
    await migrateCollection(DevUser, ProdUser, 'users');

    console.log('所有数据迁移完成！');

    // 关闭连接
    await devConnection.close();
    await prodConnection.close();

  } catch (error) {
    console.error('数据迁移失败:', error);
    process.exit(1);
  }
}

// 执行迁移
migrateData();