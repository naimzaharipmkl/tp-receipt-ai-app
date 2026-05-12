# ReceiptAI — Receipt-to-Form Auto-Fill Web App

A beautiful, AI-powered web app that extracts key fields from a receipt image and auto-fills a form for review and submission.

---

## How to Run Locally

This app uses a lightweight Express server (`server.js`) to bypass CORS issues and communicate with the AI API.

1. **Install Dependencies:**
   Ensure you have [Node.js](https://nodejs.org/) installed, then run:
   ```bash
   npm install
   ```

2. **Start the Server:**
   ```bash
   node server.js
   ```

3. **Open the App:**
   Open your browser and navigate to:
   [http://localhost:8080](http://localhost:8080)

---

## Model & Prompt Used

**Model Options:** The app tries multiple models in fallback order via an API proxy. The default is `claude-sonnet-4-6`, but it falls back to models like `gpt-4o-mini`, `gemini-1.5-flash`, etc.

**Endpoint Used:** `/api/extract` (Local Express server, which proxies to `https://pikkapi.cooltechgp.online/v1/chat/completions`)

**Prompt:**
```text
You are a receipt data extraction engine.
Analyze the receipt image and extract these four fields ONLY.
Return a VALID JSON object with exactly these keys:
{
  "merchant": "<store or restaurant name, string>",
  "date": "<date in YYYY-MM-DD format, or null if not found>",
  "total": <numeric total amount as a number, no currency symbol, or null if not found>,
  "currency": "<3-letter ISO 4217 currency code e.g. MYR, USD, EUR, or null if not found>",
  "confidence": <integer 0-100 representing how confident you are in the extraction>
}
Rules:
- Return ONLY the JSON object, no markdown fences, no explanation.
- If a field cannot be determined, use null.
- For currency, infer from locale/symbols (RM → MYR, $ → USD, £ → GBP, € → EUR, etc.)
- For merchant, use the prominent store/brand name at the top of the receipt.
- For total, use the final total paid (including tax), not subtotals.
```

---

## Setup & API Key

You can run this project by providing your API Key directly in the web UI (Step 1). The key is stored safely in your browser's `localStorage`.

Optionally, you can create a `.env` file (see `.env.example`) if you plan to move the API key fully into the backend `server.js` in the future.
