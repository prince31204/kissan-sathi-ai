require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

// Connect Database
connectDB();

const app = express();

// Init Middleware
app.use(cors());
app.use(express.json({ extended: false }));
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => res.json({ message: 'Welcome to KisanSaathi AI API' }));

// Define Routes
app.use('/api/v1/auth', require('./routes/auth'));
app.use('/api/v1/equipment', require('./routes/equipment'));
app.use('/api/v1/schemes', require('./routes/schemes'));
app.use('/api/v1/notifications', require('./routes/notifications'));
app.use('/api/v1/irrigation', require('./routes/irrigation'));
app.use('/api/v1/emission', require('./routes/emission'));
app.use('/api/v1/waste', require('./routes/waste'));
app.use('/api/mandi-prices', require('./routes/mandiPrices'));
app.use('/api/v1/chat', require('./routes/chat'));
app.use('/api/chat', require('./routes/chat'));

const PORT = process.env.PORT || 8000;

app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
