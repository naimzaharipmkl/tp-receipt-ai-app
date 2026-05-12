/* ===== ReceiptAI — app.js ===== */

const PIKKAPI_KEY = ''; // WARNING: Never hardcode your API key here in public repositories!
const PIKKAPI_MODEL = 'claude-sonnet-4-6';

const state = {
  apiKey: PIKKAPI_KEY || localStorage.getItem('gemini_api_key') || '',
  imageFile: null,
  imageBase64: null,
  imageMime: null,
  extracted: null,
  isExtracting: false,
  history: JSON.parse(localStorage.getItem('receipt_history') || '[]'),
};


// ─── DOM refs ─────────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const apiKeyInput = $('apiKeyInput');
const saveApiKeyBtn = $('saveApiKey');
const apiStatus = $('apiStatus');
const toggleVisBtn = $('toggleVisibility');
const dropzone = $('dropzone');
const fileInput = $('fileInput');
const browseBtn = $('browseBtn');
const previewContainer = $('previewContainer');
const previewImg = $('previewImg');
const previewInfo = $('previewInfo');
const removeImageBtn = $('removeImage');
const dropzoneInner = $('dropzoneInner');
const extractBtn = $('extractBtn');
const processingCard = $('processingCard');
const processingStep = $('processingStep');
const processingFill = $('processingFill');
const uploadCard = $('uploadCard');
const formCard = $('formCard');
const successCard = $('successCard');
const historyCard = $('historyCard');
const receiptForm = $('receiptForm');
const currencyPrefix = $('currencyPrefix');
const confidenceFill = $('confidenceFill');
const confidenceScore = $('confidenceScore');
const successSummary = $('successSummary');
const historyList = $('historyList');
const toastContainer = $('toastContainer');
const errorModal = $('errorModal');
const errorTitle = $('errorTitle');
const errorBody = $('errorBody');

// ─── Init ─────────────────────────────────────────────────────────────────────
(function init() {
  spawnParticles();

  // If a hardcoded key exists, prioritize it
  if (PIKKAPI_KEY) {
    localStorage.setItem('gemini_api_key', PIKKAPI_KEY);
    apiKeyInput.value = PIKKAPI_KEY;
  } else {
    // Otherwise, load from localStorage
    apiKeyInput.value = state.apiKey;
  }
  
  if (state.apiKey) {
    showApiStatus('✓ AI ready (' + PIKKAPI_MODEL + ')', 'success');
  } else {
    showApiStatus('Waiting for API key...', 'warning');
  }

  $('currency').addEventListener('change', () => {
    currencyPrefix.textContent = $('currency').value || '—';
  });
  renderHistory();
})();

// ─── Particles ────────────────────────────────────────────────────────────────
function spawnParticles() {
  const container = $('bgParticles');
  const count = 18;
  const colors = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981'];
  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const size = Math.random() * 6 + 3;
    p.style.cssText = `
      width:${size}px; height:${size}px;
      left:${Math.random() * 100}%;
      background:${colors[Math.floor(Math.random() * colors.length)]};
      animation-duration:${Math.random() * 20 + 15}s;
      animation-delay:${Math.random() * 20}s;
    `;
    container.appendChild(p);
  }
}

// ─── API Key ──────────────────────────────────────────────────────────────────
saveApiKeyBtn.addEventListener('click', () => {
  const key = apiKeyInput.value.trim();
  if (!key) { showApiStatus('Please enter an API key', 'error'); return; }
  if (!key.startsWith('sk-')) { showApiStatus('API key should start with "sk-…"', 'error'); return; }
  state.apiKey = key;
  localStorage.setItem('gemini_api_key', key);
  showApiStatus('✓ API key saved successfully', 'success');
  toast('API key saved', 'success');
});

toggleVisBtn.addEventListener('click', () => {
  const isPass = apiKeyInput.type === 'password';
  apiKeyInput.type = isPass ? 'text' : 'password';
  $('eyeIcon').innerHTML = isPass
    ? '<path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/>'
    : '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>';
});

function showApiStatus(msg, type) {
  apiStatus.textContent = msg;
  apiStatus.className = `api-status ${type}`;
}

// ─── File Upload ──────────────────────────────────────────────────────────────
browseBtn.addEventListener('click', () => fileInput.click());
dropzone.addEventListener('click', e => {
  if (e.target === dropzone || dropzoneInner.contains(e.target)) fileInput.click();
});

fileInput.addEventListener('change', () => {
  if (fileInput.files[0]) handleFile(fileInput.files[0]);
});

