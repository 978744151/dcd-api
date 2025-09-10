const https = require('https');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: './config.env' });

// 模型
const Province = require('../models/Province');
const City = require('../models/City');
const District = require('../models/District');

// 常量
const DATA_DIR = path.join(__dirname, 'data');
// 数据源：china-location（包含省/市/区的完整树形结构）
// 结构示例：[{ code: '110000', name: '北京市', cities: [{ code: '110000', name: '北京市', districts: [{ code:'110101', name:'东城区' }, ...]}]}]
const LOCATION_URL = 'https://cdn.jsdelivr.net/npm/china-location@2.1.0/dist/location.json';

// DB 连接
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/dcd_management');
        console.log('MongoDB 连接成功');
    } catch (error) {
        console.error('MongoDB 连接失败:', error.message);
        process.exit(1);
    }
};

const ensureDataDir = () => {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }
};

const downloadJson = (url, cacheName) => {
    return new Promise((resolve, reject) => {
        ensureDataDir();
        const cachePath = path.join(DATA_DIR, cacheName);
        // 如果已缓存，直接读取
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

// 将“市辖区”等规范为省名（直辖市）作为城市展示名
const normalizeCityName = (provinceName, cityName) => {
    if (cityName === '市辖区') return provinceName;
    if (cityName === '县') return provinceName;
    return cityName;
};

// 插入/更新 城市
const upsertCities = async (provincesDbByCode, citiesJson) => {
    console.log('\n开始插入城市数据...');
    const clearCities = process.argv.includes('--clear-cities');
    if (clearCities) {
        await City.deleteMany({});
        console.log('已清空现有城市数据');
    }

    let inserted = 0;
    let skipped = 0;
    let updated = 0;

    for (const c of citiesJson) {
        const provinceDoc = provincesDbByCode[c.provinceCode];
        if (!provinceDoc) {
            console.log(`  ⚠️ 未找到省份(code=${c.provinceCode})，跳过城市 ${c.name} (${c.code})`);
            continue;
        }
        const displayName = normalizeCityName(provinceDoc.name, c.name);
        const existing = await City.findOne({ code: String(c.code) });
        if (!existing) {
            await City.create({
                name: displayName,
                code: String(c.code),
                province: provinceDoc._id,
                brandCount: 0,
                mallCount: 0,
                districtCount: 0,
                isActive: true
            });
            inserted++;
        } else {
            // 更新名称与关联省份（若不一致）
            const needUpdate =
                existing.name !== displayName ||
                String(existing.province) !== String(provinceDoc._id);
            if (needUpdate) {
                existing.name = displayName;
                existing.province = provinceDoc._id;
                await existing.save();
                updated++;
            } else {
                skipped++;
            }
        }
    }

    console.log(`城市 插入:${inserted} 更新:${updated} 跳过:${skipped}`);
};

// 插入/更新 区县
const upsertDistricts = async (provincesDbByCode, citiesDbByCode, areasJson) => {
    console.log('\n开始插入区县数据...');
    const clearDistricts = process.argv.includes('--clear-districts');
    if (clearDistricts) {
        await District.deleteMany({});
        console.log('已清空现有区县数据');
    }

    let inserted = 0;
    let skipped = 0;
    let missingCity = 0;

    for (const a of areasJson) {
        const provinceDoc = provincesDbByCode[a.provinceCode] || provincesDbByCode[String(a.provinceCode)];
        const cityDoc = citiesDbByCode[a.cityCode] || citiesDbByCode[String(a.cityCode)];
        if (!provinceDoc || !cityDoc) {
            missingCity++;
            continue;
        }

        const existing = await District.findOne({ code: String(a.code) });
        if (!existing) {
            await District.create({
                name: a.name,
                code: String(a.code),
                city: cityDoc._id,
                province: provinceDoc._id,
                brandCount: 0,
                mallCount: 0,
                isActive: true
            });
            inserted++;
        } else {
            skipped++;
        }
    }

    console.log(`区县 插入:${inserted} 跳过:${skipped} 未匹配城市/省:${missingCity}`);
};

// 回写统计字段
const refreshCounts = async () => {
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

    // 更新每个省份的 districtCount（按城市汇总）
    const provinces = await Province.find({});
    for (const province of provinces) {
        const cityIds = await City.find({ province: province._id }).distinct('_id');
        const count = await District.countDocuments({ province: province._id, city: { $in: cityIds }, isActive: true });
        if (province.districtCount !== count) {
            province.districtCount = count;
            await province.save();
        }
    }
    console.log('统计字段已更新');
};

// 主流程
const main = async () => {
    try {
        console.log('=== 中国省市区全量初始化工具 ===');
        console.log('数据来源: china-division 4.1.0');

        await connectDB();

        // 读取数据库中的省份（按 code 建立索引）
        const provincesDb = await Province.find({});
        const provincesDbByCode = {};
        provincesDb.forEach((p) => (provincesDbByCode[String(p.code)] = p));

        // 下载/读取 JSON 数据
        // 读取树形 location.json
        const location = await downloadJson(LOCATION_URL, 'location.json');

        // 遍历插入城市和区县
        const clearCities = process.argv.includes('--clear-cities');
        const clearDistricts = process.argv.includes('--clear-districts');
        if (clearCities) {
            await City.deleteMany({});
            console.log('已清空现有城市数据');
        }
        if (clearDistricts) {
            await District.deleteMany({});
            console.log('已清空现有区县数据');
        }

        let cityInserted = 0;
        let cityUpdated = 0;
        let citySkipped = 0;
        let districtInserted = 0;
        let districtSkipped = 0;

        // location 为对象，以省份 code 为键
        for (const provinceCode of Object.keys(location)) {
            const p = location[provinceCode];
            const provinceDoc = provincesDbByCode[String(p.code)];
            if (!provinceDoc) {
                console.log(`  ⚠️ 省份未匹配：${p.name} (${p.code})`);
                continue;
            }
            const citiesObj = p.cities || {};
            for (const cityCodeKey of Object.keys(citiesObj)) {
                const c = citiesObj[cityCodeKey];
                const cityCode = String(c.code);
                const cityName = normalizeCityName(provinceDoc.name, c.name);
                let cityDoc = await City.findOne({ code: cityCode });
                if (!cityDoc) {
                    cityDoc = await City.create({
                        name: cityName,
                        code: cityCode,
                        province: provinceDoc._id,
                        brandCount: 0,
                        mallCount: 0,
                        districtCount: 0,
                        isActive: true
                    });
                    cityInserted++;
                } else {
                    const needUpdate =
                        cityDoc.name !== cityName || String(cityDoc.province) !== String(provinceDoc._id);
                    if (needUpdate) {
                        cityDoc.name = cityName;
                        cityDoc.province = provinceDoc._id;
                        await cityDoc.save();
                        cityUpdated++;
                    } else {
                        citySkipped++;
                    }
                }

                const districtsObj = c.districts || {};
                for (const districtCode of Object.keys(districtsObj)) {
                    const code = String(districtCode);
                    const name = districtsObj[districtCode];
                    const existing = await District.findOne({ code });
                    if (!existing) {
                        await District.create({
                            name,
                            code,
                            city: cityDoc._id,
                            province: provinceDoc._id,
                            brandCount: 0,
                            mallCount: 0,
                            isActive: true
                        });
                        districtInserted++;
                    } else {
                        districtSkipped++;
                    }
                }
            }
        }

        console.log(`城市 插入:${cityInserted} 更新:${cityUpdated} 跳过:${citySkipped}`);
        console.log(`区县 插入:${districtInserted} 跳过:${districtSkipped}`);

        // 统计字段
        await refreshCounts();

        // 示例输出
        const sampleCity = await City.findOne({}).populate('province', 'name');
        if (sampleCity) {
            const sampleDistricts = await District.find({ city: sampleCity._id }).limit(5).select('name code');
            console.log(`\n示例: ${sampleCity.province.name} - ${sampleCity.name} (${sampleCity.code}) 区县数: ${sampleCity.districtCount}`);
            sampleDistricts.forEach((d) => console.log(`  - ${d.name} (${d.code})`));
        }

        console.log('\n✅ 省市区全量初始化完成');
        process.exit(0);
    } catch (error) {
        console.error('省市区初始化失败:', error.message);
        process.exit(1);
    }
};

if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log(`
=== 中国省市区全量初始化工具 ===

用法:
  node scripts/init-divisions.js                 # 全量插入/更新城市与区县
  node scripts/init-divisions.js --clear-cities  # 清空城市后重建
  node scripts/init-divisions.js --clear-districts # 清空区县后重建
  node scripts/init-divisions.js --help          # 查看帮助

说明:
  - 自动下载 china-division 行政区划数据并缓存至 scripts/data
  - 按省份(code)关联城市，按城市(code)关联区县
  - 直辖市将把“市辖区/县”规范显示为省名（如 北京市）
  - 自动刷新 City/Province 的 districtCount 统计
`);
    process.exit(0);
}

main();

