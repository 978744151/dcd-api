# 城市管理功能使用指南

## 功能概述

城市管理模块提供了完整的省市关联管理功能，支持：
- 省份数据管理
- 城市数据管理
- 省市关联关系
- 数据筛选和搜索
- 批量数据初始化

## 数据结构

### 省份 (Province)
```javascript
{
  name: String,        // 省份名称
  code: String,        // 省份代码
  brandCount: Number,  // 品牌数量
  mallCount: Number,   // 商场数量
  districtCount: Number, // 区县数量
  isActive: Boolean    // 是否激活
}
```

### 城市 (City)
```javascript
{
  name: String,        // 城市名称
  code: String,        // 城市代码
  province: ObjectId,  // 关联省份ID
  brandCount: Number,  // 品牌数量
  mallCount: Number,   // 商场数量
  districtCount: Number, // 区县数量
  isActive: Boolean    // 是否激活
}
```

## 快速开始

### 1. 数据初始化

#### 方式一：完整初始化（推荐）
```bash
npm run init-all
```
这将依次执行：
- 创建管理员用户
- 初始化34个省份数据
- 初始化主要城市数据
- 建立省市关联关系

#### 方式二：分步初始化
```bash
# 1. 初始化省份数据
npm run init-provinces

# 2. 初始化城市数据
npm run init-cities

# 3. 清空重置（可选）
npm run init-provinces-clear
npm run init-cities-clear
```

### 2. 启动服务

```bash
# 启动后端服务
npm run dev

# 启动前端服务
cd client && npm run dev
```

### 3. 访问管理界面

1. 打开浏览器访问前端地址
2. 使用管理员账户登录：
   - 邮箱：`admin@dcd.com`
   - 密码：`admin123`
3. 导航到「城市管理」页面

## 功能使用

### 城市管理页面功能

#### 1. 数据展示
- 表格显示所有城市信息
- 显示城市名称、代码、所属省份
- 显示品牌数、商场数、区县数
- 支持数据排序

#### 2. 筛选功能
- **省份筛选**：选择特定省份查看其下属城市
- **搜索功能**：按城市名称搜索
- **重置筛选**：清空所有筛选条件
- **刷新数据**：重新加载数据

#### 3. 数据管理
- **添加城市**：创建新城市并关联到省份
- **编辑城市**：修改城市信息
- **删除城市**：删除不需要的城市
- **状态管理**：启用/禁用城市

### API接口

#### 城市相关接口
```javascript
// 获取城市列表（支持省份筛选和搜索）
GET /api/map/cities?provinceId=xxx&search=xxx

// 获取城市详情
GET /api/map/cities/:id

// 创建城市
POST /api/admin/cities

// 更新城市
PUT /api/admin/cities/:id

// 删除城市
DELETE /api/admin/cities/:id
```

#### 省份相关接口
```javascript
// 获取省份列表
GET /api/map/provinces

// 获取省份详情（包含下属城市）
GET /api/map/provinces/:id
```

## 数据说明

### 已初始化的数据

#### 省份数据（34个）
- 4个直辖市：北京市、天津市、上海市、重庆市
- 23个省份：河北省、山西省、辽宁省等
- 5个自治区：内蒙古、广西、西藏、宁夏、新疆
- 2个特别行政区：香港、澳门

#### 城市数据（72个主要城市）
- 北京市：5个区（东城区、西城区、朝阳区等）
- 上海市：6个区（黄浦区、徐汇区、浦东新区等）
- 广东省：21个市（广州、深圳、珠海等）
- 江苏省：13个市（南京、苏州、无锡等）
- 浙江省：11个市（杭州、宁波、温州等）
- 山东省：16个市（济南、青岛、烟台等）

### 省市关联关系

每个城市都通过 `province` 字段关联到对应的省份：
```javascript
// 示例：朝阳区关联到北京市
{
  name: "朝阳区",
  code: "110105",
  province: ObjectId("北京市的ID"),
  // ...
}
```

## 开发指南

### 添加新省份

1. 在 `scripts/init-provinces.js` 中添加省份数据
2. 运行 `npm run init-provinces` 更新数据

### 添加新城市

1. 在 `scripts/init-cities.js` 中对应省份下添加城市数据
2. 运行 `npm run init-cities` 更新数据

### 自定义筛选条件

在 `CityManagement.tsx` 中修改 `fetchCities` 函数：
```javascript
const fetchCities = async () => {
  const params = {
    provinceId: selectedProvince,
    search: searchText,
    // 添加其他筛选条件
  };
  // ...
};
```

## 故障排除

### 常见问题

1. **城市数据为空**
   - 检查是否已执行数据初始化
   - 运行 `npm run init-all` 重新初始化

2. **省份筛选不工作**
   - 检查省份数据是否已加载
   - 检查API接口是否正常

3. **关联关系错误**
   - 检查数据库中的省市关联字段
   - 重新运行数据初始化脚本

### 数据验证

运行以下命令验证数据完整性：
```bash
# 检查省份数量
node -e "require('./models/Province'); require('mongoose').connect('mongodb://localhost:27017/dcd_management').then(() => require('./models/Province').countDocuments().then(console.log))"

# 检查城市数量
node -e "require('./models/City'); require('mongoose').connect('mongodb://localhost:27017/dcd_management').then(() => require('./models/City').countDocuments().then(console.log))"
```

## 扩展功能

### 可以进一步开发的功能

1. **区县管理**：在城市基础上添加区县级别管理
2. **批量导入**：支持Excel文件批量导入城市数据
3. **数据统计**：添加省市数据统计图表
4. **地图展示**：在地图上可视化省市分布
5. **数据导出**：支持导出省市数据为Excel

### 性能优化

1. **分页加载**：对大量城市数据进行分页
2. **缓存机制**：缓存省份列表数据
3. **索引优化**：为常用查询字段添加数据库索引

---

## 技术支持

如有问题，请检查：
1. 数据库连接是否正常
2. 所有依赖是否已安装
3. 环境变量是否正确配置
4. 端口是否被占用

更多技术细节请参考项目的 `README.md` 和 `PROJECT_SUMMARY.md` 文件。