const express = require('express');
const router = express.Router();
const MandiPrice = require('../models/MandiPrice');

const INITIAL_MANDI_DATA = [
  // Crops
  { commodity: 'Wheat', category: 'Crops', price: 2150, unit: '/ quintal', market: 'Dehradun Mandi', state: 'Uttarakhand', change: '+2.5%', isUp: true, icon: 'barley' },
  { commodity: 'Rice', category: 'Crops', price: 2800, unit: '/ quintal', market: 'Haridwar Mandi', state: 'Uttarakhand', change: '+1.2%', isUp: true, icon: 'rice' },
  { commodity: 'Maize', category: 'Crops', price: 1850, unit: '/ quintal', market: 'Kashipur Mandi', state: 'Uttarakhand', change: '+0.8%', isUp: true, icon: 'corn' },
  { commodity: 'Mustard', category: 'Crops', price: 5200, unit: '/ quintal', market: 'Rishikesh Mandi', state: 'Uttarakhand', change: '+1.5%', isUp: true, icon: 'flower' },
  { commodity: 'Soybean', category: 'Crops', price: 4300, unit: '/ quintal', market: 'Haldwani Mandi', state: 'Uttarakhand', change: '-0.4%', isUp: false, icon: 'seed' },

  // Fruits
  { commodity: 'Apple', category: 'Fruits', price: 7500, unit: '/ quintal', market: 'Nainital Mandi', state: 'Uttarakhand', change: '+3.2%', isUp: true, icon: 'fruit-cherries' },
  { commodity: 'Mango', category: 'Fruits', price: 4200, unit: '/ quintal', market: 'Dehradun Mandi', state: 'Uttarakhand', change: '+1.8%', isUp: true, icon: 'fruit-pineapple' },
  { commodity: 'Banana', category: 'Fruits', price: 2200, unit: '/ quintal', market: 'Haridwar Mandi', state: 'Uttarakhand', change: '+0.5%', isUp: true, icon: 'fruit-citrus' },
  { commodity: 'Guava', category: 'Fruits', price: 3100, unit: '/ quintal', market: 'Roorkee Mandi', state: 'Uttarakhand', change: '-1.0%', isUp: false, icon: 'apple' },

  // Vegetables
  { commodity: 'Potato', category: 'Vegetables', price: 1200, unit: '/ quintal', market: 'Kashipur Mandi', state: 'Uttarakhand', change: '-0.5%', isUp: false, icon: 'circle-slice-8' },
  { commodity: 'Tomato', category: 'Vegetables', price: 1800, unit: '/ quintal', market: 'Dehradun Mandi', state: 'Uttarakhand', change: '+0.3%', isUp: true, icon: 'fruit-grapes' },
  { commodity: 'Onion', category: 'Vegetables', price: 2400, unit: '/ quintal', market: 'Haridwar Mandi', state: 'Uttarakhand', change: '+2.1%', isUp: true, icon: 'sprout' },
  { commodity: 'Cauliflower', category: 'Vegetables', price: 1600, unit: '/ quintal', market: 'Rishikesh Mandi', state: 'Uttarakhand', change: '-1.2%', isUp: false, icon: 'leaf' },
];

// @route   GET /api/mandi-prices
// @desc    Get mandi prices (supports category & commodity search)
router.get('/', async (req, res) => {
  try {
    const count = await MandiPrice.countDocuments();
    if (count === 0) {
      await MandiPrice.insertMany(INITIAL_MANDI_DATA);
    }

    const { category, commodity, state } = req.query;
    let query = {};

    if (category) {
      query.category = category;
    }
    if (commodity) {
      query.commodity = { $regex: commodity, $options: 'i' };
    }
    if (state) {
      query.state = { $regex: state, $options: 'i' };
    }

    const list = await MandiPrice.find(query).sort({ createdAt: -1 });

    // Format for backward compatibility & frontend consumption
    const formatted = list.map((item) => ({
      _id: item._id,
      id: item._id.toString(),
      commodity: item.commodity,
      Commodity: item.commodity,
      category: item.category,
      price: item.price,
      Modal_Price: item.price.toString(),
      formattedPrice: `₹ ${item.price.toLocaleString('en-IN')}`,
      unit: item.unit || '/ quintal',
      market: item.market,
      Market_Name: item.market,
      state: item.state,
      STATE: item.state,
      change: item.change || '+1.0%',
      isUp: item.isUp !== undefined ? item.isUp : true,
      icon: item.icon || 'barley',
      createdAt: item.createdAt,
    }));

    res.json(formatted);
  } catch (error) {
    console.error('Fetch Mandi Prices Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// @route   POST /api/mandi-prices
// @desc    Admin: Add a new mandi price
router.post('/', async (req, res) => {
  try {
    const { commodity, category, price, unit, market, state, change, isUp, icon } = req.body;

    if (!commodity || !price || !market) {
      return res.status(400).json({ error: 'Commodity name, price, and market name are required.' });
    }

    const validCategories = ['Crops', 'Fruits', 'Vegetables'];
    const selectedCat = validCategories.includes(category) ? category : 'Crops';

    const defaultIcon =
      selectedCat === 'Fruits' ? 'fruit-cherries' : selectedCat === 'Vegetables' ? 'fruit-grapes' : 'barley';

    const newMandiPrice = new MandiPrice({
      commodity: commodity.trim(),
      category: selectedCat,
      price: Number(price),
      unit: unit ? unit.trim() : '/ quintal',
      market: market.trim(),
      state: state ? state.trim() : 'Uttarakhand',
      change: change ? change.trim() : '+1.0%',
      isUp: isUp !== undefined ? isUp : true,
      icon: icon || defaultIcon,
    });

    await newMandiPrice.save();
    console.log(`[MANDI PRICE ADDED]: ${newMandiPrice.commodity} - ₹${newMandiPrice.price} (${newMandiPrice.category})`);
    res.status(201).json(newMandiPrice);
  } catch (error) {
    console.error('Add Mandi Price Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// @route   DELETE /api/mandi-prices/:id
// @desc    Admin: Delete a mandi price
router.delete('/:id', async (req, res) => {
  try {
    const item = await MandiPrice.findByIdAndDelete(req.params.id);
    if (!item) {
      return res.status(404).json({ error: 'Mandi price record not found' });
    }
    console.log(`[MANDI PRICE DELETED]: ${item.commodity} (${item._id})`);
    res.json({ success: true, message: 'Mandi price deleted successfully', id: req.params.id });
  } catch (error) {
    console.error('Delete Mandi Price Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
