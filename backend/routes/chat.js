const express = require('express');
const router = express.Router();

// Supported Gemini models with fallbacks for high demand
const GEMINI_MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-3.8-flash',
  'gemini-3.5-flash',
  'gemini-3.1-pro-preview'
];

const SYSTEM_INSTRUCTION = `You are "KisanSaathi AI" (किसान साथी), a friendly, highly knowledgeable agricultural expert assistant for Indian farmers.
- Always provide helpful, practical, and accurate advice on crops, soil, seeds, fertilizers (organic, urea, DAP, NPK), pesticides, diseases, weather impacts, irrigation, government farmer schemes (like PM-KISAN, PMFBY), and mandi rates.
- Answer in the same language the farmer asks (Hindi, Hinglish, or English).
- Keep your tone respectful ("किसान भाई", "नमस्ते"), encouraging, and simple to understand.
- Use bullet points and clear steps for recommendations (dosages, timing, methods).`;

router.post('/', async (req, res) => {
  try {
    const { message, history } = req.body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const rawApiKey = process.env.GOOGLE_GEMINI_API_KEY || '';
    const apiKey = rawApiKey.replace(/["']/g, '').trim();

    if (!apiKey) {
      return res.status(500).json({
        error: 'Google Gemini API key not configured in backend environment.'
      });
    }

    // Prepare contents payload for Gemini
    const contents = [];

    // System instruction as first user/model turn if using standard generateContent
    contents.push({
      role: 'user',
      parts: [{ text: `System Instruction: ${SYSTEM_INSTRUCTION}` }]
    });
    contents.push({
      role: 'model',
      parts: [{ text: 'नमस्ते किसान भाई! मैं किसान साथी AI हूँ। आपकी खेती-बाड़ी, फसल, खाद, बीमारी या सरकारी योजनाओं से जुड़ी हर मदद के लिए तैयार हूँ। बताइए, आज मैं आपकी क्या सहायता कर सकता हूँ?' }]
    });

    // Add recent history if available
    if (Array.isArray(history) && history.length > 0) {
      const recent = history.slice(-6); // last 6 turns
      for (const item of recent) {
        if (item.text) {
          contents.push({
            role: item.isUser ? 'user' : 'model',
            parts: [{ text: item.text }]
          });
        }
      }
    }

    // Add current user message
    contents.push({
      role: 'user',
      parts: [{ text: message.trim() }]
    });

    let lastError = null;

    // Try each model until one succeeds
    for (const model of GEMINI_MODELS) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const geminiRes = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents })
        });

        const data = await geminiRes.json();

        if (geminiRes.ok && data.candidates && data.candidates.length > 0) {
          const reply = data.candidates[0]?.content?.parts?.[0]?.text;
          if (reply) {
            return res.json({
              success: true,
              response: reply,
              modelUsed: model
            });
          }
        } else {
          lastError = data.error?.message || JSON.stringify(data);
          console.warn(`[Gemini ${model} warning]:`, lastError);
        }
      } catch (callErr) {
        lastError = callErr.message;
        console.warn(`[Gemini ${model} fetch error]:`, lastError);
      }
    }

    // If all models hit demand/rate-limit, return helpful fallback
    return res.status(503).json({
      success: false,
      error: 'Google Gemini API is currently busy. Please try again in a few moments.',
      detail: lastError
    });
  } catch (err) {
    console.error('Chat error:', err);
    return res.status(500).json({ error: 'Internal server error while processing chat.' });
  }
});

module.exports = router;
