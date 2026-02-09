const express = require('express');
const { Pool } = require('pg');
const path = require('path');

// ⬇️ ВАЖНО: node-fetch через dynamic import
const fetch = (...args) =>
  import('node-fetch').then(({ default: fetch }) => fetch(...args));

const app = express();
app.use(express.json());

// ============================
// STATIC FILES
// ============================
app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 8080;

// ============================
// DATABASE
// ============================
const pool = new Pool({
  host: process.env.PGHOST,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
  port: process.env.PGPORT,
  ssl: { rejectUnauthorized: false }
});

// ============================
// HEALTH CHECK
// ============================
app.get('/ping', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ status: 'ok', time: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================
// PRODUCTS
// ============================
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

// ============================
// GEMINI TEST
// ============================
app.get('/ai/test', async (req, res) => {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: 'Привет! Коротко объясни, что такое виртуальная примерка одежды.'
                }
              ]
            }
          ]
        })
      }
    );

    const data = await response.json();

    res.json({
      status: 'ok',
      answer:
        data?.candidates?.[0]?.content?.parts?.[0]?.text ||
        'Нет ответа от Gemini'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================
// START SERVER
// ============================
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
