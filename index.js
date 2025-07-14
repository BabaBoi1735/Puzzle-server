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

// Middleware to check owner key on protected routes
function verifyOwnerKey(req, res, next) {
  const key = req.headers['x-owner-key'];
  if (!key || key !== OWNER_KEY) {
    return res.status(401).json({ error: 'Unauthorized: Invalid owner key' });
  }
  next();
}

// Dynamic models cache
const models = {};
function getModel(collection) {
  if (!models[collection]) {
    const schema = new mongoose.Schema({}, { strict: false, timestamps: true });
    models[collection] = mongoose.model(collection, schema, collection);
  }
  return models[collection];
}

// Routes (same as jouw originele code)
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

app.get('/:collection', async (req, res) => {
  try {
    const collection = req.params.collection;
    const Model = getModel(collection);
    const { filter, sort, select, limit, skip } = req.query;
    let mongoFilter = {};
    if (filter) {
      try {
        mongoFilter = JSON.parse(filter);
      } catch {
        return res.status(400).json({ error: 'Invalid JSON in filter' });
      }
    }
    const query = Model.find(mongoFilter);
    if (sort) {
      const sortParams = {};
      sort.split(',').forEach(field => {
        if (field.startsWith('-')) {
          sortParams[field.substring(1)] = -1;
        } else {
          sortParams[field] = 1;
        }
      });
      query.sort(sortParams);
    }
    if (select) {
      query.select(select.split(',').join(' '));
    }
    if (limit) query.limit(parseInt(limit));
    if (skip) query.skip(parseInt(skip));
    const items = await query.exec();
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: 'Read failed', details: err.message });
  }
});

app.get('/:collection/:id', async (req, res) => {
  try {
    const { collection, id } = req.params;
    const Model = getModel(collection);
    const doc = await Model.findById(id);
    if (!doc) return res.status(404).json({ error: 'Not found' });
    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: 'Read by ID failed', details: err.message });
  }
});

app.put('/:collection/:id', verifyOwnerKey, async (req, res) => {
  try {
    const { collection, id } = req.params;
    const Model = getModel(collection);
    const updated = await Model.findByIdAndUpdate(id, req.body, { new: true, runValidators: false });
    if (!updated) return res.status(404).json({ error: 'Not found' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Update failed', details: err.message });
  }
});

app.delete('/:collection/:id', verifyOwnerKey, async (req, res) => {
  try {
    const { collection, id } = req.params;
    const Model = getModel(collection);
    const deleted = await Model.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Delete failed', details: err.message });
  }
});

app.put('/:collection', verifyOwnerKey, async (req, res) => {
  try {
    const collection = req.params.collection;
    const { filter, update } = req.body;
    if (!filter || !update) {
      return res.status(400).json({ error: 'filter and update are required in body' });
    }
    let mongoFilter = {};
    try {
      mongoFilter = typeof filter === 'string' ? JSON.parse(filter) : filter;
    } catch {
      return res.status(400).json({ error: 'Invalid JSON in filter' });
    }
    const Model = getModel(collection);
    const result = await Model.updateMany(mongoFilter, update);
    res.json({ matchedCount: result.matchedCount, modifiedCount: result.modifiedCount });
  } catch (err) {
    res.status(500).json({ error: 'Bulk update failed', details: err.message });
  }
});

app.delete('/:collection', verifyOwnerKey, async (req, res) => {
  try {
    const collection = req.params.collection;
    const { filter } = req.body;
    if (!filter) return res.status(400).json({ error: 'filter is required in body' });
    let mongoFilter = {};
    try {
      mongoFilter = typeof filter === 'string' ? JSON.parse(filter) : filter;
    } catch {
      return res.status(400).json({ error: 'Invalid JSON in filter' });
    }
    const Model = getModel(collection);
    const result = await Model.deleteMany(mongoFilter);
    res.json({ deletedCount: result.deletedCount });
  } catch (err) {
    res.status(500).json({ error: 'Bulk delete failed', details: err.message });
  }
});

app.get('/', (req, res) => {
  res.send('✅ Puzzle API is live.');
});

// Moderne admin pagina route
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
    #result {
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

  <button id="createBtn">Maak document aan</button>

  <div id="status"></div>
  <pre id="result"></pre>

  <script>
    const ownerKeyInput = document.getElementById('ownerKey');
    const collectionInput = document.getElementById('collection');
    const docDataInput = document.getElementById('docData');
    const createBtn = document.getElementById('createBtn');
    const statusEl = document.getElementById('status');
    const resultEl = document.getElementById('result');

    function setStatus(text, isError = false) {
      statusEl.textContent = text;
      statusEl.className = isError ? 'error' : '';
    }

    createBtn.addEventListener('click', async () => {
      setStatus('');
      resultEl.textContent = '';

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
  </script>
</body>
</html>`);
});

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
