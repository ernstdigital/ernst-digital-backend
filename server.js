const express = require('express');
const cors = require('cors');
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
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(branche + ' ' + city)}&language=de&region=de&key=${apiKey}`
    );
    const data = await response.json();

    console.log('Places API Status:', data.status);
    console.log('Ergebnisse gesamt:', data.results?.length);

    if (data.status !== 'OK') {
      return res.status(500).json({ error: 'Places API Fehler: ' + data.status, details: data.error_message });
    }

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

    console.log('Gefilterte Ergebnisse:', filtered.length);
    res.json(filtered);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server läuft auf Port ${PORT}`));
