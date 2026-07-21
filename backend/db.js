// This file connects our Node.js server to PostgreSQL database
const { Pool } = require('pg');
require('dotenv').config();

// Pool is like a manager that handles database connections
const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

// Prevents the server from crashing if an idle connection in the pool
// hits a network error (e.g. DB restart, dropped connection).
pool.on('error', (err) => {
  console.error('Unexpected error on idle database client:', err.message);
});

// Test the connection once, then release the client back to the pool
pool.connect((err, client, release) => {
  if (err) {
    console.log('Database connection failed:', err.message);
    return;
  }
  console.log('Connected to PostgreSQL database!');
  release();
});

module.exports = pool;