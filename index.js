import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';

dotenv.config();

const app = express();
app.use(express.json()); // Body parser voor JSON

// CORS middleware toevoegen, zodat headers als Content-Type toegestaan worden
app.use(cors({
  origin: '*', // staat alle domeinen toe, voor dev kan je dit later specifieker maken
  allowedHeaders: ['Content-Type', 'Authorization'], // headers die je toestaat
}));

const PORT = process.env.PORT || 3000;

// Voorbeeld Mongoose schema
const UserSchema = new mongoose.Schema({
  username: String,
  email: String,
});

const User = mongoose.model('User', UserSchema);

app.get('/', (req, res) => {
  res.send('Hello from the Puzzle Game API!');
});

// Endpoint om user toe te voegen
app.post('/users', async (req, res) => {
  try {
    const { username, email } = req.body;
    if (!username || !email) {
      return res.status(400).json({ error: 'Username and email required' });
    }

    const user = new User({ username, email });
    await user.save();

    res.status(201).json({ message: 'User created', user });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Endpoint om users op te halen
app.get('/users', async (req, res) => {
  try {
    const users = await User.find({});
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

const start = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
  }
};

start();
