require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

// Connect Database
connectDB();

const app = express();

// Init Middleware
app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ limit: '15mb', extended: true }));

app.get('/', (req, res) => res.json({ message: 'Welcome to KisanSaathi AI API' }));

// Define Routes
app.use('/api/v1/auth', require('./routes/auth'));
app.use('/api/v1/equipment', require('./routes/equipment'));
app.use('/api/v1/schemes', require('./routes/schemes'));
app.use('/api/v1/notifications', require('./routes/notifications'));
app.use('/api/v1/irrigation', require('./routes/irrigation'));
app.use('/api/v1/digital-twin', require('./routes/digitalTwin'));
app.use('/api/v1/emission', require('./routes/emission'));
app.use('/api/v1/waste', require('./routes/waste'));
app.use('/api/mandi-prices', require('./routes/mandiPrices'));
app.use('/api/v1/chat', require('./routes/chat'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/v1/agro', require('./routes/agroAI'));
app.use('/api/v1/crop-recommendation', require('./routes/cropRecommendation'));
app.use('/api/v1/fertilizer', require('./routes/fertilizer'));
app.use('/api/predict-crop', (req, res, next) => {
  req.url = '/predict';
  return require('./routes/cropRecommendation')(req, res, next);
});

const PORT = process.env.PORT || 8000;

app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
