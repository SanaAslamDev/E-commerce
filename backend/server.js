// Main server file - this is the brain of our website
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const pool = require('./db');
const app = express();

// Middleware - allows our server to read JSON and talk to frontend
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5500',
  credentials: true
}));
app.use(express.json());

// ==================== AUTH MIDDLEWARE ====================

// Verifies the JWT sent by the frontend in the Authorization header.
// Without this, anyone could call protected routes with no login at all.
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token provided' });
  }
  const token = authHeader.split(' ')[1];
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

// Must run AFTER authenticate — checks the role embedded in the verified token.
function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
}

// ==================== AUTH ROUTES ====================

// REGISTER - creates a new user account
app.post('/register', async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'All fields are required' });
  }
  if (password.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters' });
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ message: 'Invalid email format' });
  }

  try {
    // Check if email already exists
    const existing = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ message: 'Email already registered' });
    }
    // Encrypt the password before saving
    const hashedPassword = await bcrypt.hash(password, 10);
    await pool.query(
      'INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, email, hashedPassword, 'user']
    );
    res.json({ message: 'Account created successfully!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Something went wrong. Please try again.' });
  }
});

// LOGIN - checks email and password
app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(400).json({ message: 'Email not found' });
    }
    const user = result.rows[0];
    // Compare password with encrypted one in database
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Wrong password' });
    }
    // Create a token so user stays logged in
    const token = jwt.sign(
      { id: user.id, name: user.name, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({ token, user: { id: user.id, name: user.name, role: user.role } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Something went wrong. Please try again.' });
  }
});

// DELETE PROFILE - user can only delete their own account
app.delete('/user/:id', authenticate, async (req, res) => {
  const { id } = req.params;

  if (req.user.id !== Number(id)) {
    return res.status(403).json({ message: 'You can only delete your own account' });
  }

  try {
    await pool.query('DELETE FROM users WHERE id = $1', [id]);
    res.json({ message: 'Account deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Something went wrong. Please try again.' });
  }
});

// ==================== PRODUCT ROUTES ====================

// GET ALL PRODUCTS (public - with optional search and category filter)
app.get('/products', async (req, res) => {
  const { search, category } = req.query;
  try {
    let query = 'SELECT * FROM products WHERE 1=1';
    let params = [];
    if (search) {
      params.push(`%${search}%`);
      query += ` AND name ILIKE $${params.length}`;
    }
    if (category) {
      params.push(category);
      query += ` AND category = $${params.length}`;
    }
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Something went wrong. Please try again.' });
  }
});

// ADD PRODUCT (admin only)
app.post('/products', authenticate, requireAdmin, async (req, res) => {
  const { name, description, price, image_url, category, stock } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO products (name, description, price, image_url, category, stock) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
      [name, description, price, image_url, category, stock]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Something went wrong. Please try again.' });
  }
});

// UPDATE PRODUCT (admin only)
app.put('/products/:id', authenticate, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { name, description, price, image_url, category, stock } = req.body;
  try {
    const result = await pool.query(
      'UPDATE products SET name=$1, description=$2, price=$3, image_url=$4, category=$5, stock=$6 WHERE id=$7 RETURNING *',
      [name, description, price, image_url, category, stock, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Something went wrong. Please try again.' });
  }
});

// DELETE PRODUCT (admin only)
app.delete('/products/:id', authenticate, requireAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM products WHERE id = $1', [id]);
    res.json({ message: 'Product deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Something went wrong. Please try again.' });
  }
});

// ==================== ORDER ROUTES ====================

// PLACE ORDER (public - guests can checkout too)
// Total is recalculated server-side from the real product prices, and stock
// is checked before the order is created, instead of trusting whatever the
// client sends. The whole thing runs in a transaction so a mid-loop failure
// can't leave a half-created order or partially-decremented stock behind.
app.post('/orders', async (req, res) => {
  const { user_id, full_name, phone, address, items } = req.body;

  if (!full_name || !phone || !address || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: 'Missing required order details' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    let total = 0;
    const verifiedItems = [];

    for (let item of items) {
      const productResult = await client.query('SELECT * FROM products WHERE id = $1', [item.product_id]);
      const product = productResult.rows[0];

      if (!product) {
        await client.query('ROLLBACK');
        return res.status(400).json({ message: `Product ${item.product_id} not found` });
      }
      if (product.stock < item.quantity) {
        await client.query('ROLLBACK');
        return res.status(400).json({ message: `${product.name} doesn't have enough stock` });
      }

      total += parseFloat(product.price) * item.quantity;
      verifiedItems.push({ product_id: product.id, quantity: item.quantity, price: product.price });
    }

    const orderResult = await client.query(
      'INSERT INTO orders (user_id, full_name, phone, address, total) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [user_id, full_name, phone, address, total]
    );
    const order = orderResult.rows[0];

    for (let item of verifiedItems) {
      await client.query(
        'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES ($1,$2,$3,$4)',
        [order.id, item.product_id, item.quantity, item.price]
      );
      await client.query(
        'UPDATE products SET stock = stock - $1 WHERE id = $2',
        [item.quantity, item.product_id]
      );
    }

    await client.query('COMMIT');
    res.json({ message: `Thank you ${full_name}! Your order has been placed.`, order });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ message: 'Could not place order. Please try again.' });
  } finally {
    client.release();
  }
});

// GET USER ORDERS - user can only view their own orders
app.get('/orders/user/:user_id', authenticate, async (req, res) => {
  const { user_id } = req.params;

  if (req.user.id !== Number(user_id)) {
    return res.status(403).json({ message: 'You can only view your own orders' });
  }

  try {
    const result = await pool.query(
      'SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC',
      [user_id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Something went wrong. Please try again.' });
  }
});

// GET ALL ORDERS (admin only)
app.get('/orders', authenticate, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT orders.*, users.name as customer_name FROM orders LEFT JOIN users ON orders.user_id = users.id ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Something went wrong. Please try again.' });
  }
});

// UPDATE ORDER STATUS (admin only)
app.put('/orders/:id/status', authenticate, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    const result = await pool.query(
      'UPDATE orders SET status=$1 WHERE id=$2 RETURNING *',
      [status, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Something went wrong. Please try again.' });
  }
});

// ==================== START SERVER ====================
const PORT = process.env.PORT || 5500;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});