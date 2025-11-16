import express from 'express';
import axios from 'axios';
import db from '../db/database.js';

const router = express.Router();

// Scryfall API base URL
const SCRYFALL_API = 'https://api.scryfall.com';

// Search cards from Scryfall
router.get('/search', async (req, res) => {
  try {
    const { q, page = 1 } = req.query;

    if (!q) {
      return res.status(400).json({ error: 'Query parameter required' });
    }

    const response = await axios.get(`${SCRYFALL_API}/cards/search`, {
      params: { q, page }
    });

    // Cache cards in local database
    const cards = response.data.data;
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO cards
      (id, name, set_code, set_name, collector_number, rarity,
       image_uri, mana_cost, type_line, oracle_text, colors, cmc, prices, scryfall_uri)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const card of cards) {
      stmt.run(
        card.id,
        card.name,
        card.set,
        card.set_name,
        card.collector_number,
        card.rarity,
        card.image_uris?.normal || card.image_uris?.small || null,
        card.mana_cost || null,
        card.type_line,
        card.oracle_text || null,
        JSON.stringify(card.colors || []),
        card.cmc || 0,
        JSON.stringify(card.prices || {}),
        card.scryfall_uri
      );
    }

    res.json({
      cards,
      has_more: response.data.has_more,
      total_cards: response.data.total_cards
    });
  } catch (error) {
    console.error('Scryfall API error:', error.message);
    res.status(500).json({ error: 'Failed to search cards', details: error.message });
  }
});

// Get card by ID (Scryfall)
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check local cache first
    const cached = db.prepare('SELECT * FROM cards WHERE id = ?').get(id);

    if (cached) {
      return res.json({
        ...cached,
        colors: JSON.parse(cached.colors || '[]'),
        prices: JSON.parse(cached.prices || '{}')
      });
    }

    // Fetch from Scryfall if not cached
    const response = await axios.get(`${SCRYFALL_API}/cards/${id}`);
    const card = response.data;

    // Cache it
    db.prepare(`
      INSERT OR REPLACE INTO cards
      (id, name, set_code, set_name, collector_number, rarity,
       image_uri, mana_cost, type_line, oracle_text, colors, cmc, prices, scryfall_uri)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      card.id,
      card.name,
      card.set,
      card.set_name,
      card.collector_number,
      card.rarity,
      card.image_uris?.normal || card.image_uris?.small || null,
      card.mana_cost || null,
      card.type_line,
      card.oracle_text || null,
      JSON.stringify(card.colors || []),
      card.cmc || 0,
      JSON.stringify(card.prices || {}),
      card.scryfall_uri
    );

    res.json(card);
  } catch (error) {
    console.error('Card fetch error:', error.message);
    res.status(500).json({ error: 'Failed to fetch card', details: error.message });
  }
});

// Get random card
router.get('/random/card', async (req, res) => {
  try {
    const response = await axios.get(`${SCRYFALL_API}/cards/random`);
    res.json(response.data);
  } catch (error) {
    console.error('Random card error:', error.message);
    res.status(500).json({ error: 'Failed to get random card' });
  }
});

export default router;
