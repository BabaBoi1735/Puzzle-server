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

// === Dynamische schema opslag ===
const schemas = {};

// === Dynamisch schema ophalen of aanmaken ===
function getModel(collection, schemaFields) {
  if (!schemas[collection]) {
    const dynamicSchema = new mongoose.Schema(schemaFields || {}, { strict: false });
    schemas[collection] = mongoose.model(collection, dynamicSchema);
  }
  return schemas[collection];
}

// === CRUD routes ===

// ➕ Create
app.post('/:collection', async (req, res) => {
  try {
    const collection = req.params.collection;
    const Model = getModel(collection);
    const item = new Model(req.body);
    const saved = await item.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(500).json({ error: 'Create failed', details: err.message });
  }
});

// 📄 Read all
app.get('/:collection', async (req, res) => {
  try {
    const collection = req.params.collection;
    const Model = getModel(collection);
    const items = await Model.find({});
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: 'Read failed', details: err.message });
  }
});

// 📝 Update
app.put('/:collection/:id', async (req, res) => {
  try {
    const { collection, id } = req.params;
    const Model = getModel(collection);
    const updated = await Model.findByIdAndUpdate(id, req.body, { new: true });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Update failed', details: err.message });
  }
});

// ❌ Delete
app.delete('/:collection/:id', async (req, res) => {
  try {
    const { collection, id } = req.params;
    const Model = getModel(collection);
    await Model.findByIdAndDelete(id);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Delete failed', details: err.message });
  }
});

app.get('/', (req, res) => {
  res.send('✅ Puzzle API is live.');
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
