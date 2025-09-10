const mongoose = require('mongoose');

const brandSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  code: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  logo: {
    type: String
  },
  website: {
    type: String,
    trim: true
  },
  category: {
    type: String,
    trim: true
  },
  // 品牌基础信息，不再强制绑定地理位置；门店分布见 BrandStore
  province: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Province'
  },
  city: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'City'
  },
  district: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'District'
  },
  address: {
    type: String,
    trim: true
  },
  contactPhone: {
    type: String,
    trim: true
  },
  contactEmail: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  sort: {
    type: Number,
    default: 0
  },
  score: {
    type: Number,
    default: 0
  },
}, {
  timestamps: true
});

module.exports = mongoose.model('Brand', brandSchema); 