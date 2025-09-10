const mongoose = require('mongoose');
require('dotenv').config({ path: './config.env' });

// 导入模型
const Province = require('../models/Province');
const City = require('../models/City');

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

// 主要城市数据（按省份分组）
const citiesData = {
    '北京市': [
        { name: '东城区', code: '110101', brandCount: 25, mallCount: 15, districtCount: 3 },
        { name: '西城区', code: '110102', brandCount: 30, mallCount: 18, districtCount: 4 },
        { name: '朝阳区', code: '110105', brandCount: 45, mallCount: 25, districtCount: 8 },
        { name: '丰台区', code: '110106', brandCount: 20, mallCount: 12, districtCount: 5 },
        { name: '海淀区', code: '110108', brandCount: 35, mallCount: 20, districtCount: 6 }
    ],
    '上海市': [
        { name: '黄浦区', code: '310101', brandCount: 40, mallCount: 22, districtCount: 4 },
        { name: '徐汇区', code: '310104', brandCount: 35, mallCount: 20, districtCount: 5 },
        { name: '长宁区', code: '310105', brandCount: 25, mallCount: 15, districtCount: 3 },
        { name: '静安区', code: '310106', brandCount: 30, mallCount: 18, districtCount: 4 },
        { name: '普陀区', code: '310107', brandCount: 20, mallCount: 12, districtCount: 3 },
        { name: '浦东新区', code: '310115', brandCount: 50, mallCount: 30, districtCount: 8 }
    ],
    '广东省': [
        { name: '广州市', code: '440100', brandCount: 60, mallCount: 35, districtCount: 11 },
        { name: '深圳市', code: '440300', brandCount: 55, mallCount: 32, districtCount: 10 },
        { name: '珠海市', code: '440400', brandCount: 15, mallCount: 8, districtCount: 3 },
        { name: '汕头市', code: '440500', brandCount: 12, mallCount: 7, districtCount: 6 },
        { name: '佛山市', code: '440600', brandCount: 25, mallCount: 15, districtCount: 5 },
        { name: '韶关市', code: '440200', brandCount: 8, mallCount: 5, districtCount: 10 },
        { name: '湛江市', code: '440800', brandCount: 10, mallCount: 6, districtCount: 9 },
        { name: '肇庆市', code: '441200', brandCount: 8, mallCount: 5, districtCount: 8 },
        { name: '江门市', code: '440700', brandCount: 12, mallCount: 7, districtCount: 7 },
        { name: '茂名市', code: '440900', brandCount: 9, mallCount: 5, districtCount: 6 },
        { name: '惠州市', code: '441300', brandCount: 15, mallCount: 9, districtCount: 5 },
        { name: '梅州市', code: '441400', brandCount: 7, mallCount: 4, districtCount: 8 },
        { name: '汕尾市', code: '441500', brandCount: 5, mallCount: 3, districtCount: 4 },
        { name: '河源市', code: '441600', brandCount: 6, mallCount: 4, districtCount: 6 },
        { name: '阳江市', code: '441700', brandCount: 6, mallCount: 4, districtCount: 4 },
        { name: '清远市', code: '441800', brandCount: 8, mallCount: 5, districtCount: 8 },
        { name: '东莞市', code: '441900', brandCount: 30, mallCount: 18, districtCount: 4 },
        { name: '中山市', code: '442000', brandCount: 18, mallCount: 11, districtCount: 3 },
        { name: '潮州市', code: '445100', brandCount: 6, mallCount: 4, districtCount: 4 },
        { name: '揭阳市', code: '445200', brandCount: 7, mallCount: 4, districtCount: 5 },
        { name: '云浮市', code: '445300', brandCount: 5, mallCount: 3, districtCount: 5 }
    ],
    '江苏省': [
        { name: '南京市', code: '320100', brandCount: 35, mallCount: 20, districtCount: 11 },
        { name: '无锡市', code: '320200', brandCount: 25, mallCount: 15, districtCount: 7 },
        { name: '徐州市', code: '320300', brandCount: 18, mallCount: 10, districtCount: 11 },
        { name: '常州市', code: '320400', brandCount: 20, mallCount: 12, districtCount: 7 },
        { name: '苏州市', code: '320500', brandCount: 40, mallCount: 25, districtCount: 10 },
        { name: '南通市', code: '320600', brandCount: 15, mallCount: 9, districtCount: 8 },
        { name: '连云港市', code: '320700', brandCount: 10, mallCount: 6, districtCount: 6 },
        { name: '淮安市', code: '320800', brandCount: 12, mallCount: 7, districtCount: 7 },
        { name: '盐城市', code: '320900', brandCount: 14, mallCount: 8, districtCount: 9 },
        { name: '扬州市', code: '321000', brandCount: 15, mallCount: 9, districtCount: 6 },
        { name: '镇江市', code: '321100', brandCount: 12, mallCount: 7, districtCount: 6 },
        { name: '泰州市', code: '321200', brandCount: 13, mallCount: 8, districtCount: 6 },
        { name: '宿迁市', code: '321300', brandCount: 10, mallCount: 6, districtCount: 5 }
    ],
    '浙江省': [
        { name: '杭州市', code: '330100', brandCount: 35, mallCount: 20, districtCount: 10 },
        { name: '宁波市', code: '330200', brandCount: 25, mallCount: 15, districtCount: 10 },
        { name: '温州市', code: '330300', brandCount: 20, mallCount: 12, districtCount: 11 },
        { name: '嘉兴市', code: '330400', brandCount: 15, mallCount: 9, districtCount: 7 },
        { name: '湖州市', code: '330500', brandCount: 12, mallCount: 7, districtCount: 5 },
        { name: '绍兴市', code: '330600', brandCount: 18, mallCount: 11, districtCount: 6 },
        { name: '金华市', code: '330700', brandCount: 16, mallCount: 10, districtCount: 9 },
        { name: '衢州市', code: '330800', brandCount: 8, mallCount: 5, districtCount: 6 },
        { name: '舟山市', code: '330900', brandCount: 6, mallCount: 4, districtCount: 4 },
        { name: '台州市', code: '331000', brandCount: 14, mallCount: 8, districtCount: 9 },
        { name: '丽水市', code: '331100', brandCount: 10, mallCount: 6, districtCount: 9 }
    ],
    '山东省': [
        { name: '济南市', code: '370100', brandCount: 25, mallCount: 15, districtCount: 10 },
        { name: '青岛市', code: '370200', brandCount: 30, mallCount: 18, districtCount: 10 },
        { name: '淄博市', code: '370300', brandCount: 15, mallCount: 9, districtCount: 8 },
        { name: '枣庄市', code: '370400', brandCount: 8, mallCount: 5, districtCount: 6 },
        { name: '东营市', code: '370500', brandCount: 10, mallCount: 6, districtCount: 5 },
        { name: '烟台市', code: '370600', brandCount: 20, mallCount: 12, districtCount: 12 },
        { name: '潍坊市', code: '370700', brandCount: 18, mallCount: 11, districtCount: 12 },
        { name: '济宁市', code: '370800', brandCount: 12, mallCount: 7, districtCount: 11 },
        { name: '泰安市', code: '370900', brandCount: 10, mallCount: 6, districtCount: 6 },
        { name: '威海市', code: '371000', brandCount: 12, mallCount: 7, districtCount: 4 },
        { name: '日照市', code: '371100', brandCount: 8, mallCount: 5, districtCount: 4 },
        { name: '临沂市', code: '371300', brandCount: 15, mallCount: 9, districtCount: 12 },
        { name: '德州市', code: '371400', brandCount: 10, mallCount: 6, districtCount: 11 },
        { name: '聊城市', code: '371500', brandCount: 8, mallCount: 5, districtCount: 8 },
        { name: '滨州市', code: '371600', brandCount: 9, mallCount: 5, districtCount: 7 },
        { name: '菏泽市', code: '371700', brandCount: 10, mallCount: 6, districtCount: 9 }
    ]
};

