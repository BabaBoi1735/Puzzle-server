import express from 'express';
import mongoose from 'mongoose';
import crypto from 'crypto';

const app = express();
const port = 3000;

const MONGO_URI = 'mongodb+srv://andrewbeijnen:Mcdonalds1@tonelabaccounts.inacdvb.mongodb.net/jeDatabaseNaam?retryWrites=true&w=majority';
await mongoose.connect(MONGO_URI);
console.log('Connected to MongoDB');

// User schema
const userSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
});

const sessionSchema = new mongoose.Schema({
  sessionId: { type: String, unique: true, required: true },
  username: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, expires: 60 * 60 * 24 }, // 24 uur sessie
});

const User = mongoose.model('User', userSchema);
const Session = mongoose.model('Session', sessionSchema);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

function generateSessionId() {
  return crypto.randomBytes(16).toString('hex');
}

const html = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>MongoDB Verification System</title>
<style>
  body { font-family: Arial, sans-serif; padding: 2rem; background: #f0f0f0; }
  input, button { padding: 0.5rem; font-size: 1rem; margin: 0.5rem 0; }
  button { cursor: pointer; border-radius: 5px; border: none; background: #007bff; color: white; }
  button:hover { background: #0056b3; }
  pre { background: #222; color: #eee; padding: 1rem; max-height: 300px; overflow-y: auto; border-radius: 5px; }
</style>
</head>
<body>
  <h1>Basic User Verification with MongoDB</h1>
  <label for="username">Username:</label><br/>
  <input type="text" id="username" placeholder="Enter username" /><br/>
  <button id="registerBtn">Register</button>
  <button id="loginBtn">Login</button>

  <pre id="output">Please register or login.</pre>

  <script>
    const output = document.getElementById('output');
    const usernameInput = document.getElementById('username');

    document.getElementById('registerBtn').onclick = async () => {
      const username = usernameInput.value.trim();
      if (!username) {
        output.textContent = 'Please enter a username.';
        return;
      }
      output.textContent = 'Registering...';
      const res = await fetch('/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
      });
      const data = await res.json();
      output.textContent = JSON.stringify(data, null, 2);
    };

    document.getElementById('loginBtn').onclick = async () => {
      const username = usernameInput.value.trim();
      if (!username) {
        output.textContent = 'Please enter a username.';
        return;
      }
      output.textContent = 'Logging in...';
      const res = await fetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
      });
      const data = await res.json();
      output.textContent = JSON.stringify(data, null, 2);
    };
  </script>
</body>
</html>
`;

app.get('/', (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(html);
});

app.post('/register', async (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ error: 'Username required' });

  try {
    const existingUser = await User.findOne({ username });
    if (existingUser) return res.status(400).json({ error: 'Username already exists' });

    const newUser = new User({ username });
    await newUser.save();

    res.json({ message: 'User registered', username });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/login', async (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ error: 'Username required' });

  try {
    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ error: 'User not found' });

    const sessionId = generateSessionId();
    const session = new Session({ sessionId, username });
    await session.save();

    res.json({ message: 'Logged in', username, sessionId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
