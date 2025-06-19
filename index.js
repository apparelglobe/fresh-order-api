const express = require('express');
const cors = require('cors');
const pool = require('./config/database');
const { getAmazonAccessToken } = require('./amazon');
require('dotenv').config();

const app = express();

const PORT = process.env.PORT;
const HOST = '0.0.0.0';

if (!PORT) {
  console.error('❌ Error: PORT environment variable not set.');
  process.exit(1);
}

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('✅ Fresh Order API is running');
});

app.get('/orders', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM orders ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching orders:', error.message);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// New POST route to create orders
app.post('/orders', async (req, res) => {
  const { order_id, customer_name, status, total_amount } = req.body;

  if (!order_id || !customer_name || !status || !total_amount) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const insertQuery = `
      INSERT INTO orders (order_id, customer_name, status, total_amount, created_at)
      VALUES ($1, $2, $3, $4, NOW())
      RETURNING *;
    `;

    const result = await pool.query(insertQuery, [order_id, customer_name, status, total_amount]);
    res.status(201).json({ message: 'Order created', order: result.rows[0] });
  } catch (error) {
    console.error('Error creating order:', error.message);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

app.get('/amazon-token', async (req, res) => {
  try {
    const token = await getAmazonAccessToken();
    res.json({ access_token: token });
  } catch (err) {
    console.error('Error getting Amazon token:', err.message);
    res.status(500).json({ error: 'Failed to get Amazon access token' });
  }
});

console.log('Port from environment:', PORT);

app.listen(PORT, HOST, () => {
  console.log(`🚀 Server running on port ${PORT} and host ${HOST}`);
});
