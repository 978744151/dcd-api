const mongoose = require('mongoose');
require('dotenv').config({ path: './config.env' });

// 导入模型
const Province = require('../models/Province');
const City = require('../models/City');
const District = require('../models/District');

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

// 清空所有省市区数据
const clearAllData = async () => {
    console.log('清空所有省市区数据...');
    await District.deleteMany({});
    await City.deleteMany({});
    await Province.deleteMany({});
    console.log('✓ 所有省市区数据已清空');
};

// 重新插入省份数据（基于 china-location 数据源）
const insertProvinces = async () => {
    console.log('\n重新插入省份数据...');
    
    // 基于 china-location 数据结构的省份列表
    const provincesData = [
        { name: '北京市', code: '110000', brandCount: 0, mallCount: 0, districtCount: 0 },
        { name: '天津市', code: '120000', brandCount: 0, mallCount: 0, districtCount: 0 },
        { name: '河北省', code: '130000', brandCount: 0, mallCount: 0, districtCount: 0 },
        { name: '山西省', code: '140000', brandCount: 0, mallCount: 0, districtCount: 0 },
        { name: '内蒙古自治区', code: '150000', brandCount: 0, mallCount: 0, districtCount: 0 },
        { name: '辽宁省', code: '210000', brandCount: 0, mallCount: 0, districtCount: 0 },
        { name: '吉林省', code: '220000', brandCount: 0, mallCount: 0, districtCount: 0 },
        { name: '黑龙江省', code: '230000', brandCount: 0, mallCount: 0, districtCount: 0 },
        { name: '上海市', code: '310000', brandCount: 0, mallCount: 0, districtCount: 0 },
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
        { name: '广西壮族自治区', code: '450000', brandCount: 0, mallCount: 0, districtCount: 0 },
        { name: '海南省', code: '460000', brandCount: 0, mallCount: 0, districtCount: 0 },
        { name: '重庆市', code: '500000', brandCount: 0, mallCount: 0, districtCount: 0 },
        { name: '四川省', code: '510000', brandCount: 0, mallCount: 0, districtCount: 0 },
        { name: '贵州省', code: '520000', brandCount: 0, mallCount: 0, districtCount: 0 },
        { name: '云南省', code: '530000', brandCount: 0, mallCount: 0, districtCount: 0 },
        { name: '西藏自治区', code: '540000', brandCount: 0, mallCount: 0, districtCount: 0 },
        { name: '陕西省', code: '610000', brandCount: 0, mallCount: 0, districtCount: 0 },
        { name: '甘肃省', code: '620000', brandCount: 0, mallCount: 0, districtCount: 0 },
        { name: '青海省', code: '630000', brandCount: 0, mallCount: 0, districtCount: 0 },
        { name: '宁夏回族自治区', code: '640000', brandCount: 0, mallCount: 0, districtCount: 0 },
        { name: '新疆维吾尔自治区', code: '650000', brandCount: 0, mallCount: 0, districtCount: 0 },
        { name: '台湾省', code: '830000', brandCount: 0, mallCount: 0, districtCount: 0 },
        { name: '香港特别行政区', code: '810000', brandCount: 0, mallCount: 0, districtCount: 0 },
        { name: '澳门特别行政区', code: '820000', brandCount: 0, mallCount: 0, districtCount: 0 }
    ];

    const provinces = [];
    for (const data of provincesData) {
        const province = new Province({
            ...data,
            isActive: true
        });
        await province.save();
        provinces.push(province);
        console.log(`  ✓ ${province.name} (${province.code})`);
    }
    
    console.log(`✓ 省份数据插入完成，共 ${provinces.length} 个省份`);
    return provinces;
};

// 重新插入城市和区县数据
const insertCitiesAndDistricts = async (provinces) => {
    console.log('\n重新插入城市和区县数据...');
    
    const https = require('https');
    const fs = require('fs');
    const path = require('path');
    
    const DATA_DIR = path.join(__dirname, 'data');
    const LOCATION_URL = 'https://cdn.jsdelivr.net/npm/china-location@2.1.0/dist/location.json';
    
    const ensureDataDir = () => {
        if (!fs.existsSync(DATA_DIR)) {
            fs.mkdirSync(DATA_DIR, { recursive: true });
        }
    };
    
    const downloadJson = (url, cacheName) => {
        return new Promise((resolve, reject) => {
            ensureDataDir();
            const cachePath = path.join(DATA_DIR, cacheName);
            if (fs.existsSync(cachePath)) {
                try {
                    const content = fs.readFileSync(cachePath, 'utf-8');
                    return resolve(JSON.parse(content));
                } catch (e) {
                    // 继续尝试重新下载
                }
            }

            console.log(`下载数据: ${url}`);
            https
                .get(url, (res) => {
                    if (res.statusCode !== 200) {
                        reject(new Error(`HTTP ${res.statusCode} 获取失败: ${url}`));
                        return;
                    }
                    let raw = '';
                    res.setEncoding('utf8');
                    res.on('data', (chunk) => (raw += chunk));
                    res.on('end', () => {
                        try {
                            const json = JSON.parse(raw);
                            fs.writeFileSync(cachePath, JSON.stringify(json, null, 2), 'utf-8');
                            resolve(json);
                        } catch (err) {
                            reject(err);
                        }
                    });
                })
                .on('error', (err) => reject(err));
        });
    };
    
    const normalizeCityName = (provinceName, cityName) => {
        if (cityName === '市辖区') return provinceName;
        if (cityName === '县') return provinceName;
        return cityName;
    };
    
    // 建立省份索引
    const provincesByCode = {};
    provinces.forEach(p => provincesByCode[String(p.code)] = p);
    
    // 下载并处理数据
    const location = await downloadJson(LOCATION_URL, 'location.json');
    
    let cityCount = 0;
    let districtCount = 0;
    
    for (const provinceCode of Object.keys(location)) {
        const p = location[provinceCode];
        const provinceDoc = provincesByCode[String(p.code)];
        if (!provinceDoc) {
            console.log(`  ⚠️ 省份未匹配：${p.name} (${p.code})`);
            continue;
        }
        
        const citiesObj = p.cities || {};
        for (const cityCodeKey of Object.keys(citiesObj)) {
            const c = citiesObj[cityCodeKey];
            const cityCode = String(c.code);
            const cityName = normalizeCityName(provinceDoc.name, c.name);
            
            const cityDoc = await City.create({
                name: cityName,
                code: cityCode,
                province: provinceDoc._id,
                brandCount: 0,
                mallCount: 0,
                districtCount: 0,
                isActive: true
            });
            cityCount++;
            
            const districtsObj = c.districts || {};
            for (const districtCode of Object.keys(districtsObj)) {
                const code = String(districtCode);
                const name = districtsObj[districtCode];
                
                await District.create({
                    name,
                    code,
                    city: cityDoc._id,
                    province: provinceDoc._id,
                    brandCount: 0,
                    mallCount: 0,
                    isActive: true
                });
                districtCount++;
            }
        }
    }
    
    console.log(`✓ 城市数据插入完成，共 ${cityCount} 个城市`);
    console.log(`✓ 区县数据插入完成，共 ${districtCount} 个区县`);
};