dropzone.addEventListener('dragover', e => {
  e.preventDefault(); dropzone.classList.add('drag-over');
});
dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag-over'));
dropzone.addEventListener('drop', e => {
  e.preventDefault(); dropzone.classList.remove('drag-over');
  const f = e.dataTransfer.files[0];
  if (f && f.type.startsWith('image/')) handleFile(f);
  else toast('Please drop an image file', 'error');
});

function handleFile(file) {
  if (file.size > 10 * 1024 * 1024) { toast('File too large (max 10 MB)', 'error'); return; }
  state.imageFile = file;
  state.imageMime = file.type;
  const reader = new FileReader();
  reader.onload = e => {
    const dataUrl = e.target.result;
    state.imageBase64 = dataUrl.split(',')[1];
    previewImg.src = dataUrl;
    dropzoneInner.style.display = 'none';
    previewContainer.style.display = 'flex';
    previewInfo.textContent = `${file.name} · ${(file.size / 1024).toFixed(0)} KB`;
    extractBtn.disabled = false;
  };
  reader.readAsDataURL(file);
}

removeImageBtn.addEventListener('click', e => {
  e.stopPropagation();
  state.imageFile = null; state.imageBase64 = null; state.imageMime = null;
  fileInput.value = '';
  previewContainer.style.display = 'none';
  dropzoneInner.style.display = '';
  extractBtn.disabled = true;
});

// ─── Extract ──────────────────────────────────────────────────────────────────
extractBtn.addEventListener('click', async () => {
  if (state.isExtracting) return;
  if (!state.apiKey) { showError('No API Key', 'Please save your Claude API key first (Step 1).'); return; }
  if (!state.imageBase64) { toast('Please upload an image first', 'error'); return; }
  await runExtraction();
});

async function runExtraction() {
  state.isExtracting = true;
  extractBtn.disabled = true;

  uploadCard.style.display = 'none';
  formCard.style.display = 'none';
  processingCard.style.display = '';
  setProgress(0, 'Sending image to Claude…');

  try {
    await sleep(400);
    setProgress(25, 'Analyzing receipt content…');

    const result = await callClaude(state.imageBase64, state.imageMime);

    setProgress(75, 'Parsing extracted fields…');
    await sleep(300);

    state.extracted = result;
    setProgress(100, 'Done!');
    await sleep(500);

    fillForm(result);
    processingCard.style.display = 'none';
    formCard.style.display = '';
    formCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
    toast('Receipt data extracted successfully', 'success');
  } catch (err) {
    processingCard.style.display = 'none';
    uploadCard.style.display = '';
    showError('Extraction Failed', err.message || 'Unknown error from Claude API.');
  } finally {
    state.isExtracting = false;
    extractBtn.disabled = false;
  }
}


function setProgress(pct, label) {
  processingFill.style.width = pct + '%';
  processingStep.textContent = label;
}

// ─── OpenAI API (via local proxy) ────────────────────────────────────────────
async function callClaude(base64, mime) {
  const prompt = `You are a receipt data extraction engine.
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
- For currency, infer from locale/symbols (RM \u2192 MYR, $ \u2192 USD, \u00a3 \u2192 GBP, \u20ac \u2192 EUR, etc.)
- For merchant, use the prominent store/brand name at the top of the receipt.
- For total, use the final total paid (including tax), not subtotals.`;

  const MAX_RETRIES = 3;
  let lastError;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const res = await fetch('/api/extract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apiKey: state.apiKey,
        max_tokens: 256,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: { url: `data:${mime};base64,${base64}` }
            },
            { type: 'text', text: prompt }
          ]
        }]
      })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const msg = err?.error?.message || `HTTP ${res.status}`;
      const status = res.status;

      // Retry on 503 (server overloaded) — common with proxy resellers
      if (status === 503 && attempt < MAX_RETRIES) {
        setProgress(25, `Server busy, retrying… (${attempt}/${MAX_RETRIES})`);
        await sleep(4000);
        continue;
      }
      if (status === 429 && attempt < MAX_RETRIES) {
        setProgress(25, `Rate limit, retrying… (${attempt}/${MAX_RETRIES})`);
        await sleep(5000);
        continue;
      }

      if (status === 400) throw new Error(`[400] Bad request: ${msg}`);
      if (status === 401 || status === 403) throw new Error(`[${status}] Invalid API key.`);
      if (status === 429) throw new Error(`[429] Quota exceeded: ${msg}`);
      throw new Error(`[${status}] ${msg}`);
    }

    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content || '';

    // Update badge to show which model was actually used
    if (data._modelUsed) {
      const badge = document.querySelector('.header-badge');
      if (badge) badge.innerHTML = `<span class="badge-dot"></span> Powered by ${data._modelUsed}`;
    }

    // Parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('AI returned an unexpected format. Please try again.');

    let parsed;
    try { parsed = JSON.parse(jsonMatch[0]); }
    catch { throw new Error('Failed to parse AI response JSON.'); }

    return parsed;
  }

  throw new Error('Too many retries. Please wait a moment and try again.');
}



