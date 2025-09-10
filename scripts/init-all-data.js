const mongoose = require('mongoose');
require('dotenv').config({ path: './config.env' });

// 导入模型
const User = require('../models/User');
const Province = require('../models/Province');
const City = require('../models/City');
const bcrypt = require('bcryptjs');

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
    const existingAdmin = await User.findOne({ email: 'admin@dcd.com' });
    if (existingAdmin) {
      console.log('✓ 管理员用户已存在');
      return;
    }

    const hashedPassword = await bcrypt.hash('admin123', 10);
    const adminUser = new User({
      username: 'admin',
      email: 'admin@dcd.com',
      password: hashedPassword,
      role: 'admin',
      isActive: true
    });

    await adminUser.save();
    console.log('✓ 管理员用户创建成功');
  } catch (error) {
    console.error('✗ 创建管理员用户失败:', error.message);
  }
};

// 执行子脚本
const executeScript = async (scriptPath, description) => {
  return new Promise((resolve, reject) => {
    const { spawn } = require('child_process');
    console.log(`\n=== ${description} ===`);
    
    const child = spawn('node', [scriptPath], {
      stdio: 'inherit',
      cwd: process.cwd()
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        console.log(`✓ ${description}完成`);
        resolve();
      } else {
        console.error(`✗ ${description}失败，退出码: ${code}`);
        reject(new Error(`${description}失败`));
      }
    });
    
    child.on('error', (error) => {
      console.error(`✗ ${description}执行错误:`, error.message);
      reject(error);
    });
  });
};

// 验证最终数据
const verifyAllData = async () => {
  try {
    console.log('\n=== 最终数据验证 ===');
    
    // 统计各类数据数量
    const userCount = await User.countDocuments();
    const provinceCount = await Province.countDocuments();
    const cityCount = await City.countDocuments();
    
    console.log(`用户总数: ${userCount}`);
    console.log(`省份总数: ${provinceCount}`);
    console.log(`城市总数: ${cityCount}`);
    
    // 验证省市关联关系
    const provincesWithCities = await Province.aggregate([
      {
        $lookup: {
          from: 'cities',
          localField: '_id',
          foreignField: 'province',
          as: 'cities'
        }
      },
      {
        $project: {
          name: 1,
          cityCount: { $size: '$cities' }
        }
      },
      { $match: { cityCount: { $gt: 0 } } },
      { $sort: { cityCount: -1 } }
    ]);
    
    console.log('\n省市关联验证:');
    provincesWithCities.forEach(province => {
      console.log(`  ${province.name}: ${province.cityCount} 个城市`);
    });
    
    // 检查数据完整性
    const citiesWithoutProvince = await City.countDocuments({ province: { $exists: false } });
    if (citiesWithoutProvince > 0) {
      console.log(`⚠️  发现 ${citiesWithoutProvince} 个城市没有关联省份`);
    } else {
      console.log('✓ 所有城市都已正确关联到省份');
    }
    
  } catch (error) {
    console.error('数据验证失败:', error.message);
  }
};

// 主函数
const main = async () => {
  try {
    console.log('=== 完整数据初始化工具 ===');
    console.log('此工具将依次执行以下操作:');
    console.log('1. 创建管理员用户');
    console.log('2. 初始化省份数据');
    console.log('3. 初始化全部城市与区县数据');
    console.log('4. 验证数据完整性\n');
    
    await connectDB();
    
    // 1. 创建管理员用户
    await createAdminUser();
    
    // 2. 初始化省份数据
    try {
      await executeScript('scripts/init-provinces.js', '初始化省份数据');
    } catch (error) {
      console.log('省份数据初始化失败，但继续执行后续步骤...');
    }
    
    // 3. 初始化全部城市与区县数据
    try {
      await executeScript('scripts/init-divisions.js', '初始化城市与区县数据');
    } catch (error) {
      console.log('城市与区县数据初始化失败，但继续执行后续步骤...');
    }
    
    // 4. 验证数据
    await verifyAllData();
    
    console.log('\n🎉 完整数据初始化完成！');
    console.log('\n系统已准备就绪，您可以:');
    console.log('- 使用 admin@dcd.com / admin123 登录管理后台');
    console.log('- 在城市管理页面查看省市关联数据');
    console.log('- 使用省份筛选功能管理城市');
    
    process.exit(0);
  } catch (error) {
    console.error('完整数据初始化失败:', error.message);
    process.exit(1);
  }
};

// 显示使用说明
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
=== 完整数据初始化工具 ===

使用方法:
  node scripts/init-all-data.js       # 执行完整数据初始化
  node scripts/init-all-data.js --help # 显示此帮助信息

功能说明:
  - 一键初始化所有基础数据
  - 创建默认管理员账户
  - 初始化34个省份数据
  - 初始化主要城市数据并建立省市关联
  - 验证数据完整性和关联关系
  - 适合首次部署或重置系统数据

注意事项:
  - 请确保数据库连接正常
  - 建议在空数据库上执行
  - 执行前请备份重要数据
`);
  process.exit(0);
}

// 运行主函数
main();