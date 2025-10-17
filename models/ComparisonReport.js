const mongoose = require('mongoose');

const comparisonReportSchema = new mongoose.Schema({
  // 用户ID
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },

  // 报告标题（用户可自定义）
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },

  // 对比类型：'mall' | 'city'
  type: {
    type: String,
    required: true,
    enum: ['mall', 'city']
  },

  // 对比的ID列表（商场或城市ID）
  comparisonIds: [{
    type: mongoose.Schema.ObjectId,
    required: true
  }],

  // 品牌筛选ID列表（可选）
  brandIds: [{
    type: mongoose.Schema.ObjectId,
    ref: 'Brand'
  }],

  // 选择的商场或城市名称，用逗号分隔
  selectedLocations: {
    type: String,
    trim: true
  },

  // 对比结果数据
  results: [{
    location: {
      id: {
        type: mongoose.Schema.ObjectId,
        required: true
      },
      name: {
        type: String,
        required: true
      },
      type: {
        type: String,
        required: true
      },
      city: {
        type: String,
        required: true
      },
      province: {
        type: String,
        required: true
      }
    },
    brands: [{
      brand: {
        _id: mongoose.Schema.ObjectId,
        name: String,
        category: Number,
        score: Number,
        code: String
      },
      storeCount: Number,
      totalScore: Number,
      averageScore: String
    }],
    summary: {
      totalBrands: Number,
      totalStores: Number,
      totalScore: String,
      averageScore: String
    }
  }],

  // 对比摘要
  summary: {
    totalLocations: Number,
    totalBrands: Number,
    totalStores: Number,
    averageScore: String
  },

  // 用户备注
  notes: {
    type: String,
    maxlength: 500
  },

  // 是否收藏
  isFavorite: {
    type: Boolean,
    default: false
  },

  // 创建时间
  createdAt: {
    type: Date,
    default: Date.now
  },

  // 更新时间
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// 创建索引
comparisonReportSchema.index({ user: 1, createdAt: -1 });
comparisonReportSchema.index({ user: 1, type: 1 });
comparisonReportSchema.index({ user: 1, isFavorite: 1 });

module.exports = mongoose.model('ComparisonReport', comparisonReportSchema);