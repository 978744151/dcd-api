const mongoose = require('mongoose');

const connectDB = async () => {
  try {

    const conn = await mongoose.connect(process.env.NODE_ENV === 'production' ? process.env.PROD_MONGODB_URI : process.env.DEV_MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10, // 连接池大小
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      bufferCommands: false,
      bufferMaxEntries: 0
    });

    console.log(`MongoDB 连接成功: ${conn.connection.host}`);
  } catch (error) {
    console.error('MongoDB 连接失败:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB; 