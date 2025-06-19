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

app.get('/orders/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const query = 'SELECT * FROM orders WHERE id = $1';
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching order:', error.message);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

app.post('/orders', async (req, res) => {
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

app.put('/orders/:id', async (req, res) => {
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

  console.log('Update query:', query);
  console.log('Values:', values);

  try {
    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    console.log('Update result:', result.rows[0]);
    res.json({ message: 'Order updated', order: result.rows[0] });
  } catch (error) {
    console.error('Error updating order:', error.message);
    res.status(500).json({ error: 'Failed to update order' });
  }
});

app.delete('/orders/:id', async (req, res) => {
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
