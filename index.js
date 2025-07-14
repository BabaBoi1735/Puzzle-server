import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import path from 'path';

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

// Bewaar dynamische modellen per collectie
const models = {};
function getModel(collection) {
  if (!models[collection]) {
    const schema = new mongoose.Schema({}, { strict: false, timestamps: true });
    models[collection] = mongoose.model(collection, schema, collection);
  }
  return models[collection];
}

// Admin panel HTML (front-end) - serve als string
const adminHtml = `<!DOCTYPE html>
<html lang="nl">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Owner Admin Panel - Puzzle Game</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
  :root {
    --color-primary: #4f46e5;
    --color-primary-hover: #4338ca;
    --color-bg: #f9fafb;
    --color-card-bg: #ffffff;
    --color-text-primary: #111827;
    --color-text-secondary: #6b7280;
    --color-error: #ef4444;
    --color-success: #22c55e;
    --border-radius: 12px;
    --shadow: 0 4px 12px rgb(0 0 0 / 0.1);
    --transition: 0.3s ease;
    --font-family: 'Inter', sans-serif;
  }
  *, *::before, *::after { box-sizing: border-box; }
  body {
    margin: 0; font-family: var(--font-family);
    background-color: var(--color-bg);
    color: var(--color-text-primary);
    min-height: 100vh;
    display: flex;
    justify-content: center;
    align-items: flex-start;
    padding: 3rem 1rem;
  }
  .container {
    width: 100%;
    max-width: 720px;
  }
  header { text-align: center; margin-bottom: 2.5rem; }
  header h1 {
    font-weight: 700;
    font-size: 2.5rem;
    color: var(--color-primary);
    letter-spacing: 0.05em;
  }
  .card {
    background: var(--color-card-bg);
    border-radius: var(--border-radius);
    box-shadow: var(--shadow);
    padding: 2rem 2.5rem;
    margin-bottom: 2rem;
    transition: box-shadow var(--transition);
  }
  .card:hover {
    box-shadow: 0 8px 24px rgb(0 0 0 / 0.15);
  }
  .hidden {
    display: none !important;
  }
  h2 {
    margin-top: 0;
    margin-bottom: 1.25rem;
    font-weight: 700;
    font-size: 1.75rem;
    color: var(--color-text-primary);
    border-bottom: 2px solid var(--color-primary);
    padding-bottom: 0.25rem;
  }
  h3 {
    margin-top: 1.5rem;
    margin-bottom: 0.8rem;
    font-weight: 600;
    color: var(--color-text-primary);
  }
  form > label {
    display: block;
    font-weight: 600;
    margin-bottom: 0.35rem;
    color: var(--color-text-secondary);
    font-size: 0.9rem;
  }
  input[type="email"],
  input[type="password"],
  select {
    width: 100%;
    padding: 0.75rem 1rem;
    font-size: 1rem;
    border-radius: 8px;
    border: 1.8px solid #d1d5db;
    transition: border-color var(--transition);
    font-family: var(--font-family);
  }
  input[type="email"]:focus,
  input[type="password"]:focus,
  select:focus {
    border-color: var(--color-primary);
    outline: none;
    box-shadow: 0 0 8px var(--color-primary-hover);
  }
  button {
    margin-top: 1.8rem;
    padding: 0.9rem 1.3rem;
    width: 100%;
    font-weight: 700;
    font-size: 1.1rem;
    color: white;
    background-color: var(--color-primary);
    border: none;
    border-radius: 8px;
    cursor: pointer;
    transition: background-color var(--transition);
    box-shadow: 0 4px 10px rgb(79 70 229 / 0.4);
  }
  button:hover {
    background-color: var(--color-primary-hover);
    box-shadow: 0 6px 14px rgb(67 56 202 / 0.6);
  }
  #messages {
    min-height: 30px;
    margin-bottom: 1.8rem;
    font-weight: 600;
    font-size: 1rem;
  }
  .message {
    padding: 12px 16px;
    border-radius: 8px;
    margin-bottom: 1rem;
    font-size: 1rem;
    user-select: none;
    animation: fadeIn 0.4s ease forwards;
  }
  .error {
    background-color: #fee2e2;
    color: var(--color-error);
    border: 1.5px solid var(--color-error);
  }
  .success {
    background-color: #d1fae5;
    color: var(--color-success);
    border: 1.5px solid var(--color-success);
  }
  @keyframes fadeIn {
    from {opacity: 0; transform: translateY(-10px);}
    to {opacity: 1; transform: translateY(0);}
  }
  table {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0 8px;
    margin-top: 1rem;
  }
  th, td {
    padding: 12px 16px;
    text-align: left;
    font-size: 1rem;
  }
  thead th {
    color: var(--color-text-secondary);
    font-weight: 600;
    padding-bottom: 10px;
    border-bottom: 2px solid #e5e7eb;
  }
  tbody tr {
    background: var(--color-bg);
    box-shadow: var(--shadow);
    border-radius: var(--border-radius);
    transition: background-color var(--transition);
  }
  tbody tr:hover {
    background-color: #eef2ff;
  }
  tbody td {
    background: var(--color-card-bg);
    border-radius: 8px;
  }
  .action-btn {
    background-color: #ef4444;
    border: none;
    padding: 7px 12px;
    border-radius: 6px;
    color: white;
    font-weight: 600;
    font-size: 0.9rem;
    cursor: pointer;
    transition: background-color var(--transition);
  }
  .action-btn:hover {
    background-color: #b91c1c;
  }
  @media (max-width: 480px) {
    .container {
      padding: 0 1rem;
    }
    header h1 {
      font-size: 1.9rem;
    }
    h2 {
      font-size: 1.4rem;
    }
    button {
      font-size: 1rem;
    }
  }
</style>
</head>
<body>
  <main class="container">

    <header>
      <h1>Admin Panel</h1>
    </header>

    <section id="messages"></section>

    <section id="login-section" class="card">
      <h2>Inloggen als Owner</h2>
      <form id="login-form" autocomplete="off">
        <label for="login-email">Email</label>
        <input type="email" id="login-email" required autocomplete="username" placeholder="jouw email" />

        <label for="login-password">Wachtwoord</label>
        <input type="password" id="login-password" required autocomplete="current-password" placeholder="wachtwoord" />

        <button type="submit">Inloggen</button>
      </form>
    </section>

    <section id="verification-section" class="card hidden">
      <h2>Verificatie mail aanvragen</h2>
      <button id="btn-send-verification">Verificatie mail sturen</button>
    </section>

    <section id="user-management" class="card hidden">
      <h2>Gebruikersbeheer</h2>
      
      <form id="create-user-form" autocomplete="off">
        <h3>Nieuwe gebruiker maken</h3>
        <label for="new-email">Email</label>
        <input type="email" id="new-email" required autocomplete="username" placeholder="nieuwe gebruiker email" />
        
        <label for="new-password">Wachtwoord</label>
        <input type="password" id="new-password" required autocomplete="new-password" placeholder="nieuw wachtwoord" />

        <label for="new-role">Rol</label>
        <select id="new-role">
          <option value="player">Player</option>
          <option value="moderator">Moderator</option>
          <option value="admin">Admin</option>
        </select>

        <button type="submit">Gebruiker aanmaken</button>
      </form>

      <h3>Bestaande gebruikers</h3>
      <table id="users-table" aria-label="Gebruikers tabel">
        <thead>
          <tr><th>Email</th><th>Rol</th><th>Acties</th></tr>
        </thead>
        <tbody></tbody>
      </table>
    </section>

  </main>

<script>
  const API_BASE = '';

  const loginSection = document.getElementById('login-section');
  const verificationSection = document.getElementById('verification-section');
  const userManagementSection = document.getElementById('user-management');
  const messagesEl = document.getElementById('messages');

  const loginForm = document.getElementById('login-form');
  const btnSendVerification = document.getElementById('btn-send-verification');
  const createUserForm = document.getElementById('create-user-form');
  const usersTableBody = document.querySelector('#users-table tbody');

  let authToken = null;
  let users = [];

  function showMessage(text, type = 'success') {
    messagesEl.innerHTML = \`<div class="message \${type}">\${text}</div>\`;
    setTimeout(() => { messagesEl.innerHTML = ''; }, 5000);
  }

  loginForm.addEventListener('submit', async e => {
    e.preventDefault();
    const email = loginForm['login-email'].value.trim();
    const password = loginForm['login-password'].value;

    try {
      if(email === 'owner@example.com' && password === 'ownerpass') {
        authToken = 'dummy-owner-token';
        showMessage('Succesvol ingelogd als owner', 'success');
        loginSection.classList.add('hidden');
        verificationSection.classList.remove('hidden');
        userManagementSection.classList.remove('hidden');
        await fetchUsers();
      } else {
        throw new Error('Foute credentials');
      }
    } catch(err) {
      showMessage(err.message, 'error');
    }
  });

  btnSendVerification.addEventListener('click', async () => {
    try {
      await fakeApiDelay();
      showMessage('Verificatie mail verzonden naar je email.', 'success');
    } catch(err) {
      showMessage('Kon verificatie mail niet sturen.', 'error');
    }
  });

  createUserForm.addEventListener('submit', async e => {
    e.preventDefault();
    const email = createUserForm['new-email'].value.trim();
    const password = createUserForm['new-password'].value;
    const role = createUserForm['new-role'].value;

    if (!email || !password) {
      showMessage('Email en wachtwoord zijn verplicht.', 'error');
      return;
    }

    try {
      // call backend to create user document
      const res = await fetch('/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role })
      });
      if (!res.ok) throw new Error('Maken gebruiker mislukt');

      const newUser = await res.json();
      users.push(newUser);
      renderUsers();
      createUserForm.reset();
      showMessage('Gebruiker succesvol aangemaakt', 'success');
    } catch(err) {
      showMessage(err.message, 'error');
    }
  });

  async function fetchUsers() {
    try {
      const res = await fetch('/users');
      if (!res.ok) throw new Error('Kon gebruikers niet laden');
      users = await res.json();
      renderUsers();
    } catch(err) {
      showMessage(err.message, 'error');
    }
  }

  function renderUsers() {
    usersTableBody.innerHTML = '';
    users.forEach(user => {
      const tr = document.createElement('tr');
      tr.innerHTML = \`
        <td>\${user.email}</td>
        <td>\${user.role || '-'}</td>
        <td><button class="action-btn" data-id="\${user._id}">Verwijderen</button></td>
      \`;
      usersTableBody.appendChild(tr);
    });
    usersTableBody.querySelectorAll('button.action-btn').forEach(btn => {
      btn.addEventListener('click', async e => {
        const id = e.target.dataset.id;
        if (!confirm('Weet je zeker dat je deze gebruiker wil verwijderen?')) return;
        try {
          const res = await fetch(\`/users/\${id}\`, { method: 'DELETE' });
          if (!res.ok) throw new Error('Verwijderen mislukt');
          users = users.filter(u => u._id !== id);
          renderUsers();
          showMessage('Gebruiker verwijderd', 'success');
        } catch(err) {
          showMessage(err.message, 'error');
        }
      });
    });
  }

  function fakeApiDelay() {
    return new Promise(resolve => setTimeout(resolve, 1200));
  }
</script>

</body>
</html>`;

// API routes voor dynamische collections CRUD
app.post('/:collection', async (req, res) => {
  try {
    const Model = getModel(req.params.collection);
    const doc = new Model(req.body);
    const saved = await doc.save();
    res.status(201).json(saved);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/:collection', async (req, res) => {
  try {
    const Model = getModel(req.params.collection);
    const docs = await Model.find({});
    res.json(docs);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/:collection/:id', async (req, res) => {
  try {
    const Model = getModel(req.params.collection);
    const doc = await Model.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Not found' });
    res.json(doc);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/:collection/:id', async (req, res) => {
  try {
    const Model = getModel(req.params.collection);
    const updated = await Model.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ error: 'Not found' });
    res.json(updated);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/:collection/:id', async (req, res) => {
  try {
    const Model = getModel(req.params.collection);
    const deleted = await Model.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Admin panel route (serve HTML)
app.get('/', (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(adminHtml);
});

// Connect met MongoDB en start server
const start = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected');
    app.listen(process.env.PORT || 3000, () => {
      console.log('Server draait op http://localhost:' + (process.env.PORT || 3000));
    });
  } catch (e) {
    console.error('Connectie mislukt:', e);
  }
};

start();
