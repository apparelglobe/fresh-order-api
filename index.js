const express = require('express');
const cors = require('cors');
const pool = require('./config/database');
const { getAmazonAccessToken, getAmazonOrders } = require('./amazon');
require('dotenv').config();

const app = express();

const PORT = process.env.PORT || 10000;
const HOST = '0.0.0.0';

// Read API key from env variables
const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.error('❌ Error: API_KEY environment variable not set.');
  process.exit(1);
}

function apiKeyAuth(req, res, next) {
  const apiKey = req.header('x-api-key');
  if (!apiKey || apiKey !== API_KEY) {
    return res.status(401).json({ error: 'Unauthorized: Invalid API key' });
  }
  next();
}

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('✅ Fresh Order API is running');
});

// Get all orders
app.get('/orders', apiKeyAuth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM orders ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching orders:', error.message);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Get single order by ID
app.get('/orders/:id', apiKeyAuth, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT * FROM orders WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching order:', error.message);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// Create new order
app.post('/orders', apiKeyAuth, async (req, res) => {
  const { order_number, customer_name, status, total_amount } = req.body;
  if (!order_number || !customer_name || !status || !total_amount) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  try {
    const insertQuery = `
      INSERT INTO orders (order_number, customer_name, status, total_amount, created_at)
      VALUES ($1, $2, $3, $4, NOW())
      RETURNING *;
    `;
    const result = await pool.query(insertQuery, [order_number, customer_name, status, total_amount]);
    res.status(201).json({ message: 'Order created', order: result.rows[0] });
  } catch (error) {
    console.error('Error creating order:', error.message);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// Update order by ID
app.put('/orders/:id', apiKeyAuth, async (req, res) => {
  const { id } = req.params;
  const { order_number, customer_name, status, total_amount } = req.body;

  const fields = [];
  const values = [];
  let idx = 1;

  if (order_number !== undefined) {
    fields.push(`order_number = $${idx++}`);
    values.push(order_number);
  }
  if (customer_name !== undefined) {
    fields.push(`customer_name = $${idx++}`);
    values.push(customer_name);
  }
  if (status !== undefined) {
    fields.push(`status = $${idx++}`);
    values.push(status);
  }
  if (total_amount !== undefined) {
    fields.push(`total_amount = $${idx++}`);
    values.push(total_amount);
  }

  if (fields.length === 0) {
    return res.status(400).json({ error: 'No fields to update provided' });
  }

  const query = `
    UPDATE orders
    SET ${fields.join(', ')}
    WHERE id = $${idx}
    RETURNING *;
  `;
  values.push(id);

  try {
    const result = await pool.query(query, values);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    res.json({ message: 'Order updated', order: result.rows[0] });
  } catch (error) {
    console.error('Error updating order:', error.message);
    res.status(500).json({ error: 'Failed to update order' });
  }
});

// Delete order by ID
app.delete('/orders/:id', apiKeyAuth, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM orders WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    res.json({ message: 'Order deleted', order: result.rows[0] });
  } catch (error) {
    console.error('Error deleting order:', error.message);
    res.status(500).json({ error: 'Failed to delete order' });
  }
});

// Amazon API: Get access token
app.get('/amazon-token', apiKeyAuth, async (req, res) => {
  try {
    const token = await getAmazonAccessToken();
    res.json({ access_token: token });
  } catch (err) {
    console.error('Error getting Amazon token:', err.message);
    res.status(500).json({ error: 'Failed to get Amazon access token' });
  }
});

// Amazon API: Get orders
app.get('/amazon-orders', apiKeyAuth, async (req, res) => {
  try {
    const data = await getAmazonOrders();
    res.json(data);
  } catch (error) {
    console.error('Failed to fetch Amazon orders:', error.message);
    res.status(500).json({ error: 'Failed to fetch Amazon orders' });
  }
});

app.listen(PORT, HOST, () => {
  console.log(`🚀 Server running on http://${HOST}:${PORT}`);
});
