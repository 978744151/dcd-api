const mongoose = require('mongoose');

const brandStoreSchema = new mongoose.Schema({
  brand: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Brand',
    required: true
  },
  mall: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Mall',
  },
  province: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Province',
  },
  city: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'City',
  },
  district: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'District'
  },
  storeName: {
    type: String,
    trim: true
  },
  score: {
    type: Number,
    default: 0
  },
  storeAddress: {
    type: String,
    trim: true
  },
  isOla: {
    type: Boolean
  },
  floor: {
    type: String,
    trim: true
  },
  unitNumber: {
    type: String,
    trim: true
  },
  openingHours: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  phone: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// 保证同一商场中同一品牌唯一
brandStoreSchema.index({ brand: 1, mall: 1 }, { unique: true });

module.exports = mongoose.model('BrandStore', brandStoreSchema);

