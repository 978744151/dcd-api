const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: './config.env' });

// 导入模型
const User = require('../models/User');
const Province = require('../models/Province');

// 连接数据库
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/dcd_management');
    console.log('MongoDB 连接成功');
  } catch (error) {
    console.error('MongoDB 连接失败:', error.message);
    process.exit(1);
  }
};

// 创建默认管理员用户
const createAdminUser = async () => {
  try {
    // 检查是否已存在管理员用户
    const existingAdmin = await User.findOne({ email: 'admin@dcd.com' });
    if (existingAdmin) {
      console.log('管理员用户已存在');
      return;
    }

    // 创建管理员用户
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const adminUser = new User({
      username: 'admin',
      email: 'admin@dcd.com',
      password: hashedPassword,
      role: 'admin',
      isActive: true
    });

    await adminUser.save();
    console.log('管理员用户创建成功');
  } catch (error) {
    console.error('创建管理员用户失败:', error.message);
  }
};

// 创建示例省份数据
const createSampleProvinces = async () => {
  try {
    const provinces = [
      { name: '北京市', code: '110000', brandCount: 150, mallCount: 80, districtCount: 16 },
      { name: '上海市', code: '310000', brandCount: 180, mallCount: 95, districtCount: 16 },
      { name: '广东省', code: '440000', brandCount: 220, mallCount: 120, districtCount: 21 },
      { name: '江苏省', code: '320000', brandCount: 160, mallCount: 85, districtCount: 13 },
      { name: '浙江省', code: '330000', brandCount: 140, mallCount: 75, districtCount: 11 },
      { name: '山东省', code: '370000', brandCount: 130, mallCount: 70, districtCount: 16 },
      { name: '四川省', code: '510000', brandCount: 110, mallCount: 60, districtCount: 21 },
      { name: '湖北省', code: '420000', brandCount: 100, mallCount: 55, districtCount: 17 },
      { name: '湖南省', code: '430000', brandCount: 90, mallCount: 50, districtCount: 14 },
      { name: '河南省', code: '410000', brandCount: 85, mallCount: 45, districtCount: 18 }
    ];

    for (const provinceData of provinces) {
      const existingProvince = await Province.findOne({ name: provinceData.name });
      if (!existingProvince) {
        const province = new Province(provinceData);
        await province.save();
        console.log(`省份 ${provinceData.name} 创建成功`);
      } else {
        console.log(`省份 ${provinceData.name} 已存在`);
      }
    }
  } catch (error) {
    console.error('创建示例省份数据失败:', error.message);
  }
};

// 主函数
const initDatabase = async () => {
  try {
    await connectDB();
    await createAdminUser();
    await createSampleProvinces();
    console.log('数据库初始化完成');
    process.exit(0);
  } catch (error) {
    console.error('数据库初始化失败:', error.message);
    process.exit(1);
  }
};

// 运行初始化
initDatabase(); 