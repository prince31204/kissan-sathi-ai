const express = require('express');
const router = express.Router();

// Helper to call ML Backend
const callMLBackend = async (endpoint, method = 'GET', payload = null) => {
  const mlBase = (process.env.ML_BACKEND_URL || 'https://kissan-sathi-ai-zgjs.onrender.com').replace(/\/$/, '');
  const res = await fetch(`${mlBase}${endpoint}`, {
    method: method,
    headers: { 'Content-Type': 'application/json' },
    ...(payload ? { body: JSON.stringify(payload) } : {}),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`ML backend error: ${res.status}`);
  return await res.json();
};

// @route  GET /api/v1/fertilizer/crop-requirements
router.get('/crop-requirements', async (req, res) => {
  try {
    const result = await callMLBackend('/api/fertilizer/crop-requirements', 'GET');
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// @route  POST /api/v1/fertilizer/predict
router.post('/predict', async (req, res) => {
  try {
    const result = await callMLBackend('/api/fertilizer/predict-crop', 'POST', req.body);
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