// 更新统计字段
const updateCounts = async () => {
    console.log('\n更新统计字段...');
    
    // 更新每个城市的 districtCount
    const cities = await City.find({});
    for (const city of cities) {
        const count = await District.countDocuments({ city: city._id, isActive: true });
        if (city.districtCount !== count) {
            city.districtCount = count;
            await city.save();
        }
    }

    // 更新每个省份的 districtCount
    const provinces = await Province.find({});
    for (const province of provinces) {
        const count = await District.countDocuments({ province: province._id, isActive: true });
        if (province.districtCount !== count) {
            province.districtCount = count;
            await province.save();
        }
    }
    
    console.log('✓ 统计字段已更新');
};

// 验证数据完整性
const verifyData = async () => {
    console.log('\n验证数据完整性...');
    
    const provinceCount = await Province.countDocuments();
    const cityCount = await City.countDocuments();
    const districtCount = await District.countDocuments();
    
    console.log(`省份总数: ${provinceCount}`);
    console.log(`城市总数: ${cityCount}`);
    console.log(`区县总数: ${districtCount}`);
    
    // 检查关联关系
    const citiesWithoutProvince = await City.countDocuments({ province: { $exists: false } });
    const districtsWithoutCity = await District.countDocuments({ city: { $exists: false } });
    const districtsWithoutProvince = await District.countDocuments({ province: { $exists: false } });
    
    console.log(`无关联省份的城市: ${citiesWithoutProvince}`);
    console.log(`无关联城市的区县: ${districtsWithoutCity}`);
    console.log(`无关联省份的区县: ${districtsWithoutProvince}`);
    
    // 显示示例数据
    const sampleProvince = await Province.findOne();
    const sampleCity = await City.findOne().populate('province');
    const sampleDistricts = await District.find({ city: sampleCity._id }).limit(5);
    
    console.log('\n示例数据:');
    console.log(`省份: ${sampleProvince.name} (${sampleProvince.code}) - 区县数: ${sampleProvince.districtCount}`);
    console.log(`城市: ${sampleCity.name} (${sampleCity.code}) - 省份: ${sampleCity.province.name} - 区县数: ${sampleCity.districtCount}`);
    console.log('区县示例:');
    sampleDistricts.forEach(d => console.log(`  - ${d.name} (${d.code})`));
};

// 主函数
const main = async () => {
    try {
        console.log('=== 省市区数据完全重置与重新初始化 ===');
        console.log('⚠️  此操作将清空所有现有省市区数据并重新构建');
        
        await connectDB();
        
        // 1. 清空所有数据
        await clearAllData();
        
        // 2. 重新插入省份
        const provinces = await insertProvinces();
        
        // 3. 重新插入城市和区县
        await insertCitiesAndDistricts(provinces);
        
        // 4. 更新统计字段
        await updateCounts();
        
        // 5. 验证数据
        await verifyData();
        
        console.log('\n✅ 省市区数据完全重置与重新初始化完成！');
        console.log('所有省份、城市、区县的ID已重新生成并正确关联');
        
        process.exit(0);
    } catch (error) {
        console.error('重置失败:', error.message);
        process.exit(1);
    }
};

// 显示使用说明
if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log(`
=== 省市区数据完全重置与重新初始化工具 ===

⚠️  警告：此操作将清空所有现有省市区数据并重新构建！

使用方法:
  node scripts/reset-all-divisions.js       # 完全重置并重新初始化
  node scripts/reset-all-divisions.js --help # 显示此帮助信息

功能说明:
  - 清空所有省份、城市、区县数据
  - 重新插入34个省份（包含台湾省 830000）
  - 重新插入所有城市和区县数据
  - 自动建立正确的关联关系
  - 更新所有统计字段
  - 验证数据完整性

适用场景:
  - 省份ID与城市区县不匹配
  - 需要完全重新构建数据
  - 数据关联关系混乱
`);
    process.exit(0);
}

main(); 