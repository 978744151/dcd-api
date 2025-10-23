const mongoose = require('mongoose');
const path = require('path');

// 加载环境变量
require('dotenv').config({ path: path.join(__dirname, '../config.env') });

async function cleanDuplicateUsernames() {
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
    
    // 查找重复的用户名
    console.log('\nSearching for duplicate usernames...');
    const duplicates = await collection.aggregate([
      {
        $group: {
          _id: "$username",
          count: { $sum: 1 },
          docs: { $push: { id: "$_id", createdAt: "$createdAt" } }
        }
      },
      {
        $match: {
          count: { $gt: 1 }
        }
      }
    ]).toArray();
    
    if (duplicates.length === 0) {
      console.log('✅ No duplicate usernames found');
      await mongoose.disconnect();
      return;
    }
    
    console.log(`Found ${duplicates.length} duplicate username(s):`);
    
    for (const duplicate of duplicates) {
      console.log(`\n📋 Username: "${duplicate._id}" (${duplicate.count} duplicates)`);
      
      // 按创建时间排序，保留最早创建的用户
      duplicate.docs.sort((a, b) => {
        if (!a.createdAt && !b.createdAt) return 0;
        if (!a.createdAt) return 1;
        if (!b.createdAt) return -1;
        return new Date(a.createdAt) - new Date(b.createdAt);
      });
      
      const keepUser = duplicate.docs[0];
      const removeUsers = duplicate.docs.slice(1);
      
      console.log(`  ✅ Keeping user: ${keepUser.id} (created: ${keepUser.createdAt || 'unknown'})`);
      
      for (const removeUser of removeUsers) {
        console.log(`  ❌ Removing user: ${removeUser.id} (created: ${removeUser.createdAt || 'unknown'})`);
        
        // 删除重复的用户记录
        const result = await collection.deleteOne({ _id: removeUser.id });
        if (result.deletedCount === 1) {
          console.log(`    ✅ Successfully deleted user ${removeUser.id}`);
        } else {
          console.log(`    ❌ Failed to delete user ${removeUser.id}`);
        }
      }
    }
    
    // 验证清理结果
    console.log('\n🔍 Verifying cleanup...');
    const remainingDuplicates = await collection.aggregate([
      {
        $group: {
          _id: "$username",
          count: { $sum: 1 }
        }
      },
      {
        $match: {
          count: { $gt: 1 }
        }
      }
    ]).toArray();
    
    if (remainingDuplicates.length === 0) {
      console.log('✅ All duplicate usernames have been cleaned up successfully');
    } else {
      console.log(`❌ Still found ${remainingDuplicates.length} duplicate username(s)`);
    }
    
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

cleanDuplicateUsernames();