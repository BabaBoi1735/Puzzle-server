import express from 'express';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();
const router = express.Router();

const UserSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['owner', 'admin', 'moderator', 'player'], default: 'player' },
  isVerified: { type: Boolean, default: false }, // voor owner email verificatie
  verificationToken: String,
  verificationTokenExpires: Date,
}, { timestamps: true });

const User = mongoose.model('User', UserSchema);

// Nodemailer transporter
const transporter = nodemailer.createTransport({
  service: 'gmail', // of wat jij wil
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// HELPER: Verstuur verificatie email
async function sendVerificationEmail(user, req) {
  const token = crypto.randomBytes(32).toString('hex');
  user.verificationToken = token;
  user.verificationTokenExpires = Date.now() + 3600000; // 1 uur geldig
  await user.save();

  const verifyUrl = `${process.env.BASE_URL}/auth/owner/verify?token=${token}`;

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: user.username, // username is owner email
    subject: 'Owner verificatie link',
    html: `<p>Verifieer jezelf door op de link te klikken binnen 1 uur:</p><a href="${verifyUrl}">${verifyUrl}</a>`
  };

  await transporter.sendMail(mailOptions);
}

// ROUTE: Owner vraagt verificatie mail aan
router.post('/owner/request-verification', async (req, res) => {
  try {
    const { username } = req.body;
    if (!username) return res.status(400).json({ error: 'Email (username) is verplicht' });

    // Check of user bestaat en role owner is
    let user = await User.findOne({ username });
    if (!user || user.role !== 'owner') return res.status(401).json({ error: 'Geen owner account gevonden' });

    await sendVerificationEmail(user, req);
    res.json({ message: 'Verificatie email gestuurd!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error tijdens verzenden verificatie mail' });
  }
});

// ROUTE: Owner verifieert token en logt in
router.get('/owner/verify', async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).send('Token is verplicht');

    const user = await User.findOne({
      verificationToken: token,
      verificationTokenExpires: { $gt: Date.now() }
    });
    if (!user) return res.status(400).send('Token ongeldig of verlopen');

    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpires = undefined;
    await user.save();

    // Hier kan je een JWT token teruggeven, sessie maken, etc.
    // Voor nu return success message met user info
    res.json({ message: 'Owner verified, je kan nu inloggen', user: { username: user.username, role: user.role } });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// ROUTE: Login (owner + players)
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'username en password zijn verplicht' });

    const user = await User.findOne({ username });
    if (!user) return res.status(401).json({ error: 'Geen account gevonden' });

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) return res.status(401).json({ error: 'Wachtwoord incorrect' });

    if (user.role === 'owner' && !user.isVerified) {
      return res.status(401).json({ error: 'Owner moet eerst verifiëren via email' });
    }

    // Return user data (in productie JWT token gebruiken)
    res.json({ message: 'Inloggen geslaagd', user: { username: user.username, role: user.role } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Middleware voor role check
function authorize(allowedRoles = []) {
  return (req, res, next) => {
    // In echte app: check JWT token en zet req.user
    // Voor demo: je kan username + role in headers meegeven (niet veilig, alleen voor demo)
    const role = req.headers['x-role'];
    if (!role || !allowedRoles.includes(role)) {
      return res.status(403).json({ error: 'Geen toegang' });
    }
    next();
  };
}

// ROUTE: Maak nieuwe user (owner of admin only)
router.post('/admin/users', authorize(['owner', 'admin']), async (req, res) => {
  try {
    const { username, password, role } = req.body;
    if (!username || !password || !role) return res.status(400).json({ error: 'username, password en role zijn verplicht' });
    if (!['owner','admin','moderator','player'].includes(role)) return res.status(400).json({ error: 'Ongeldige role' });

    const exists = await User.findOne({ username });
    if (exists) return res.status(400).json({ error: 'User bestaat al' });

    const passwordHash = await bcrypt.hash(password, 10);
    const newUser = new User({ username, passwordHash, role, isVerified: role === 'owner' ? false : true });
    await newUser.save();

    res.status(201).json({ message: 'User gemaakt', user: { username, role } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ROUTE: Lijst users (owner + admin)
router.get('/admin/users', authorize(['owner', 'admin']), async (req, res) => {
  try {
    const users = await User.find({}, 'username role isVerified createdAt updatedAt');
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
