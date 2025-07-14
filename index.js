import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const OWNER_KEY = process.env.OWNER_KEY || 'supersecretkey';

function verifyOwnerKey(req, res, next) {
  const key = req.headers['x-owner-key'];
  if (!key || key !== OWNER_KEY) {
    return res.status(401).json({ error: 'Unauthorized: Invalid owner key' });
  }
  next();
}

const models = {};
function getModel(collection) {
  if (!models[collection]) {
    const schema = new mongoose.Schema({}, { strict: false, timestamps: true });
    models[collection] = mongoose.model(collection, schema, collection);
  }
  return models[collection];
}

// CREATE document
app.post('/:collection', verifyOwnerKey, async (req, res) => {
  try {
    const collection = req.params.collection;
    const Model = getModel(collection);
    const doc = new Model(req.body);
    const saved = await doc.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(500).json({ error: 'Create failed', details: err.message });
  }
});

// READ all with optional filter, sort, select, limit, skip
app.get('/:collection', async (req, res) => {
  try {
    const collection = req.params.collection;
    const Model = getModel(collection);
    let mongoFilter = {};
    if (req.query.filter) {
      try {
        mongoFilter = JSON.parse(req.query.filter);
      } catch {
        return res.status(400).json({ error: 'Invalid JSON in filter' });
      }
    }
    const query = Model.find(mongoFilter);
    if (req.query.sort) {
      const sortParams = {};
      req.query.sort.split(',').forEach(f => {
        if (f.startsWith('-')) sortParams[f.substring(1)] = -1;
        else sortParams[f] = 1;
      });
      query.sort(sortParams);
    }
    if (req.query.select) {
      query.select(req.query.select.split(',').join(' '));
    }
    if (req.query.limit) query.limit(parseInt(req.query.limit));
    if (req.query.skip) query.skip(parseInt(req.query.skip));
    const docs = await query.exec();
    res.json(docs);
  } catch (err) {
    res.status(500).json({ error: 'Read failed', details: err.message });
  }
});

// READ by ID
app.get('/:collection/:id', async (req, res) => {
  try {
    const Model = getModel(req.params.collection);
    const doc = await Model.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Not found' });
    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: 'Read by ID failed', details: err.message });
  }
});

// UPDATE by ID
app.put('/:collection/:id', verifyOwnerKey, async (req, res) => {
  try {
    const Model = getModel(req.params.collection);
    const updated = await Model.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ error: 'Not found' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Update failed', details: err.message });
  }
});

// DELETE by ID
app.delete('/:collection/:id', verifyOwnerKey, async (req, res) => {
  try {
    const Model = getModel(req.params.collection);
    const deleted = await Model.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Delete failed', details: err.message });
  }
});

// BULK update
app.put('/:collection', verifyOwnerKey, async (req, res) => {
  try {
    const { filter, update } = req.body;
    if (!filter || !update) return res.status(400).json({ error: 'filter and update required' });
    let mongoFilter = typeof filter === 'string' ? JSON.parse(filter) : filter;
    const Model = getModel(req.params.collection);
    const result = await Model.updateMany(mongoFilter, update);
    res.json({ matchedCount: result.matchedCount, modifiedCount: result.modifiedCount });
  } catch (err) {
    res.status(500).json({ error: 'Bulk update failed', details: err.message });
  }
});

// BULK delete
app.delete('/:collection', verifyOwnerKey, async (req, res) => {
  try {
    const { filter } = req.body;
    if (!filter) return res.status(400).json({ error: 'filter required' });
    let mongoFilter = typeof filter === 'string' ? JSON.parse(filter) : filter;
    const Model = getModel(req.params.collection);
    const result = await Model.deleteMany(mongoFilter);
    res.json({ deletedCount: result.deletedCount });
  } catch (err) {
    res.status(500).json({ error: 'Bulk delete failed', details: err.message });
  }
});

// Ignore favicon.ico requests
app.get('/favicon.ico', (req, res) => res.status(204).end());

// Admin panel route
app.get('/', (req, res) => res.redirect('/admin'));

