const express = require('express');
const fetch = require('node-fetch');
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
// GEMINI TEST (АКТУАЛЬНЫЙ)
// ============================
app.get('/ai/test', async (req, res) => {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
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
                  text: 'Explain virtual clothing try-on in one short sentence.'
                }
              ]
            }
          ]
        })
      }
    );

    const data = await response.json();

    console.log('FULL GEMINI RESPONSE:', JSON.stringify(data, null, 2));

    const answer =
      data.candidates?.[0]?.content?.parts?.[0]?.text
      || 'Gemini не вернул текст';

    res.json({
      status: 'ok',
      answer
    });

  } catch (error) {
    console.error('Gemini error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================
// START SERVER
// ============================
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
