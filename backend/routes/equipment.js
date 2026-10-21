const express = require('express');
const router = express.Router();
const Equipment = require('../models/Equipment');

// @route   POST /api/v1/equipment
// @desc    Admin: Add new equipment
router.post('/', async (req, res) => {
  try {
    const { name, ownerName, phone, location, price, imageUrl } = req.body;
    
    const equipment = new Equipment({
      name,
      ownerName,
      phone,
      location,
      price,
      imageUrl: imageUrl || 'https://images.unsplash.com/photo-1592982537447-6f29f03226db?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
    });

    await equipment.save();
    res.status(201).json(equipment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// @route   GET /api/v1/equipment
// @desc    Get all equipment
router.get('/', async (req, res) => {
  try {
    const equipmentList = await Equipment.find().sort({ createdAt: -1 });
    res.json(equipmentList);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// @route   PUT /api/v1/equipment/:id
// @desc    Admin: Update equipment
router.put('/:id', async (req, res) => {
  try {
    const equipment = await Equipment.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!equipment) return res.status(404).json({ error: 'Equipment not found' });
    res.json(equipment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// @route   DELETE /api/v1/equipment/:id
// @desc    Admin: Delete equipment
router.delete('/:id', async (req, res) => {
  try {
    const equipment = await Equipment.findByIdAndDelete(req.params.id);
    if (!equipment) return res.status(404).json({ error: 'Equipment not found' });
    res.json({ message: 'Equipment deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
