const mongoose = require('mongoose');

const mandiPriceSchema = new mongoose.Schema(
  {
    commodity: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      enum: ['Crops', 'Fruits', 'Vegetables'],
      default: 'Crops',
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    unit: {
      type: String,
      default: '/ quintal',
    },
    market: {
      type: String,
      required: true,
      trim: true,
    },
    state: {
      type: String,
      default: 'Uttarakhand',
      trim: true,
    },
    change: {
      type: String,
      default: '+1.5%',
    },
    isUp: {
      type: Boolean,
      default: true,
    },
    icon: {
      type: String,
      default: 'barley',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('MandiPrice', mandiPriceSchema);
