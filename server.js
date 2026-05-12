// ReceiptAI — Express proxy server (bypasses CORS for Claude API)
const express = require('express');
const path = require('path');

const app = express();
const PORT = 8080;

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(express.json({ limit: '20mb' }));       // receipts can be large images
app.use(express.static(path.join(__dirname)));  // serve index.html, app.js, styles.css

// ── Claude Proxy Endpoint ─────────────────────────────────────────────────────
// Models to try in priority order (vision-capable, OpenAI-compatible format)
const CANDIDATE_MODELS = [
  'claude-sonnet-4-6',
  'gpt-4o-mini',
  'gpt-4o',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-1.5-pro',
  'claude-3-5-sonnet-20241022',
  'claude-3-5-haiku-20241022',
  'claude-3-haiku-20240307',
  'claude-3-sonnet-20240229',
  'claude-3-opus-20240229',
];

app.post('/api/extract', async (req, res) => {
  const { apiKey, messages, max_tokens } = req.body;

  if (!apiKey) return res.status(400).json({ error: 'Missing apiKey' });

  const errors = [];

  for (const model of CANDIDATE_MODELS) {
    try {
      const response = await fetch('https://pikkapi.cooltechgp.online/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ model, messages, max_tokens }),
      });

      const data = await response.json();

      // Skip to next model if this one isn't available
      if (!response.ok) {
        const errMsg = data?.error?.message || `HTTP ${response.status}`;
        const isModelUnavailable = response.status === 503 || response.status === 404 ||
          errMsg.toLowerCase().includes('no available channel') ||
          errMsg.toLowerCase().includes('model not found') ||
          errMsg.toLowerCase().includes('overloaded');

        if (isModelUnavailable) {
          console.log(`  ✗ ${model} — ${errMsg}`);
          errors.push({ model, error: errMsg });
          continue; // try next model
        }

        // Non-recoverable error (auth, bad request, etc.)
        return res.status(response.status).json(data);
      }

      // Success!
      console.log(`  ✓ ${model} — success`);
      data._modelUsed = model; // tell the client which model worked
      return res.json(data);

    } catch (err) {
      console.log(`  ✗ ${model} — ${err.message}`);
      errors.push({ model, error: err.message });
    }
  }

  // All models failed
  res.status(503).json({
    error: {
      message: `All models unavailable. Tried: ${errors.map(e => e.model).join(', ')}`
    }
  });
});


// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n  ReceiptAI server running at http://localhost:${PORT}\n`);
});
