// index.js
import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Bewaar dynamische modellen per collectie
const models = {};

// Maak of pak dynamisch model (schema strikt false = alles kan)
function getModel(collection) {
  if (!models[collection]) {
    // Let op: gebruik collection als modelnaam én collectionnaam
    const schema = new mongoose.Schema({}, { strict: false, timestamps: true });
    models[collection] = mongoose.model(collection, schema, collection);
  }
  return models[collection];
}

// 🌟 Create nieuw document in collectie
app.post('/:collection', async (req, res) => {
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

// 🌟 Lees documenten met uitgebreide filter, sort, paginatie, select
app.get('/:collection', async (req, res) => {
  try {
    const collection = req.params.collection;
    const Model = getModel(collection);

    // Query params
    // filter = JSON-string met MongoDB filter
    // sort = veld1,-veld2
    // select = veld1,veld2
    // limit = nummer
    // skip = nummer
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

// 🌟 Lees 1 document via id
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

// 🌟 Update 1 document via id (hele body)
app.put('/:collection/:id', async (req, res) => {
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

// 🌟 Delete 1 document via id
app.delete('/:collection/:id', async (req, res) => {
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

// 🌟 Bulk update op filter
app.put('/:collection', async (req, res) => {
  try {
    const collection = req.params.collection;
    const { filter, update } = req.body;

    if (!filter || !update) {
      return res.status(400).json({ error: 'filter en update zijn verplicht in body' });
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

// 🌟 Bulk delete op filter
app.delete('/:collection', async (req, res) => {
  try {
    const collection = req.params.collection;
    const { filter } = req.body;

    if (!filter) return res.status(400).json({ error: 'filter is verplicht in body' });

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

const start = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('❌ MongoDB connect failed:', err);
  }
};

start();