app.get('/admin', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="nl">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Admin Panel - Puzzle API</title>
<style>
  :root {
    --primary: #4f46e5;
    --primary-dark: #4338ca;
    --error: #ef4444;
    --background: #f9fafb;
    --text: #111827;
    --input-bg: #fff;
    --input-border: #d1d5db;
  }
  body {
    margin: 0; padding: 20px;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    background-color: var(--background);
    color: var(--text);
    display: flex; flex-direction: column; align-items: center;
    min-height: 100vh;
  }
  h1 {
    margin-bottom: 1rem;
  }
  label {
    display: block;
    margin-bottom: 0.25rem;
    font-weight: 600;
  }
  input, textarea {
    width: 100%;
    max-width: 480px;
    padding: 0.5rem;
    margin-bottom: 1rem;
    border: 1px solid var(--input-border);
    border-radius: 6px;
    background: var(--input-bg);
    font-size: 1rem;
    font-family: monospace;
    box-sizing: border-box;
    transition: border-color 0.3s ease;
  }
  input:focus, textarea:focus {
    border-color: var(--primary);
    outline: none;
    box-shadow: 0 0 5px var(--primary);
  }
  button {
    background-color: var(--primary);
    color: white;
    border: none;
    padding: 0.75rem 1.5rem;
    border-radius: 6px;
    font-size: 1rem;
    cursor: pointer;
    transition: background-color 0.3s ease;
    max-width: 480px;
    margin-right: 0.5rem;
  }
  button:hover:not(:disabled) {
    background-color: var(--primary-dark);
  }
  button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  #status {
    max-width: 480px;
    margin-bottom: 1rem;
    font-weight: 700;
  }
  #status.error {
    color: var(--error);
  }
  #result, #documents {
    max-width: 480px;
    background: #fff;
    border: 1px solid var(--input-border);
    border-radius: 6px;
    padding: 1rem;
    white-space: pre-wrap;
    font-family: monospace;
    max-height: 250px;
    overflow-y: auto;
  }
  #buttons {
    max-width: 480px;
    display: flex;
    justify-content: flex-start;
    margin-bottom: 1rem;
  }
</style>
</head>
<body>
<h1>Admin Panel - Puzzle API</h1>

<label for="ownerKey">Owner Key</label>
<input id="ownerKey" type="password" placeholder="Je owner key" autocomplete="off" />

<label for="collection">Collection naam</label>
<input id="collection" type="text" placeholder="Bijv. users" autocomplete="off" />

<label for="docData">Document JSON</label>
<textarea id="docData" rows="6" placeholder='Bijv. {"name":"Alice","age":30}'></textarea>

<div id="buttons">
  <button id="createBtn">Maak document aan</button>
  <button id="loadBtn">Laad documenten</button>
</div>

<div id="status"></div>
<pre id="result"></pre>
<pre id="documents"></pre>

<script>
  const ownerKeyInput = document.getElementById('ownerKey');
  const collectionInput = document.getElementById('collection');
  const docDataInput = document.getElementById('docData');
  const createBtn = document.getElementById('createBtn');
  const loadBtn = document.getElementById('loadBtn');
  const statusEl = document.getElementById('status');
  const resultEl = document.getElementById('result');
  const documentsEl = document.getElementById('documents');

  function setStatus(text, isError = false) {
    statusEl.textContent = text;
    statusEl.className = isError ? 'error' : '';
  }

  createBtn.addEventListener('click', async () => {
    setStatus('');
    resultEl.textContent = '';
    documentsEl.textContent = '';

    const ownerKey = ownerKeyInput.value.trim();
    const collection = collectionInput.value.trim();
    const docText = docDataInput.value.trim();

    if (!ownerKey) {
      setStatus('Owner key is verplicht.', true);
      return;
    }
    if (!collection) {
      setStatus('Collection naam is verplicht.', true);
      return;
    }
    if (!docText) {
      setStatus('Document JSON is verplicht.', true);
      return;
    }

    let docObj;
    try {
      docObj = JSON.parse(docText);
    } catch {
      setStatus('Ongeldige JSON.', true);
      return;
    }

    createBtn.disabled = true;
    setStatus('Versturen...');

    try {
      const response = await fetch(\`/\${collection}\`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-owner-key': ownerKey
        },
        body: JSON.stringify(docObj)
      });
      const data = await response.json();
      if (!response.ok) {
        setStatus('Fout: ' + (data.error || 'Onbekende fout'), true);
        resultEl.textContent = JSON.stringify(data.details || data, null, 2);
      } else {
        setStatus('Document succesvol aangemaakt!');
        resultEl.textContent = JSON.stringify(data, null, 2);
      }
    } catch (err) {
      setStatus('Netwerkfout: ' + err.message, true);
    } finally {
      createBtn.disabled = false;
    }
  });

  loadBtn.addEventListener('click', async () => {
    setStatus('');
    resultEl.textContent = '';
    documentsEl.textContent = '';

    const collection = collectionInput.value.trim();
    if (!collection) {
      setStatus('Collection naam is verplicht om documenten te laden.', true);
      return;
    }

    setStatus('Documenten laden...');

    try {
      const response = await fetch(\`/\${collection}\`);
      if (!response.ok) {
        const errorData = await response.json();
        setStatus('Fout: ' + (errorData.error || 'Onbekende fout'), true);
        return;
      }
      const data = await response.json();
      setStatus(\`Gevonden documenten: \${data.length}\`);
      documentsEl.textContent = JSON.stringify(data, null, 2);
    } catch (err) {
      setStatus('Netwerkfout: ' + err.message, true);
    }
  });
</script>
</body>
</html>`);
});

// Start server & connect DB
const start = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('❌ MongoDB connect failed:', err);
  }
};

start();
