import express from 'express';
import axios from 'axios';
import db from '../db/database.js';

const router = express.Router();

// Available price platforms
const PLATFORMS = {
  scryfall_usd: { name: 'Scryfall USD', key: 'usd' },
  scryfall_usd_foil: { name: 'Scryfall USD Foil', key: 'usd_foil' },
  scryfall_eur: { name: 'Scryfall EUR', key: 'eur' },
  scryfall_eur_foil: { name: 'Scryfall EUR Foil', key: 'eur_foil' },
  tcgplayer: { name: 'TCGPlayer', key: 'usd' },
  cardmarket: { name: 'Cardmarket', key: 'eur' }
};

// Get available platforms
router.get('/platforms', (req, res) => {
  res.json(Object.entries(PLATFORMS).map(([id, info]) => ({ id, ...info })));
});

// Get current price for a card
router.get('/card/:cardId', async (req, res) => {
  try {
    const { cardId } = req.params;
    const { platform = 'scryfall_usd' } = req.query;

    // Get card from cache
    const card = db.prepare('SELECT * FROM cards WHERE id = ?').get(cardId);

    if (!card) {
      return res.status(404).json({ error: 'Card not found' });
    }

    const prices = JSON.parse(card.prices || '{}');
    const platformInfo = PLATFORMS[platform];

    if (!platformInfo) {
      return res.status(400).json({ error: 'Invalid platform' });
    }

    const price = prices[platformInfo.key];

    res.json({
      card_id: cardId,
      card_name: card.name,
      platform,
      price: price ? parseFloat(price) : null,
      currency: platformInfo.key.includes('eur') ? 'EUR' : 'USD',
      last_updated: card.created_at
    });
  } catch (error) {
    console.error('Get price error:', error);
    res.status(500).json({ error: 'Failed to get price' });
  }
});

// Record price history
router.post('/record/:cardId', async (req, res) => {
  try {
    const { cardId } = req.params;
    const { platform = 'scryfall_usd', force = false } = req.body;

    // Get latest price from card cache
    const card = db.prepare('SELECT * FROM cards WHERE id = ?').get(cardId);

    if (!card) {
      return res.status(404).json({ error: 'Card not found in cache' });
    }

    const prices = JSON.parse(card.prices || '{}');
    const platformInfo = PLATFORMS[platform];

    if (!platformInfo) {
      return res.status(400).json({ error: 'Invalid platform' });
    }

    const price = prices[platformInfo.key];

    if (!price) {
      return res.status(404).json({ error: 'No price available for this platform' });
    }

    const currency = platformInfo.key.includes('eur') ? 'EUR' : 'USD';

    // Check if we already recorded this price today
    const today = new Date().toISOString().split('T')[0];
    const existing = db.prepare(`
      SELECT id FROM price_history
      WHERE card_id = ? AND platform = ? AND DATE(recorded_at) = ?
    `).get(cardId, platform, today);

    if (existing && !force) {
      return res.json({ message: 'Price already recorded today', skipped: true });
    }

    // Insert price record
    db.prepare(`
      INSERT INTO price_history (card_id, platform, price, currency)
      VALUES (?, ?, ?, ?)
    `).run(cardId, platform, parseFloat(price), currency);

    res.json({ message: 'Price recorded successfully', price: parseFloat(price), currency });
  } catch (error) {
    console.error('Record price error:', error);
    res.status(500).json({ error: 'Failed to record price' });
  }
});

// Get price history for a card
router.get('/history/:cardId', (req, res) => {
  try {
    const { cardId } = req.params;
    const { platform = 'scryfall_usd', days = 30 } = req.query;

    const history = db.prepare(`
      SELECT * FROM price_history
      WHERE card_id = ? AND platform = ?
        AND recorded_at >= datetime('now', '-' || ? || ' days')
      ORDER BY recorded_at ASC
    `).all(cardId, platform, days);

    // Get card info
    const card = db.prepare('SELECT name, set_name FROM cards WHERE id = ?').get(cardId);

    res.json({
      card: card || null,
      platform,
      history: history.map(h => ({
        price: h.price,
        currency: h.currency,
        date: h.recorded_at
      }))
    });
  } catch (error) {
    console.error('Get price history error:', error);
    res.status(500).json({ error: 'Failed to get price history' });
  }
});

