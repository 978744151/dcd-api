const mongoose = require('mongoose');

const citySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  code: {
    type: String,
    required: true,
    trim: true
  },
  province: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Province',
    required: true
  },
  brandCount: {
    type: Number,
    default: 0
  },
  mallCount: {
    type: Number,
    default: 0
  },
  districtCount: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// 复合索引确保同一省份下城市名称唯一
citySchema.index({ province: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('City', citySchema); 