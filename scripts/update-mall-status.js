const mongoose = require('mongoose');
require('dotenv').config({ path: '../config.env' });

// 连接数据库
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const Mall = require('../models/Mall');

async function updateMallStatus() {
  try {
    console.log('开始更新商场status字段...');
    
    // 将所有没有status字段或status为null的商场设置为0（营业中）
    const result = await Mall.updateMany(
      {
        $or: [
          { status: { $exists: false } },
          { status: null }
        ]
      },
      { $set: { status: 0 } }
    );
    
    console.log(`成功更新了 ${result.modifiedCount} 个商场的status字段为0（营业中）`);
    
    // 显示更新后的统计信息
    const statusStats = await Mall.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);
    
    console.log('\n商场status状态统计：');
    statusStats.forEach(stat => {
      const statusText = stat._id === 0 ? '营业中' : 
                        stat._id === 2 ? '已关闭' : 
                        stat._id === 3 ? '不显示' : '未知';
      console.log(`  status ${stat._id} (${statusText}): ${stat.count} 个商场`);
    });
    
  } catch (error) {
    console.error('更新商场status字段失败:', error);
  } finally {
    mongoose.connection.close();
  }
}

updateMallStatus();