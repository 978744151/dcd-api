const mongoose = require('mongoose');

const connectDB = async () => {
  try {

    const conn = await mongoose.connect(process.env.NODE_ENV === 'production' ? process.env.PROD_MONGODB_URI : process.env.DEV_MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`MongoDB 连接成功: ${conn.connection.host}`);
  } catch (error) {
    console.error('MongoDB 连接失败:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB; 