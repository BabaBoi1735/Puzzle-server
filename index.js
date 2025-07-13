require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const app = express();

const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';
const MONGO_URI = process.env.MONGO_URI;

app.use(express.json());

const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  email: { type: String, required: true }
});
const User = mongoose.model('User', userSchema);

mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB error:', err));

app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
      <title>Verify User</title>
      <style>
        body {
          font-family: 'Segoe UI', sans-serif;
          background: #0f0f0f;
          color: white;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100vh;
          margin: 0;
        }
        form {
          background: #1e1e1e;
          padding: 2rem;
          border-radius: 12px;
          box-shadow: 0 0 20px rgba(0,0,0,0.5);
          width: 100%;
          max-width: 400px;
        }
        input {
          margin: 0.5rem 0;
          padding: 0.7rem;
          width: 100%;
          border: none;
          border-radius: 8px;
          background: #2a2a2a;
          color: white;
        }
        button {
          padding: 0.7rem;
          width: 100%;
          border: none;
          border-radius: 8px;
          background: #007bff;
          color: white;
          font-weight: bold;
          cursor: pointer;
          transition: background 0.3s;
          margin-top: 1rem;
        }
        button:hover {
          background: #0056b3;
        }
        .message {
          margin-top: 1rem;
          text-align: center;
        }
      </style>
    </head>
    <body>
      <h2>🔐 User Verification</h2>
      <form id="userForm">
        <input type="text" id="username" placeholder="Username" required />
        <input type="email" id="email" placeholder="Email" required />
        <button type="submit">Submit</button>
        <div class="message" id="message"></div>
      </form>

      <script>
        const form = document.getElementById('userForm');
        const message = document.getElementById('message');

        form.addEventListener('submit', async (e) => {
          e.preventDefault();

          const username = document.getElementById('username').value;
          const email = document.getElementById('email').value;

          try {
            const res = await fetch('/users', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ username, email })
            });

            const data = await res.json();

            if (res.ok) {
              message.textContent = '✅ Successfully submitted!';
              message.style.color = 'lightgreen';
              form.reset();
            } else {
              message.textContent = '❌ ' + (data.error || 'Something went wrong.');
              message.style.color = 'red';
            }
          } catch (err) {
            message.textContent = '❌ Network error';
            message.style.color = 'red';
          }
        });
      </script>
    </body>
    </html>
  `);
});

app.post('/users', async (req, res) => {
  try {
    const { username, email } = req.body;

    if (!username || !email) {
      return res.status(400).json({ error: 'Username and email are required.' });
    }

    const newUser = new User({ username, email });
    await newUser.save();

    res.status(201).json(newUser);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save user.' });
  }
});

app.listen(PORT, HOST, () => {
  console.log(`🚀 Server is running at http://${HOST}:${PORT}`);
});