// 批量插入城市数据
const insertCities = async () => {
    try {
        console.log('开始插入城市数据...');

        // 清空现有城市数据（可选）
        const clearExisting = process.argv.includes('--clear');
        if (clearExisting) {
            await City.deleteMany({});
            console.log('已清空现有城市数据');
        }

        let insertedCount = 0;
        let skippedCount = 0;
        let errorCount = 0;

        // 获取所有省份
        const provinces = await Province.find({});
        const provinceMap = {};
        provinces.forEach(province => {
            provinceMap[province.name] = province._id;
        });

        for (const [provinceName, cities] of Object.entries(citiesData)) {
            const provinceId = provinceMap[provinceName];
            if (!provinceId) {
                console.log(`⚠️  省份 ${provinceName} 不存在，跳过其城市数据`);
                continue;
            }

            console.log(`\n处理省份: ${provinceName}`);

            for (const cityData of cities) {
                try {
                    const existingCity = await City.findOne({
                        $or: [
                            { name: cityData.name, province: provinceId },
                            { code: cityData.code }
                        ]
                    });

                    if (!existingCity) {
                        const city = new City({
                            ...cityData,
                            province: provinceId,
                            isActive: true
                        });
                        await city.save();
                        console.log(`  ✓ 城市 ${cityData.name} (${cityData.code}) 插入成功`);
                        insertedCount++;
                    } else {
                        console.log(`  - 城市 ${cityData.name} (${cityData.code}) 已存在，跳过`);
                        skippedCount++;
                    }
                } catch (error) {
                    console.error(`  ✗ 插入城市 ${cityData.name} 失败:`, error.message);
                    errorCount++;
                }
            }
        }

        console.log('\n=== 城市数据插入完成 ===');
        console.log(`新插入: ${insertedCount} 个城市`);
        console.log(`已存在: ${skippedCount} 个城市`);
        console.log(`插入失败: ${errorCount} 个城市`);

    } catch (error) {
        console.error('批量插入城市数据失败:', error.message);
        throw error;
    }
};

