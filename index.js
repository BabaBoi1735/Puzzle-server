require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const app = express();

const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';
const MONGO_URI = process.env.MONGO_URI;

app.use(express.json());

app.use(express.static(path.join(__dirname, 'public')));

const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  email: { type: String, required: true }
});
const User = mongoose.model('User', userSchema);

mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ Verbonden met MongoDB'))
  .catch(err => console.error('❌ MongoDB error:', err));

app.post('/users', async (req, res) => {
  try {
    const { username, email } = req.body;

    if (!username || !email) {
      return res.status(400).json({ error: 'Username en email zijn verplicht' });
    }

    const newUser = new User({ username, email });
    await newUser.save();

    res.status(201).json(newUser);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Kon user niet opslaan' });
  }
});

app.listen(PORT, HOST, () => {
  console.log(`🚀 Server draait op http://${HOST}:${PORT}`);
});
