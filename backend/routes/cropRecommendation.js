const express = require('express');
const router = express.Router();
const http = require('http');

// Helper to call ML Backend on port 5000
const callMLBackend = (endpoint, method = 'GET', payload = null) => {
  return new Promise((resolve, reject) => {
    const postData = payload ? JSON.stringify(payload) : null;
    const options = {
      hostname: '127.0.0.1',
      port: 5000,
      path: endpoint,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...(postData ? { 'Content-Length': Buffer.byteLength(postData) } : {}),
      },
      timeout: 8000,
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', (err) => reject(err));
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('ML Backend timeout'));
    });

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
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
