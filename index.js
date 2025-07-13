import express from 'express';
import mongoose from 'mongoose';
import nodemailer from 'nodemailer';
import crypto from 'crypto';
import dotenv from 'dotenv';
import Joi from 'joi';
import bcrypt from 'bcryptjs';

dotenv.config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  verified: { type: Boolean, default: false },
  verificationTokenHash: String,
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

const emailSchema = Joi.object({
  email: Joi.string().email().required(),
});

async function generateHashedToken() {
  const token = crypto.randomBytes(32).toString('hex');
  const hash = await bcrypt.hash(token, 12);
  return { token, hash };
}

app.post('/register', async (req, res) => {
  try {
    const { error, value } = emailSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const { email } = value;

    let user = await User.findOne({ email });
    if (user && user.verified) {
      return res.status(400).json({ error: 'Email is already verified' });
    }

    const { token, hash } = await generateHashedToken();
    const expires = Date.now() + 60 * 60 * 1000; // 1 hour

    if (!user) {
      user = new User({ email });
    }

    user.verificationTokenHash = hash;
    user.verificationTokenExpires = expires;
    user.verified = false;

    await user.save();

    const verifyLink = `${process.env.BASE_URL}/verify/${token}`;

    const emailHTML = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: auto; padding: 2rem; border: 1px solid #ddd; border-radius: 8px; background: #f9f9f9;">
        <h2 style="color: #333;">Confirm Your Email Address</h2>
        <p style="font-size: 16px; color: #555;">
          Please click the button below to verify your email address. The link will expire in 1 hour.
        </p>
        <a href="${verifyLink}" style="display: inline-block; padding: 12px 24px; margin: 1rem 0; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">Verify Email</a>
        <p style="font-size: 14px; color: #888;">
          If the button does not work, copy and paste the following link into your browser:<br />
          <a href="${verifyLink}" style="color: #007bff;">${verifyLink}</a>
        </p>
        <hr />
        <p style="font-size: 12px; color: #aaa;">If you did not request this email, please ignore it.</p>
      </div>
    `;

    await transporter.sendMail({
      from: `"Your App" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Please verify your email address',
      html: emailHTML,
    });

    res.json({ message: 'Verification email sent' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'An error occurred, please try again later' });
  }
});

app.get('/verify/:token', async (req, res) => {
  const { token } = req.params;

  try {
    const users = await User.find({
      verificationTokenExpires: { $gt: Date.now() },
      verified: false,
    });

    const user = await Promise.any(
      users.map(async (u) => {
        const match = await bcrypt.compare(token, u.verificationTokenHash);
        return match ? u : Promise.reject();
      })
    ).catch(() => null);

    if (!user) {
      return res.status(400).send(`
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background:#f8d7da; color:#721c24; padding: 2rem; text-align:center; }
          .container { max-width: 600px; margin: auto; background: #f5c6cb; padding: 2rem; border-radius: 10px; }
          a { color: #721c24; text-decoration: underline; }
        </style>
        <div class="container">
          <h1>Verification Failed</h1>
          <p>The verification link is invalid or has expired.</p>
          <p><a href="/">Return to homepage</a></p>
        </div>
      `);
    }

    user.verified = true;
    user.verificationTokenHash = undefined;
    user.verificationTokenExpires = undefined;
    await user.save();

    res.send(`
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background:#d4edda; color:#155724; padding: 2rem; text-align:center; }
        .container { max-width: 600px; margin: auto; background: #c3e6cb; padding: 2rem; border-radius: 10px; }
        a { color: #155724; text-decoration: underline; }
      </style>
      <div class="container">
        <h1>Email Successfully Verified</h1>
        <p>Thank you for verifying your email address.</p>
        <p><a href="/">Go to website</a></p>
      </div>
    `);
  } catch (e) {
    console.error(e);
    res.status(500).send('An error occurred, please try again later.');
  }
});

const start = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');
    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
  }
};

start();