// ─── Fill Form ────────────────────────────────────────────────────────────────
function fillForm(data) {
  // Merchant
  if (data.merchant) {
    $('merchantName').value = data.merchant;
    markAiFilled('merchantName', 'badge-merchant');
  }
  // Date
  if (data.date) {
    $('receiptDate').value = data.date;
    markAiFilled('receiptDate', 'badge-date');
  }
  // Currency
  if (data.currency) {
    const sel = $('currency');
    const opt = [...sel.options].find(o => o.value === data.currency.toUpperCase());
    if (opt) {
      sel.value = data.currency.toUpperCase();
      currencyPrefix.textContent = data.currency.toUpperCase();
      markAiFilled('currency', 'badge-currency');
    } else {
      currencyPrefix.textContent = data.currency || '—';
    }
  }
  // Total
  if (data.total !== null && data.total !== undefined) {
    $('totalAmount').value = parseFloat(data.total).toFixed(2);
    markAiFilled('totalAmount', 'badge-total');
  }
  // Confidence
  const conf = typeof data.confidence === 'number' ? data.confidence : 70;
  confidenceFill.style.width = conf + '%';
  confidenceScore.textContent = conf + '%';
  confidenceScore.style.color = conf >= 80 ? 'var(--success)' : conf >= 50 ? 'var(--warning)' : 'var(--danger)';
}

function markAiFilled(inputId, badgeId) {
  const el = $(inputId);
  if (el) el.classList.add('ai-filled');
  const badge = $(badgeId);
  if (badge) badge.classList.add('visible');
}

// ─── Form Actions ─────────────────────────────────────────────────────────────
$('rescanBtn').addEventListener('click', () => {
  formCard.style.display = 'none';
  uploadCard.style.display = '';
  uploadCard.scrollIntoView({ behavior: 'smooth' });
});

$('clearFormBtn').addEventListener('click', () => {
  receiptForm.reset();
  currencyPrefix.textContent = '—';
  ['merchantName', 'receiptDate', 'currency', 'totalAmount'].forEach(id => {
    const el = $(id);
    if (el) { el.classList.remove('ai-filled', 'invalid'); }
  });
  ['badge-merchant', 'badge-date', 'badge-currency', 'badge-total'].forEach(id => {
    const b = $(id); if (b) b.classList.remove('visible');
  });
  clearErrors();
});

receiptForm.addEventListener('submit', e => {
  e.preventDefault();
  if (!validateForm()) return;
  submitReceipt();
});

function validateForm() {
  clearErrors();
  let valid = true;
  const merchant = $('merchantName').value.trim();
  const date = $('receiptDate').value;
  const currency = $('currency').value;
  const total = $('totalAmount').value;

  if (!merchant) { showFieldError('merchantName', 'err-merchant', 'Merchant name is required'); valid = false; }
  if (!date) { showFieldError('receiptDate', 'err-date', 'Date is required'); valid = false; }
  if (!currency) { showFieldError('currency', 'err-currency', 'Currency is required'); valid = false; }
  if (!total || isNaN(parseFloat(total)) || parseFloat(total) < 0) {
    showFieldError('totalAmount', 'err-total', 'Valid total amount is required'); valid = false;
  }
  return valid;
}

function showFieldError(inputId, errId, msg) {
  const el = $(inputId); if (el) el.classList.add('invalid');
  const err = $(errId); if (err) err.textContent = msg;
}
function clearErrors() {
  ['merchantName', 'receiptDate', 'currency', 'totalAmount'].forEach(id => {
    const el = $(id); if (el) el.classList.remove('invalid');
  });
  ['err-merchant', 'err-date', 'err-currency', 'err-total'].forEach(id => {
    const el = $(id); if (el) el.textContent = '';
  });
}

