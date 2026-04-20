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
    // Mehrere Suchanfragen um mehr Ergebnisse zu bekommen
    const queries = [
      `${branche} ${city}`,
      `${branche} Bewertung schlecht ${city}`,
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

    // Duplikate entfernen
    const seen = new Set();
    allResults = allResults.filter(p => {
      if (seen.has(p.place_id)) return false;
      seen.add(p.place_id);
      return true;
    });

    console.log('Alle Ergebnisse:', allResults.length);
    console.log('Ratings:', allResults.map(p => p.rating).join(', '));

    // Nach Rating sortieren (schlechteste zuerst)
    allResults.sort((a, b) => (a.rating || 5) - (b.rating || 5));

    // Filter anwenden - wenn keine Ergebnisse unter maxRating, dann alle zurückgeben
    let filtered = allResults.filter(p => 
      p.rating && p.rating <= parseFloat(maxRating) && p.user_ratings_total >= 10
    );

    // Falls nichts gefunden, nimm die schlechtesten verfügbaren
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

    console.log('Gefilterte Ergebnisse:', filtered.length);
    res.json(filtered);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server läuft auf Port ${PORT}`));
