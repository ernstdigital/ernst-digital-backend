const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const app = express();

app.use(cors({ origin: '*' }));
app.options('*', cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ status: 'Ernst Digital Backend läuft!' });
});

app.get('/search', async (req, res) => {
  const { branche, city, maxRating, maxResults } = req.query;
  const apiKey = process.env.PLACES_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API Key fehlt' });

  try {
    const queries = [
      `${branche} ${city}`,
      `${branche} ${city} Deutschland`
    ];

    let allResults = [];
    for (const query of queries) {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&language=de&region=de&key=${apiKey}`
      );
      const data = await response.json();
      if (data.status === 'OK' && data.results) {
        allResults = allResults.concat(data.results);
      }
    }

    const seen = new Set();
    allResults = allResults.filter(p => {
      if (seen.has(p.place_id)) return false;
      seen.add(p.place_id);
      return true;
    });

    allResults.sort((a, b) => (a.rating || 5) - (b.rating || 5));

    let filtered = allResults.filter(p =>
      p.rating && p.rating <= parseFloat(maxRating) && p.user_ratings_total >= 10
    );

    if (filtered.length === 0) {
      filtered = allResults.filter(p => p.rating && p.user_ratings_total >= 10);
    }

    filtered = filtered.slice(0, parseInt(maxResults) || 3).map(p => ({
      name: p.name,
      adresse: p.formatted_address,
      rating: p.rating,
      anzahl_bewertungen: p.user_ratings_total,
      branche: branche
    }));

    res.json(filtered);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/send-mail', async (req, res) => {
  const { to, subject, text } = req.body;

  if (!to || !text) return res.status(400).json({ error: 'Empfänger und Text fehlen' });

  const transporter = nodemailer.createTransport({
    host: 'smtp.ionos.de',
    port: 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  try {
    await transporter.sendMail({
      from: `Ernst Digital <${process.env.SMTP_USER}>`,
      to,
      subject: subject || 'Ihre Google-Bewertungen – Ernst Digital',
      text
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server läuft auf Port ${PORT}`));
