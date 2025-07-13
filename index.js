require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const app = express();

const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;

app.use(express.json());

const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  verified: { type: Boolean, default: false },
  verificationToken: String,
});
const User = mongoose.model('User', userSchema);

mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB error:', err));

const transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

app.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Email Verification</title>
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
  <h2>🔐 Verify Your Email</h2>
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

      const username = document.getElementById('username').value.trim();
      const email = document.getElementById('email').value.trim();

      try {
        const res = await fetch('/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, email })
        });

        const data = await res.json();

        if (res.ok) {
          message.textContent = '📧 Verification email sent! Check your inbox.';
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
</html>`);
});

app.post('/users', async (req, res) => {
  const { username, email } = req.body;

  if (!username || !email) {
    return res.status(400).json({ error: 'Username and email are required.' });
  }

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      if (existingUser.verified) {
        return res.status(400).json({ error: 'This email is already verified.' });
      } else {
        const verifyLink = `http://${req.headers.host}/verify?token=${existingUser.verificationToken}`;
        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: email,
          subject: 'Please verify your email',
          html: `<p>Hi ${existingUser.username},</p><p>Click the link below to verify your email:</p><a href="${verifyLink}">${verifyLink}</a>`
        });
        return res.status(200).json({ message: 'Verification email resent.' });
      }
    }

    const token = crypto.randomBytes(32).toString('hex');

    const newUser = new User({
      username,
      email,
      verificationToken: token,
    });

    await newUser.save();

    const verifyLink = `http://${req.headers.host}/verify?token=${token}`;

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Please verify your email',
      html: `<p>Hi ${username},</p><p>Click the link below to verify your email:</p><a href="${verifyLink}">${verifyLink}</a>`
    });

    res.status(201).json({ message: 'Verification email sent.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error saving user or sending email.' });
  }
});

app.get('/verify', async (req, res) => {
  const token = req.query.token;

  if (!token) return res.status(400).send('Invalid verification link.');

  try {
    const user = await User.findOne({ verificationToken: token });

    if (!user) return res.status(404).send('User not found or already verified.');

    user.verified = true;
    user.verificationToken = undefined;

    await user.save();

    res.send('<h2 style="color:green;text-align:center;margin-top:3rem">✅ Your email is now verified!</h2>');
  } catch (err) {
    console.error(err);
    res.status(500).send('Something went wrong.');
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
