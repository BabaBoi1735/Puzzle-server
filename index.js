import express from 'express';
import fetch from 'node-fetch';

const app = express();
const port = 3000;

const CLIENT_ID = '6337326817362425692';
const CLIENT_SECRET = 'RBX-PJRRoHEmAkyvtO9BAsosL1WbY2IqTTxCtt07BRzvNquH1nymvZbpB682VYzDzOwI';

// Dit moet je aanpassen naar jouw Roblox universe en datastore
const UNIVERSE_ID = '8122261455';       // vervang door je eigen universe id
const DATA_STORE_ID = 'PlayerLevels'; // vervang door jouw datastore naam

// Middleware om JSON body te parsen
app.use(express.json());

// Frontend HTML + JS
const html = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Roblox Data Store Demo</title>
<style>
  body { font-family: Arial, sans-serif; padding: 2rem; background: #f0f0f0; }
  input, button { padding: 0.5rem; font-size: 1rem; margin: 0.5rem 0; }
  button { cursor: pointer; border-radius: 5px; border: none; background: #007bff; color: white; }
  button:hover { background: #0056b3; }
  pre { background: #222; color: #eee; padding: 1rem; max-height: 400px; overflow-y: auto; border-radius: 5px; }
</style>
</head>
<body>
  <h1>Roblox Data Store Viewer</h1>
  <label for="userid">Enter UserId or Username:</label><br />
  <input type="text" id="userid" placeholder="UserId or Username" />
  <button id="fetchBtn">Fetch Data Store Entries</button>
  <pre id="output">Enter a UserId or Username and click the button</pre>

  <script>
    const output = document.getElementById('output');
    const input = document.getElementById('userid');
    const btn = document.getElementById('fetchBtn');

    btn.addEventListener('click', async () => {
      const userId = input.value.trim();
      if (!userId) {
        output.textContent = 'Please enter a UserId or Username.';
        return;
      }
      output.textContent = 'Loading...';

      try {
        const res = await fetch('/api/datastore-entries', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId })
        });
        if (!res.ok) throw new Error('HTTP error ' + res.status);
        const data = await res.json();
        output.textContent = JSON.stringify(data, null, 2);
      } catch (e) {
        output.textContent = 'Error: ' + e.message;
      }
    });
  </script>
</body>
</html>
`;

app.get('/', (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(html);
});

// Functie om OAuth token te krijgen
async function getAccessToken() {
  const tokenUrl = 'https://apis.roblox.com/oauth/token';
  const authHeader = 'Basic ' + Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');

  const params = new URLSearchParams();
  params.append('grant_type', 'client_credentials');
  params.append('scope', 'data_store.read data_store.write');

  const res = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Authorization': authHeader,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: params.toString()
  });

  if (!res.ok) throw new Error(`Failed to get token: ${res.status}`);

  const data = await res.json();
  return data.access_token;
}

// API endpoint: haal data store entries op voor gegeven userId
app.post('/api/datastore-entries', async (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'Missing userId in body' });
  }

  try {
    const token = await getAccessToken();

    // Voorbeeld: data store entry key = userId (of username)
    // Pas dit aan aan jouw datamodel!
    const entryId = encodeURIComponent(userId);

    const url = `https://apis.roblox.com/cloud/v2/universes/${UNIVERSE_ID}/data-stores/${DATA_STORE_ID}/entries/${entryId}`;

    const apiRes = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (apiRes.status === 404) {
      return res.status(404).json({ error: 'Entry not found for user: ' + userId });
    }
    if (!apiRes.ok) {
      const text = await apiRes.text();
      throw new Error(`Roblox API error: ${apiRes.status} - ${text}`);
    }

    const data = await apiRes.json();
    res.json(data);

  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
