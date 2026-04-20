const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.options('*', cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ status: 'Ernst Digital Backend läuft!' });
});

app.get('/search', async (req, res) => {
  const { branche, city, maxRating, maxResults } = req.query;
  const apiKey = process.env.PLACES_API_KEY;

  if (!apiKey) return res.status(500).json({ error: 'API Key fehlt' });

  const query = `${branche} in ${city} Deutschland`;
  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&language=de&key=${apiKey}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    const filtered = (data.results || [])
      .filter(p => p.rating && p.rating <= parseFloat(maxRating) && p.user_ratings_total >= 10)
      .slice(0, parseInt(maxResults) || 3)
      .map(p => ({
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server läuft auf Port ${PORT}`));
