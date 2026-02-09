const express = require('express');
const { Pool } = require('pg');
const path = require('path');

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
// GEMINI TEST (WORKING)
// ============================
app.get('/ai/test', async (req, res) => {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: 'Объясни простыми словами, что такое виртуальная примерка одежды.'
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 200
          }
        })
      }
    );

    const data = await response.json();

    console.log('GEMINI RESPONSE:', JSON.stringify(data, null, 2));

    const text =
      data?.candidates?.[0]?.content?.parts
        ?.map(p => p.text)
        ?.join(' ') || null;

    res.json({
      status: 'ok',
      answer: text || 'Gemini ответил, но без текста'
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
