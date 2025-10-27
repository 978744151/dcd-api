const mongoose = require('mongoose');

const mallSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  code: {
    type: String,
    // required: true,
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
  province: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Province',
    required: true
  },
  city: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'City',
    required: true
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
  floorCount: {
    type: Number,
    default: 1
  },
  totalArea: {
    type: Number,
    default: 0
  },
  parkingSpaces: {
    type: Number,
    default: 0
  },
  openingHours: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  status: {
    type: Number,
    enum: [0, 2, 3], // 0: 营业中, 2: 已关闭, 3: 不显示
    default: 0
  },
  isOla: {
    type: Boolean,
    default: false // 默认不是奥莱商城
  },
  clickCount: {
    type: Number,
    default: 0 // 点击次数，默认为0
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Mall', mallSchema);