// 验证插入结果
const verifyData = async () => {
    try {
        const totalCount = await City.countDocuments();
        const activeCount = await City.countDocuments({ isActive: true });

        console.log('\n=== 数据验证 ===');
        console.log(`数据库中城市总数: ${totalCount}`);
        console.log(`激活状态城市数: ${activeCount}`);

        // 按省份统计城市数量
        const cityCountByProvince = await City.aggregate([
            { $match: { isActive: true } },
            {
                $lookup: {
                    from: 'provinces',
                    localField: 'province',
                    foreignField: '_id',
                    as: 'provinceInfo'
                }
            },
            { $unwind: '$provinceInfo' },
            {
                $group: {
                    _id: '$provinceInfo.name',
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } }
        ]);

        console.log('\n各省份城市数量:');
        cityCountByProvince.forEach(item => {
            console.log(`  ${item._id}: ${item.count} 个城市`);
        });

        // 显示前5个城市作为示例
        const sampleCities = await City.find()
            .populate('province', 'name')
            .limit(5)
            .select('name code province brandCount mallCount districtCount');

        console.log('\n示例数据:');
        sampleCities.forEach(city => {
            console.log(`  ${city.name} (${city.code}) - 省份:${city.province.name} 品牌:${city.brandCount} 商场:${city.mallCount} 区县:${city.districtCount}`);
        });

    } catch (error) {
        console.error('数据验证失败:', error.message);
    }
};

// 主函数
const main = async () => {
    try {
        console.log('=== 中国城市数据自动化插入工具 ===\n');

        await connectDB();
        await insertCities();
        await verifyData();

        console.log('\n城市数据自动化处理完成！');
        process.exit(0);
    } catch (error) {
        console.error('自动化处理失败:', error.message);
        process.exit(1);
    }
};

// 显示使用说明
if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log(`
=== 中国城市数据自动化插入工具 ===

使用方法:
  node scripts/init-cities.js          # 插入城市数据（跳过已存在的）
  node scripts/init-cities.js --clear  # 清空现有数据后重新插入
  node scripts/init-cities.js --help   # 显示此帮助信息

功能说明:
  - 自动插入主要城市数据，按省份分组
  - 包含城市名称、代码、品牌数、商场数、区县数
  - 自动关联到对应的省份
  - 支持增量插入和全量重置
  - 自动验证插入结果和省市关联关系
`);
    process.exit(0);
}

// 运行主函数
main();