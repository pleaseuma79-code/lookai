const express = require('express');
const { Pool } = require('pg');
const path = require('path');

const app = express();
app.use(express.json());

// 👉 Раздача HTML из папки public
app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 8080;

// 👉 Подключение к Postgres
const pool = new Pool({
  host: process.env.PGHOST,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
  port: process.env.PGPORT,
  ssl: { rejectUnauthorized: false }
});

// --------------------
// HEALTH CHECK
// --------------------
app.get('/ping', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ status: 'ok', time: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --------------------
// GET PRODUCTS BY SHOP
// --------------------
app.get('/products', async (req, res) => {
  const { shop_id } = req.query;

  if (!shop_id) {
    return res.status(400).json({ error: 'shop_id is required' });
  }

  try {
    const result = await pool.query(
      `
      SELECT id, title, image_url, category
      FROM shop_products
      WHERE shop_id = $1
      ORDER BY created_at DESC
      `,
      [shop_id]
    );

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --------------------
// ADD PRODUCT
// --------------------
app.post('/products', async (req, res) => {
  const { shop_id, title, image_url, category } = req.body;

  if (!shop_id || !title || !image_url) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const result = await pool.query(
      `
      INSERT INTO shop_products (shop_id, title, image_url, category)
      VALUES ($1, $2, $3, $4)
      RETURNING *
      `,
      [shop_id, title, image_url, category || null]
    );

    res.json({ status: 'ok', product: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --------------------
// START SERVER
// --------------------
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
