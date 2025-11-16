import express from 'express';
import db from '../db/database.js';

const router = express.Router();

// Get all price alerts
router.get('/', (req, res) => {
  try {
    const { active_only = 'true' } = req.query;

    let query = `
      SELECT a.*, c.name, c.set_name, c.image_uri, c.prices
      FROM price_alerts a
      JOIN cards c ON a.card_id = c.id
    `;

    if (active_only === 'true') {
      query += ' WHERE a.active = 1';
    }

    query += ' ORDER BY a.created_at DESC';

    const alerts = db.prepare(query).all();

    const parsed = alerts.map(alert => ({
      ...alert,
      prices: JSON.parse(alert.prices || '{}'),
      active: alert.active === 1,
      triggered: alert.triggered === 1
    }));

    res.json(parsed);
  } catch (error) {
    console.error('Fetch alerts error:', error);
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

// Create price alert
router.post('/', (req, res) => {
  try {
    const { card_id, platform, target_price, condition = 'below' } = req.body;

    if (!card_id || !platform || !target_price) {
      return res.status(400).json({ error: 'card_id, platform, and target_price are required' });
    }

    // Check if card exists
    const card = db.prepare('SELECT id FROM cards WHERE id = ?').get(card_id);
    if (!card) {
      return res.status(404).json({ error: 'Card not found' });
    }

    const result = db.prepare(`
      INSERT INTO price_alerts (card_id, platform, target_price, condition, active)
      VALUES (?, ?, ?, ?, 1)
    `).run(card_id, platform, target_price, condition);

    res.json({ message: 'Price alert created', id: result.lastInsertRowid });
  } catch (error) {
    console.error('Create alert error:', error);
    res.status(500).json({ error: 'Failed to create alert' });
  }
});

// Update alert
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { target_price, condition, active } = req.body;

    const updates = [];
    const params = [];

    if (target_price !== undefined) {
      updates.push('target_price = ?');
      params.push(target_price);
    }
    if (condition) {
      updates.push('condition = ?');
      params.push(condition);
    }
    if (active !== undefined) {
      updates.push('active = ?');
      params.push(active ? 1 : 0);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    params.push(id);
    const query = `UPDATE price_alerts SET ${updates.join(', ')} WHERE id = ?`;
    const result = db.prepare(query).run(...params);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    res.json({ message: 'Alert updated' });
  } catch (error) {
    console.error('Update alert error:', error);
    res.status(500).json({ error: 'Failed to update alert' });
  }
});

// Delete alert
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const result = db.prepare('DELETE FROM price_alerts WHERE id = ?').run(id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    res.json({ message: 'Alert deleted' });
  } catch (error) {
    console.error('Delete alert error:', error);
    res.status(500).json({ error: 'Failed to delete alert' });
  }
});

// Check all alerts and return triggered ones
router.post('/check', (req, res) => {
  try {
    const alerts = db.prepare(`
      SELECT a.*, c.prices
      FROM price_alerts a
      JOIN cards c ON a.card_id = c.id
      WHERE a.active = 1 AND a.triggered = 0
    `).all();

    const triggered = [];

    alerts.forEach(alert => {
      const prices = JSON.parse(alert.prices || '{}');
      const platformKey = alert.platform.replace('scryfall_', '');
      const currentPrice = parseFloat(prices[platformKey]);

      if (!currentPrice) return;

      let shouldTrigger = false;

      if (alert.condition === 'below' && currentPrice <= alert.target_price) {
        shouldTrigger = true;
      } else if (alert.condition === 'above' && currentPrice >= alert.target_price) {
        shouldTrigger = true;
      }

      if (shouldTrigger) {
        // Mark as triggered
        db.prepare(`
          UPDATE price_alerts
          SET triggered = 1, triggered_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(alert.id);

        triggered.push({
          ...alert,
          current_price: currentPrice,
          prices: prices
        });
      }
    });

    res.json({
      checked: alerts.length,
      triggered: triggered.length,
      alerts: triggered
    });
  } catch (error) {
    console.error('Check alerts error:', error);
    res.status(500).json({ error: 'Failed to check alerts' });
  }
});

// Get triggered alerts
router.get('/triggered', (req, res) => {
  try {
    const triggered = db.prepare(`
      SELECT a.*, c.name, c.set_name, c.image_uri, c.prices
      FROM price_alerts a
      JOIN cards c ON a.card_id = c.id
      WHERE a.triggered = 1
      ORDER BY a.triggered_at DESC
    `).all();

    const parsed = triggered.map(alert => ({
      ...alert,
      prices: JSON.parse(alert.prices || '{}')
    }));

    res.json(parsed);
  } catch (error) {
    console.error('Get triggered alerts error:', error);
    res.status(500).json({ error: 'Failed to get triggered alerts' });
  }
});

export default router;