// Bulk record prices for collection
router.post('/record-collection', async (req, res) => {
  try {
    const { platform = 'scryfall_usd' } = req.body;

    // Get all unique cards in collection
    const collectionCards = db.prepare(`
      SELECT DISTINCT c.id, c.prices
      FROM collection col
      JOIN cards c ON col.card_id = c.id
    `).all();

    let recorded = 0;
    let skipped = 0;
    let failed = 0;

    const platformInfo = PLATFORMS[platform];
    if (!platformInfo) {
      return res.status(400).json({ error: 'Invalid platform' });
    }

    const currency = platformInfo.key.includes('eur') ? 'EUR' : 'USD';
    const today = new Date().toISOString().split('T')[0];

    for (const card of collectionCards) {
      try {
        // Check if already recorded today
        const existing = db.prepare(`
          SELECT id FROM price_history
          WHERE card_id = ? AND platform = ? AND DATE(recorded_at) = ?
        `).get(card.id, platform, today);

        if (existing) {
          skipped++;
          continue;
        }

        const prices = JSON.parse(card.prices || '{}');
        const price = prices[platformInfo.key];

        if (!price) {
          skipped++;
          continue;
        }

        db.prepare(`
          INSERT INTO price_history (card_id, platform, price, currency)
          VALUES (?, ?, ?, ?)
        `).run(card.id, platform, parseFloat(price), currency);

        recorded++;
      } catch (error) {
        console.error(`Failed to record price for card ${card.id}:`, error);
        failed++;
      }
    }

    res.json({
      message: 'Bulk price recording completed',
      recorded,
      skipped,
      failed,
      total: collectionCards.length
    });
  } catch (error) {
    console.error('Bulk record prices error:', error);
    res.status(500).json({ error: 'Failed to record prices' });
  }
});

// Get price trends (top gainers/losers)
router.get('/trends', (req, res) => {
  try {
    const { platform = 'scryfall_usd', days = 7, limit = 10 } = req.query;

    const trends = db.prepare(`
      WITH recent_prices AS (
        SELECT
          card_id,
          price,
          recorded_at,
          ROW_NUMBER() OVER (PARTITION BY card_id ORDER BY recorded_at DESC) as rn_desc,
          ROW_NUMBER() OVER (PARTITION BY card_id ORDER BY recorded_at ASC) as rn_asc
        FROM price_history
        WHERE platform = ? AND recorded_at >= datetime('now', '-' || ? || ' days')
      ),
      price_changes AS (
        SELECT
          new.card_id,
          old.price as old_price,
          new.price as new_price,
          ((new.price - old.price) / old.price * 100) as percent_change
        FROM recent_prices new
        JOIN recent_prices old ON new.card_id = old.card_id
        WHERE new.rn_desc = 1 AND old.rn_asc = 1 AND old.price > 0
      )
      SELECT
        pc.*,
        c.name,
        c.set_name,
        c.image_uri
      FROM price_changes pc
      JOIN cards c ON pc.card_id = c.id
      ORDER BY ABS(pc.percent_change) DESC
      LIMIT ?
    `).all(platform, days, limit);

    const gainers = trends.filter(t => t.percent_change > 0).slice(0, Math.floor(limit / 2));
    const losers = trends.filter(t => t.percent_change < 0).slice(0, Math.floor(limit / 2));

    res.json({ gainers, losers });
  } catch (error) {
    console.error('Get trends error:', error);
    res.status(500).json({ error: 'Failed to get price trends' });
  }
});

export default router;
