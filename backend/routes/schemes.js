const express = require('express');
const router = express.Router();
const Scheme = require('../models/Scheme');

const DEFAULT_SCHEMES = [
  {
    title: 'PM-KISAN Samman Nidhi',
    category: 'Central',
    subtitle: 'Income support to farmers',
    benefit: '₹6,000 / year in 3 installments',
    url: 'https://pmkisan.gov.in/',
    icon: 'bank',
    iconColor: '#0F766E',
    iconBg: '#CCFBF1',
  },
  {
    title: 'Pradhan Mantri Fasal Bima Yojana',
    category: 'Central',
    subtitle: 'Crop insurance scheme',
    benefit: 'Comprehensive crop loss coverage at minimal premium',
    url: 'https://pmfby.gov.in/',
    icon: 'shield-check',
    iconColor: '#16A34A',
    iconBg: '#DCFCE7',
  },
  {
    title: 'Kisan Credit Card (KCC)',
    category: 'Central',
    subtitle: 'Easy credit for farmers',
    benefit: 'Low-interest loans up to ₹3 Lakh at 4% effective interest',
    url: 'https://myscheme.gov.in/schemes/kcc',
    icon: 'credit-card-outline',
    iconColor: '#2563EB',
    iconBg: '#EFF6FF',
  },
  {
    title: 'PM Krishi Sinchayee Yojana (PMKSY)',
    category: 'Central',
    subtitle: 'Har Khet Ko Pani & Per Drop More Crop',
    benefit: 'Up to 55% subsidy for modern drip & sprinkler irrigation systems',
    url: 'https://pmksy.gov.in/',
    icon: 'water-pump',
    iconColor: '#0284C7',
    iconBg: '#E0F2FE',
  },
];

// @route   GET /api/v1/schemes
// @desc    Get all government schemes
router.get('/', async (req, res) => {
  try {
    let count = await Scheme.countDocuments();
    if (count === 0) {
      await Scheme.insertMany(DEFAULT_SCHEMES);
    }
    const schemes = await Scheme.find().sort({ createdAt: -1 });
    res.json(schemes);
  } catch (error) {
    console.error('Fetch Schemes Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// @route   POST /api/v1/schemes
// @desc    Admin: Add a new scheme
router.post('/', async (req, res) => {
  try {
    const { title, category, subtitle, benefit, url, details, icon, iconColor, iconBg } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Scheme title is required' });
    }

    const newScheme = new Scheme({
      title: title.trim(),
      category: category === 'State' ? 'State' : 'Central',
      subtitle: subtitle ? subtitle.trim() : 'Government Agricultural Initiative',
      benefit: benefit ? benefit.trim() : 'Financial Assistance and Subsidy',
      url: url ? url.trim() : 'https://myscheme.gov.in',
      details: details ? details.trim() : '',
      icon: icon || 'bank',
      iconColor: iconColor || (category === 'State' ? '#D97706' : '#0F766E'),
      iconBg: iconBg || (category === 'State' ? '#FEF3C7' : '#CCFBF1'),
    });

    await newScheme.save();
    console.log(`[SCHEME ADDED]: ${newScheme.title} (${newScheme.category})`);
    res.status(201).json(newScheme);
  } catch (error) {
    console.error('Create Scheme Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// @route   DELETE /api/v1/schemes/:id
// @desc    Admin: Delete a scheme by ID
router.delete('/:id', async (req, res) => {
  try {
    const scheme = await Scheme.findByIdAndDelete(req.params.id);
    if (!scheme) {
      return res.status(404).json({ error: 'Scheme not found' });
    }
    console.log(`[SCHEME DELETED]: ID ${req.params.id} (${scheme.title})`);
    res.json({ success: true, message: 'Scheme deleted successfully', id: req.params.id });
  } catch (error) {
    console.error('Delete Scheme Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
