import express from 'express';
import fetch from 'node-fetch';

const app = express();
const port = 3000;

const html = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Roblox API Single File Demo</title>
<style>
  body { font-family: Arial, sans-serif; padding: 2rem; background: #f0f0f0; }
  button { margin: 0.5rem 0; padding: 0.5rem 1rem; cursor: pointer; border-radius: 5px; border: none; background: #007bff; color: white; }
  button:hover { background: #0056b3; }
  pre { background: #222; color: #eee; padding: 1rem; max-height: 400px; overflow-y: auto; border-radius: 5px; }
</style>
</head>
<body>
  <h1>Roblox API Demo</h1>
  <button id="btn-birthdate">Get Birthdate</button>
  <button id="btn-description">Get Description</button>
  <button id="btn-gender">Get Gender</button>
  <pre id="output">Click a button to fetch data from Roblox API</pre>

  <script>
    const output = document.getElementById('output');

    async function callApi(endpoint) {
      output.textContent = 'Loading...';
      try {
        const res = await fetch('/api/' + endpoint);
        if (!res.ok) throw new Error('HTTP status ' + res.status);
        const data = await res.json();
        output.textContent = JSON.stringify(data, null, 2);
      } catch (e) {
        output.textContent = 'Error: ' + e.message;
      }
    }

    document.getElementById('btn-birthdate').addEventListener('click', () => {
      callApi('birthdate');
    });

    document.getElementById('btn-description').addEventListener('click', () => {
      callApi('description');
    });

    document.getElementById('btn-gender').addEventListener('click', () => {
      callApi('gender');
    });
  </script>
</body>
</html>
`;

app.get('/', (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(html);
});

const ROBLOX_API_BASE = 'https://accountinformation.roblox.com/v1';

// Proxy endpoints to avoid CORS & hide direct URLs
app.get('/api/birthdate', async (req, res) => {
  try {
    const apiRes = await fetch(`${ROBLOX_API_BASE}/birthdate`);
    const data = await apiRes.json();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/description', async (req, res) => {
  try {
    const apiRes = await fetch(`${ROBLOX_API_BASE}/description`);
    const data = await apiRes.json();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/gender', async (req, res) => {
  try {
    const apiRes = await fetch(`${ROBLOX_API_BASE}/gender`);
    const data = await apiRes.json();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
