import express from 'express';
import mongoose from 'mongoose';
import nodemailer from 'nodemailer';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

const start = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const UserSchema = new mongoose.Schema({
      email: { type: String, required: true, unique: true },
      verified: { type: Boolean, default: false },
      verificationToken: String,
      verificationTokenExpires: Date,
    });

    const User = mongoose.model('User', UserSchema);

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    app.post('/register', async (req, res) => {
      const { email } = req.body;
      if (!email) return res.status(400).json({ error: 'Email is required' });

      try {
        let user = await User.findOne({ email });
        if (user) return res.status(400).json({ error: 'Email bestaat al' });

        const token = crypto.randomBytes(32).toString('hex');
        const expires = Date.now() + 24 * 60 * 60 * 1000; // 24 uur geldig

        user = new User({
          email,
          verificationToken: token,
          verificationTokenExpires: expires,
          verified: false,
        });

        await user.save();

        const verifyLink = `${process.env.BASE_URL}/verify/${token}`;

        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: email,
          subject: 'Verifieer je email',
          html: `<p>Klik op de link om je email te verifiëren:</p><a href="${verifyLink}">${verifyLink}</a>`,
        });

        res.json({ message: 'Verificatie mail verstuurd' });
      } catch (e) {
        res.status(500).json({ error: e.message });
      }
    });

    app.get('/verify/:token', async (req, res) => {
      const { token } = req.params;

      try {
        const user = await User.findOne({
          verificationToken: token,
          verificationTokenExpires: { $gt: Date.now() },
        });

        if (!user) return res.status(400).send('Verificatie token ongeldig of verlopen.');

        user.verified = true;
        user.verificationToken = undefined;
        user.verificationTokenExpires = undefined;

        await user.save();

        res.send('Email succesvol geverifieerd!');
      } catch (e) {
        res.status(500).send('Er is een fout opgetreden.');
      }
    });

    app.listen(PORT, () => {
      console.log(`Server draait op http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Fout bij starten server:', error);
  }
};

start();
