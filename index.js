import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const models = {};

function getModel(collection) {
  if (!models[collection]) {
    const schema = new mongoose.Schema({}, { strict: false, timestamps: true });
    models[collection] = mongoose.model(collection, schema, collection);
  }
  return models[collection];
}

function requireData(req, res, next) {
  if (
    req.method === 'GET' &&
    (!req.query.filter && !req.params.id)
  ) {
    return res.status(400).json({ error: 'Filter or ID is required to access this resource.' });
  }
  if (
    ['POST', 'PUT', 'DELETE'].includes(req.method) &&
    !Object.keys(req.body).length
  ) {
    return res.status(400).json({ error: 'Request body required' });
  }
  next();
}

// API health check
app.get('/', (req, res) => {
  res.send('API is live');
});

// ✅ CREATE: nieuw document toevoegen
app.post('/:collection', requireData, async (req, res) => {
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

// ✅ READ: één document op ID
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

// ✅ READ: meerdere documenten op filter
app.get('/:collection', requireData, async (req, res) => {
  try {
    const Model = getModel(req.params.collection);

    let mongoFilter = {};
    try {
      mongoFilter = JSON.parse(req.query.filter);
    } catch {
      return res.status(400).json({ error: 'Invalid JSON in filter' });
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

// ✅ UPDATE: op ID
app.put('/:collection/:id', requireData, async (req, res) => {
  try {
    const Model = getModel(req.params.collection);
    const updated = await Model.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ error: 'Not found' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Update by ID failed', details: err.message });
  }
});

// ✅ UPDATE: bulk (op filter)
app.put('/:collection', requireData, async (req, res) => {
  try {
    const { filter, update } = req.body;
    if (!filter || !update) return res.status(400).json({ error: 'filter and update required' });

    const Model = getModel(req.params.collection);
    const mongoFilter = typeof filter === 'string' ? JSON.parse(filter) : filter;

    const result = await Model.updateMany(mongoFilter, update);
    res.json({ matchedCount: result.matchedCount, modifiedCount: result.modifiedCount });
  } catch (err) {
    res.status(500).json({ error: 'Bulk update failed', details: err.message });
  }
});

// ✅ DELETE: op ID
app.delete('/:collection/:id', requireData, async (req, res) => {
  try {
    const Model = getModel(req.params.collection);
    const deleted = await Model.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Delete by ID failed', details: err.message });
  }
});

// ✅ DELETE: bulk (op filter)
app.delete('/:collection', requireData, async (req, res) => {
  try {
    const { filter } = req.body;
    if (!filter) return res.status(400).json({ error: 'filter required' });

    const Model = getModel(req.params.collection);
    const mongoFilter = typeof filter === 'string' ? JSON.parse(filter) : filter;

    const result = await Model.deleteMany(mongoFilter);
    res.json({ deletedCount: result.deletedCount });
  } catch (err) {
    res.status(500).json({ error: 'Bulk delete failed', details: err.message });
  }
});

// Favicon ignore
app.get('/favicon.ico', (req, res) => res.status(204).end());

// Start server
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
