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

// Dynamisch schema genereren op basis van de collectie
function getModel(collection) {
  if (!models[collection]) {
    const schema = new mongoose.Schema({}, { strict: false, timestamps: true });
    models[collection] = mongoose.model(collection, schema, collection);
  }
  return models[collection];
}

app.get('/', (req, res) => {
  res.send('API is live');
});

// Create of update (upsert)
app.post('/:collection', async (req, res) => {
  try {
    const collection = req.params.collection;
    const Model = getModel(collection);

    const filter = { UserId: req.body.UserId };
    const update = { $set: req.body };
    const options = { upsert: true, new: true };

    const result = await Model.findOneAndUpdate(filter, update, options);
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ error: 'Create/update failed', details: err.message });
  }
});

// Read all (met query opties)
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

// Read by ID
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

// Update by ID
app.put('/:collection/:id', async (req, res) => {
  try {
    const Model = getModel(req.params.collection);
    const updated = await Model.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ error: 'Not found' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Update failed', details: err.message });
  }
});

// Delete by ID
app.delete('/:collection/:id', async (req, res) => {
  try {
    const Model = getModel(req.params.collection);
    const deleted = await Model.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Delete failed', details: err.message });
  }
});

// Bulk update
app.put('/:collection', async (req, res) => {
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

// Bulk delete
app.delete('/:collection', async (req, res) => {
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

app.get('/favicon.ico', (req, res) => res.status(204).end());

// Connectie starten
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
