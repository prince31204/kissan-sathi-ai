const express = require('express');
const router = express.Router();
const http = require('http');

// Helper to call ML Backend
const callMLBackend = async (endpoint, method = 'GET', payload = null) => {
  const mlBase = (process.env.ML_BACKEND_URL || 'https://kissan-sathi-ai-zgjs.onrender.com').replace(/\/$/, '');
  const res = await fetch(`${mlBase}${endpoint}`, {
    method: method,
    headers: { 'Content-Type': 'application/json' },
    ...(payload ? { body: JSON.stringify(payload) } : {}),
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`ML backend error: ${res.status}`);
  return await res.json();
};

// @route  GET /api/v1/crop-recommendation/options
router.get('/options', async (req, res) => {
  try {
    const result = await callMLBackend('/api/crop-recommendation/options', 'GET');
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// @route  GET /api/v1/crop-recommendation/lookup-pin/:pincode
router.get('/lookup-pin/:pincode', async (req, res) => {
  try {
    const result = await callMLBackend(`/api/crop-recommendation/lookup-pin/${encodeURIComponent(req.params.pincode)}`, 'GET');
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// @route  POST /api/v1/crop-recommendation/predict
router.post('/predict', async (req, res) => {
  try {
    const result = await callMLBackend('/api/predict-crop', 'POST', req.body);
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
