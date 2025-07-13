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
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
});

const renderIndex = () => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Email Verification</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: linear-gradient(135deg, #2a2a72, #009ffd);
      color: white;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100vh;
      margin: 0;
    }
    form {
      background: rgba(0,0,0,0.6);
      padding: 2rem;
      border-radius: 12px;
      width: 100%;
      max-width: 400px;
      box-shadow: 0 8px 32px rgba(31, 38, 135, 0.37);
      backdrop-filter: blur(8.5px);
      -webkit-backdrop-filter: blur(8.5px);
      border: 1px solid rgba(255,255,255,0.18);
    }
    input, button {
      width: 100%;
      padding: 0.8rem;
      margin: 0.6rem 0;
      border-radius: 8px;
      border: none;
      font-size: 1rem;
    }
    input {
      background: rgba(255,255,255,0.1);
      color: white;
    }
    input::placeholder {
      color: #ddd;
    }
    button {
      background: #00d1ff;
      color: #000;
      font-weight: 700;
      cursor: pointer;
      transition: background 0.3s ease;
    }
    button:hover {
      background: #008caa;
      color: white;
    }
    .message {
      margin-top: 1rem;
      text-align: center;
      font-weight: 600;
    }
    .success {
      color: #a6e22e;
    }
    .error {
      color: #ff5370;
    }
  </style>
</head>
<body>
  <h1>Email Verification 🔐</h1>
  <form id="userForm" autocomplete="off">
    <input type="text" id="username" placeholder="Username" required autocomplete="off" />
    <input type="email" id="email" placeholder="Email" required autocomplete="off" />
    <button type="submit">Send Verification Email</button>
    <div id="message" class="message"></div>
  </form>

  <script>
    const form = document.getElementById('userForm');
    const message = document.getElementById('message');

    form.addEventListener('submit', async e => {
      e.preventDefault();
      message.textContent = '';
      message.className = 'message';

      const username = form.username.value.trim();
      const email = form.email.value.trim();

      if (!username || !email) {
        message.textContent = 'Please fill in all fields.';
        message.classList.add('error');
        return;
      }

      try {
        const res = await fetch('/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, email })
        });
        const data = await res.json();

        if (res.ok) {
          message.textContent = '📧 Verification email sent! Check your inbox.';
          message.classList.add('success');
          form.reset();
        } else {
          message.textContent = '❌ ' + (data.error || 'Something went wrong.');
          message.classList.add('error');
        }
      } catch {
        message.textContent = '❌ Network error.';
        message.classList.add('error');
      }
    });
  </script>
</body>
</html>
`;

const renderVerified = () => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Email Verified</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: linear-gradient(135deg, #28a745, #155724);
      color: white;
      display: flex; justify-content: center; align-items: center;
      height: 100vh; margin: 0; text-align: center;
    }
    h1 { font-size: 2.5rem; margin-bottom: 1rem; }
    p { font-size: 1.2rem; }
  </style>
</head>
<body>
  <div>
    <h1>✅ Email Verified!</h1>
    <p>Thank you for confirming your email address.</p>
  </div>
</body>
</html>
`;

const renderInvalid = () => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Invalid Link</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: #dc3545;
      color: white;
      display: flex; justify-content: center; align-items: center;
      height: 100vh; margin: 0; text-align: center;
    }
    h1 { font-size: 2.5rem; margin-bottom: 1rem; }
    p { font-size: 1.2rem; }
  </style>
</head>
<body>
  <div>
    <h1>❌ Invalid Verification Link</h1>
    <p>The verification link is missing or invalid.</p>
  </div>
</body>
</html>
`;

const renderNotFound = () => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>User Not Found</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: #ffc107;
      color: #212529;
      display: flex; justify-content: center; align-items: center;
      height: 100vh; margin: 0; text-align: center;
    }
    h1 { font-size: 2.5rem; margin-bottom: 1rem; }
    p { font-size: 1.2rem; }
  </style>
</head>
<body>
  <div>
    <h1>⚠️ User Not Found or Already Verified</h1>
    <p>The verification token is invalid or the user is already verified.</p>
  </div>
</body>
</html>
`;

const renderError = () => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Server Error</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: #343a40;
      color: white;
      display: flex; justify-content: center; align-items: center;
      height: 100vh; margin: 0; text-align: center;
    }
    h1 { font-size: 2.5rem; margin-bottom: 1rem; }
    p { font-size: 1.2rem; }
  </style>
</head>
<body>
  <div>
    <h1>⚠️ Something Went Wrong</h1>
    <p>Please try again later.</p>
  </div>
</body>
</html>
`;

app.get('/', (req, res) => {
  res.send(renderIndex());
});

app.post('/users', async (req, res) => {
  const { username, email } = req.body;
  if (!username || !email) return res.status(400).json({ error: 'Username and email are required.' });

  try {
    let user = await User.findOne({ email });
    if (user) {
      if (user.verified) {
        return res.status(400).json({ error: 'This email is already verified.' });
      } else {
        const verifyLink = `${req.protocol}://${req.get('host')}/verify?token=${user.verificationToken}`;
        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: email,
          subject: 'Please verify your email',
          html: `<p>Hi ${user.username},</p><p>Click the link below to verify your email:</p><a href="${verifyLink}">${verifyLink}</a>`,
        });
        return res.status(200).json({ message: 'Verification email resent.' });
      }
    }

    const token = crypto.randomBytes(32).toString('hex');
    user = new User({ username, email, verificationToken: token });
    await user.save();

    const verifyLink = `${req.protocol}://${req.get('host')}/verify?token=${token}`;
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Please verify your email',
      html: `<p>Hi ${username},</p><p>Click the link below to verify your email:</p><a href="${verifyLink}">${verifyLink}</a>`,
    });

    res.status(201).json({ message: 'Verification email sent.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error saving user or sending email.' });
  }
});

app.get('/verify', async (req, res) => {
  const token = req.query.token;
  if (!token) return res.status(400).send(renderInvalid());

  try {
    const user = await User.findOne({ verificationToken: token });
    if (!user) return res.status(404).send(renderNotFound());

    user.verified = true;
    user.verificationToken = undefined;
    await user.save();

    res.send(renderVerified());
  } catch (err) {
    console.error(err);
    res.status(500).send(renderError());
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
