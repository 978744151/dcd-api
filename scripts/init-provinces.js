const mongoose = require('mongoose');
require('dotenv').config({ path: './config.env' });

// 导入模型
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

// 中国34个省级行政区完整数据
const provincesData = [
    // 直辖市
    { name: '北京市', code: '110000', brandCount: 0, mallCount: 0, districtCount: 0 },
    { name: '天津市', code: '120000', brandCount: 0, mallCount: 0, districtCount: 0 },
    { name: '上海市', code: '310000', brandCount: 0, mallCount: 0, districtCount: 0 },
    { name: '重庆市', code: '500000', brandCount: 0, mallCount: 0, districtCount: 0 },

    // 省份
    { name: '河北省', code: '130000', brandCount: 0, mallCount: 0, districtCount: 0 },
    { name: '山西省', code: '140000', brandCount: 0, mallCount: 0, districtCount: 0 },
    { name: '辽宁省', code: '210000', brandCount: 0, mallCount: 0, districtCount: 0 },
    { name: '吉林省', code: '220000', brandCount: 0, mallCount: 0, districtCount: 0 },
    { name: '黑龙江省', code: '230000', brandCount: 0, mallCount: 0, districtCount: 0 },
    { name: '江苏省', code: '320000', brandCount: 0, mallCount: 0, districtCount: 0 },
    { name: '浙江省', code: '330000', brandCount: 0, mallCount: 0, districtCount: 0 },
    { name: '安徽省', code: '340000', brandCount: 0, mallCount: 0, districtCount: 0 },
    { name: '福建省', code: '350000', brandCount: 0, mallCount: 0, districtCount: 0 },
    { name: '江西省', code: '360000', brandCount: 0, mallCount: 0, districtCount: 0 },
    { name: '山东省', code: '370000', brandCount: 0, mallCount: 0, districtCount: 0 },
    { name: '河南省', code: '410000', brandCount: 0, mallCount: 0, districtCount: 0 },
    { name: '湖北省', code: '420000', brandCount: 0, mallCount: 0, districtCount: 0 },
    { name: '湖南省', code: '430000', brandCount: 0, mallCount: 0, districtCount: 0 },
    { name: '广东省', code: '440000', brandCount: 0, mallCount: 0, districtCount: 0 },
    { name: '海南省', code: '460000', brandCount: 0, mallCount: 0, districtCount: 0 },
    { name: '四川省', code: '510000', brandCount: 0, mallCount: 0, districtCount: 0 },
    { name: '贵州省', code: '520000', brandCount: 0, mallCount: 0, districtCount: 0 },
    { name: '云南省', code: '530000', brandCount: 0, mallCount: 0, districtCount: 0 },
    { name: '陕西省', code: '610000', brandCount: 0, mallCount: 0, districtCount: 0 },
    { name: '甘肃省', code: '620000', brandCount: 0, mallCount: 0, districtCount: 0 },
    { name: '青海省', code: '630000', brandCount: 0, mallCount: 0, districtCount: 0 },
    { name: '台湾省', code: '710000', brandCount: 0, mallCount: 0, districtCount: 0 },

    // 自治区
    { name: '内蒙古自治区', code: '150000', brandCount: 0, mallCount: 0, districtCount: 0 },
    { name: '广西壮族自治区', code: '450000', brandCount: 0, mallCount: 0, districtCount: 0 },
    { name: '西藏自治区', code: '540000', brandCount: 0, mallCount: 0, districtCount: 0 },
    { name: '宁夏回族自治区', code: '640000', brandCount: 0, mallCount: 0, districtCount: 0 },
    { name: '新疆维吾尔自治区', code: '650000', brandCount: 0, mallCount: 0, districtCount: 0 },

    // 特别行政区
    { name: '香港特别行政区', code: '810000', brandCount: 0, mallCount: 0, districtCount: 0 },
    { name: '澳门特别行政区', code: '820000', brandCount: 0, mallCount: 0, districtCount: 0 }
];

// 批量插入省份数据
const insertProvinces = async () => {
    try {
        console.log('开始插入省份数据...');

        // 清空现有省份数据（可选）
        const clearExisting = process.argv.includes('--clear');
        if (clearExisting) {
            await Province.deleteMany({});
            console.log('已清空现有省份数据');
        }

        let insertedCount = 0;
        let skippedCount = 0;

        for (const provinceData of provincesData) {
            try {
                const existingProvince = await Province.findOne({
                    $or: [
                        { name: provinceData.name },
                        { code: provinceData.code }
                    ]
                });

                if (!existingProvince) {
                    const province = new Province({
                        ...provinceData,
                        isActive: true
                    });
                    await province.save();
                    console.log(`✓ 省份 ${provinceData.name} (${provinceData.code}) 插入成功`);
                    insertedCount++;
                } else {
                    console.log(`- 省份 ${provinceData.name} (${provinceData.code}) 已存在，跳过`);
                    skippedCount++;
                }
            } catch (error) {
                console.error(`✗ 插入省份 ${provinceData.name} 失败:`, error.message);
            }
        }

        console.log('\n=== 省份数据插入完成 ===');
        console.log(`总计: ${provincesData.length} 个省份`);
        console.log(`新插入: ${insertedCount} 个`);
        console.log(`已存在: ${skippedCount} 个`);

    } catch (error) {
        console.error('批量插入省份数据失败:', error.message);
        throw error;
    }
};

// 验证插入结果
const verifyData = async () => {
    try {
        const totalCount = await Province.countDocuments();
        const activeCount = await Province.countDocuments({ isActive: true });

        console.log('\n=== 数据验证 ===');
        console.log(`数据库中省份总数: ${totalCount}`);
        console.log(`激活状态省份数: ${activeCount}`);

        // 显示前5个省份作为示例
        const sampleProvinces = await Province.find().limit(5).select('name code brandCount mallCount districtCount');
        console.log('\n示例数据:');
        sampleProvinces.forEach(province => {
            console.log(`  ${province.name} (${province.code}) - 品牌:${province.brandCount} 商场:${province.mallCount} 区县:${province.districtCount}`);
        });

    } catch (error) {
        console.error('数据验证失败:', error.message);
    }
};

// 主函数
const main = async () => {
    try {
        console.log('=== 中国省份数据自动化插入工具 ===\n');

        await connectDB();
        await insertProvinces();
        await verifyData();

        console.log('\n省份数据自动化处理完成！');
        process.exit(0);
    } catch (error) {
        console.error('自动化处理失败:', error.message);
        process.exit(1);
    }
};

// 显示使用说明
if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log(`
=== 中国省份数据自动化插入工具 ===

使用方法:
  node scripts/init-provinces.js          # 插入省份数据（跳过已存在的）
  node scripts/init-provinces.js --clear  # 清空现有数据后重新插入
  node scripts/init-provinces.js --help   # 显示此帮助信息

功能说明:
  - 自动插入中国34个省级行政区数据
  - 包含直辖市、省份、自治区、特别行政区
  - 每个省份包含名称、代码、品牌数、商场数、区县数
  - 支持增量插入和全量重置
  - 自动验证插入结果
`);
    process.exit(0);
}

// 运行主函数
main();