function submitReceipt() {
  const entry = {
    id: Date.now(),
    merchant: $('merchantName').value.trim(),
    date: $('receiptDate').value,
    currency: $('currency').value,
    total: parseFloat($('totalAmount').value).toFixed(2),
    notes: $('notes').value.trim(),
    submittedAt: new Date().toISOString(),
  };

  state.history.unshift(entry);
  localStorage.setItem('receipt_history', JSON.stringify(state.history));

  // Build success summary
  successSummary.innerHTML = `
    <div class="success-row"><span>Merchant</span><span>${entry.merchant}</span></div>
    <div class="success-row"><span>Date</span><span>${formatDate(entry.date)}</span></div>
    <div class="success-row"><span>Total</span><span>${entry.currency} ${entry.total}</span></div>
    ${entry.notes ? `<div class="success-row"><span>Notes</span><span>${entry.notes}</span></div>` : ''}
  `;

  formCard.style.display = 'none';
  successCard.style.display = '';
  successCard.scrollIntoView({ behavior: 'smooth' });
  renderHistory();
}

// ─── Success Actions ───────────────────────────────────────────────────────────
$('newReceiptBtn').addEventListener('click', () => {
  resetAll();
  successCard.style.display = 'none';
  uploadCard.style.display = '';
  uploadCard.scrollIntoView({ behavior: 'smooth' });
});

$('viewHistoryBtn').addEventListener('click', () => {
  historyCard.style.display = '';
  historyCard.scrollIntoView({ behavior: 'smooth' });
});

$('closeHistoryBtn').addEventListener('click', () => {
  historyCard.style.display = 'none';
});

$('clearHistoryBtn').addEventListener('click', () => {
  if (!confirm('Clear all receipt history?')) return;
  state.history = [];
  localStorage.removeItem('receipt_history');
  renderHistory();
  toast('History cleared', 'info');
});

$('exportBtn').addEventListener('click', exportCSV);

// ─── History ──────────────────────────────────────────────────────────────────
function renderHistory() {
  if (state.history.length === 0) {
    historyList.innerHTML = '<div class="history-empty">No receipts submitted yet.</div>';
    return;
  }
  historyList.innerHTML = state.history.map(r => `
    <div class="history-item">
      <div class="history-item-info">
        <div class="history-item-merchant">${r.merchant}</div>
        <div class="history-item-meta">${formatDate(r.date)} · Submitted ${timeAgo(r.submittedAt)}</div>
      </div>
      <div class="history-item-amount">${r.currency} ${r.total}</div>
    </div>
  `).join('');
}

function exportCSV() {
  if (state.history.length === 0) { toast('No history to export', 'info'); return; }
  const header = ['Merchant', 'Date', 'Currency', 'Total', 'Notes', 'Submitted At'];
  const rows = state.history.map(r =>
    [r.merchant, r.date, r.currency, r.total, r.notes, r.submittedAt]
      .map(v => `"${String(v ?? '').replace(/"/g, '""')}"`)
      .join(',')
  );
  const csv = [header.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'receipts.csv'; a.click();
  URL.revokeObjectURL(url);
  toast('CSV exported', 'success');
}

// ─── Reset ────────────────────────────────────────────────────────────────────
function resetAll() {
  state.imageFile = null; state.imageBase64 = null; state.imageMime = null;
  state.extracted = null;
  fileInput.value = '';
  previewContainer.style.display = 'none';
  dropzoneInner.style.display = '';
  extractBtn.disabled = true;
  receiptForm.reset();
  currencyPrefix.textContent = '—';
  clearErrors();
  ['merchantName', 'receiptDate', 'currency', 'totalAmount'].forEach(id => {
    const el = $(id); if (el) el.classList.remove('ai-filled');
  });
  ['badge-merchant', 'badge-date', 'badge-currency', 'badge-total'].forEach(id => {
    const b = $(id); if (b) b.classList.remove('visible');
  });
  confidenceFill.style.width = '0%';
  confidenceScore.textContent = '—';
}

// ─── Error Modal ──────────────────────────────────────────────────────────────
function showError(title, body) {
  errorTitle.textContent = title;
  errorBody.textContent = body;
  errorModal.style.display = 'flex';
}
$('errorClose').addEventListener('click', () => { errorModal.style.display = 'none'; });
errorModal.addEventListener('click', e => { if (e.target === errorModal) errorModal.style.display = 'none'; });

// ─── Toast ────────────────────────────────────────────────────────────────────
function toast(msg, type = 'info', duration = 3500) {
  const icons = {
    success: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>',
    error: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
    info: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
  };
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.innerHTML = `${icons[type] || ''}<span>${msg}</span>`;
  toastContainer.appendChild(el);
  setTimeout(() => {
    el.classList.add('fade-out');
    el.addEventListener('animationend', () => el.remove());
  }, duration);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function formatDate(d) {
  if (!d) return '—';
  const dt = new Date(d + 'T00:00:00');
  return dt.toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' });
}

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}
