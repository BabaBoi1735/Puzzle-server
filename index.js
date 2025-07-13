const express = require('express');
const mongoose = require('mongoose');
const crypto = require('crypto');
require('dotenv').config();

const app = express();
app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB verbonden'))
  .catch(console.error);

const User = mongoose.model('User', new mongoose.Schema({
  username: String,
  code: String,
  verified: { type: Boolean, default: false }
}));

// UI
app.get('/', (req, res) => {
  res.send(`
    <h1>Roblox Code Verificatie</h1>
    <form method="POST" action="/generate-code">
      <input name="username" placeholder="Roblox naam" required />
      <button type="submit">Genereer Code</button>
    </form>
  `);
});

// Form parser
app.use(express.urlencoded({ extended: true }));

// Genereer verificatiecode
app.post('/generate-code', async (req, res) => {
  const { username } = req.body;
  if (!username) return res.send('❌ Gebruikersnaam vereist.');

  const code = Math.floor(100000 + Math.random() * 900000).toString(); // 6-cijferig
  let user = await User.findOne({ username });

  if (!user) {
    user = new User({ username, code });
  } else {
    user.code = code;
    user.verified = false;
  }

  await user.save();

  res.send(`
    <h2>📋 Code gegenereerd</h2>
    <p>Hallo ${username}, voer deze code in jouw Roblox game in:</p>
    <h1>${code}</h1>
  `);
});

// Roblox server checkt hier of code klopt
app.post('/check-code', async (req, res) => {
  const { username, code } = req.body;
  const user = await User.findOne({ username, code });

  if (!user) return res.status(404).json({ verified: false });

  user.verified = true;
  await user.save();

  res.json({ verified: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server draait op http://localhost:${PORT}`));
