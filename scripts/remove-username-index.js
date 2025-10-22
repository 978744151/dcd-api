const mongoose = require('mongoose');
const path = require('path');

// 加载环境变量
require('dotenv').config({ path: path.join(__dirname, '../config.env') });

async function removeUsernameIndex() {
  try {
    // 根据环境选择数据库连接字符串
    const mongoUri = process.env.NODE_ENV === 'production' 
      ? process.env.PROD_MONGODB_URI 
      : process.env.DEV_MONGODB_URI;
    
    console.log('Environment:', process.env.NODE_ENV);
    console.log('Connecting to:', mongoUri);
    
    // 连接数据库
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');
    
    const db = mongoose.connection.db;
    const collection = db.collection('users');
    
    // 查看现有索引
    console.log('\nCurrent indexes:');
    const indexes = await collection.indexes();
    indexes.forEach(index => {
      console.log(`- ${index.name}: ${JSON.stringify(index.key)}`);
    });
    
    // 删除username索引
    try {
      await collection.dropIndex('username_1');
      console.log('\n✅ Successfully dropped username_1 index');
    } catch (error) {
      if (error.code === 27) {
        console.log('\n⚠️  Index username_1 does not exist');
      } else {
        console.log('\n❌ Error dropping index:', error.message);
      }
    }
    
    // 再次查看索引确认
    console.log('\nIndexes after removal:');
    const newIndexes = await collection.indexes();
    newIndexes.forEach(index => {
      console.log(`- ${index.name}: ${JSON.stringify(index.key)}`);
    });
    
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

removeUsernameIndex();