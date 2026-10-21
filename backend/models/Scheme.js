const mongoose = require('mongoose');

const schemeSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      enum: ['Central', 'State'],
      default: 'Central',
    },
    subtitle: {
      type: String,
      trim: true,
      default: 'Government support scheme for farmers',
    },
    benefit: {
      type: String,
      trim: true,
      default: 'Financial assistance and agricultural subsidy',
    },
    details: {
      type: String,
    },
    url: {
      type: String,
      default: 'https://myscheme.gov.in',
    },
    icon: {
      type: String,
      default: 'bank',
    },
    iconColor: {
      type: String,
      default: '#0F766E',
    },
    iconBg: {
      type: String,
      default: '#CCFBF1',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Scheme', schemeSchema);
