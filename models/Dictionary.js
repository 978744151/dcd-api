const mongoose = require('mongoose');

const dictionarySchema = new mongoose.Schema({
  // 字典类型/分类，用于区分不同用途的字典
  type: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  // 字典项的标签/显示名称
  label: {
    type: String,
    required: true,
    trim: true
  },
  // 字典项的值
  value: {
    type: String,
    required: true,
    trim: true
  },
  // 排序序号
  sort: {
    type: Number,
    default: 0
  },
  // 描述信息
  description: {
    type: String,
    trim: true
  },
  // 是否启用
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// 创建复合索引，确保同一类型下的value唯一
dictionarySchema.index({ type: 1, value: 1 }, { unique: true });

module.exports = mongoose.model('Dictionary', dictionarySchema);