const express = require('express');
const cors = require('cors');
const pool = require('./config/database');
const { getAmazonAccessToken } = require('./amazon');
require('dotenv').config();

const app = express();

// Use only the PORT from environment variables (no fallback)
const PORT = process.env.PORT;

if (!PORT) {
  console.error('❌ Error: PORT environment variable is not set.');
  process.exit(1);
}

app.use(cors());
app.use(express.json());

// Route to fetch all orders from the database
app.get('/orders', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM orders ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching orders:', error.message);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Route to get Amazon access token using refresh token
app.get('/amazon-token', async (req, res) => {
  try {
    const token = await getAmazonAccessToken();
    res.json({ access_token: token });
  } catch (err) {
    console.error('Error getting Amazon token:', err.message);
    res.status(500).json({ error: 'Failed to get Amazon access token' });
  }
});

// Simple root route to check if API is running
app.get('/', (req, res) => {
  res.send('✅ Fresh Order API is running');
});

// Log before starting the server
console.log('Starting server on port:', PORT);

// Listen on all network interfaces and the given port
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
