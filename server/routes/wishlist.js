import express from 'express';
import db from '../db/database.js';

const router = express.Router();

// Get all wishlist items
router.get('/', (req, res) => {
  try {
    const wishlist = db.prepare(`
      SELECT w.*, c.name, c.set_name, c.image_uri, c.prices, c.rarity
      FROM wishlist w
      JOIN cards c ON w.card_id = c.id
      ORDER BY
        CASE w.priority
          WHEN 'high' THEN 1
          WHEN 'medium' THEN 2
          WHEN 'low' THEN 3
        END,
        w.added_at DESC
    `).all();

    const parsed = wishlist.map(item => ({
      ...item,
      prices: JSON.parse(item.prices || '{}')
    }));

    res.json(parsed);
  } catch (error) {
    console.error('Fetch wishlist error:', error);
    res.status(500).json({ error: 'Failed to fetch wishlist' });
  }
});

// Add card to wishlist
router.post('/', (req, res) => {
  try {
    const { card_id, quantity = 1, max_price, priority = 'medium', notes = '' } = req.body;

    if (!card_id) {
      return res.status(400).json({ error: 'card_id is required' });
    }

    // Check if card exists
    const card = db.prepare('SELECT id FROM cards WHERE id = ?').get(card_id);
    if (!card) {
      return res.status(404).json({ error: 'Card not found' });
    }

    // Check if already in wishlist
    const existing = db.prepare('SELECT id FROM wishlist WHERE card_id = ?').get(card_id);
    if (existing) {
      return res.status(400).json({ error: 'Card already in wishlist' });
    }

    const result = db.prepare(`
      INSERT INTO wishlist (card_id, quantity, max_price, priority, notes)
      VALUES (?, ?, ?, ?, ?)
    `).run(card_id, quantity, max_price || null, priority, notes);

    res.json({ message: 'Card added to wishlist', id: result.lastInsertRowid });
  } catch (error) {
    console.error('Add to wishlist error:', error);
    res.status(500).json({ error: 'Failed to add to wishlist' });
  }
});

// Update wishlist item
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { quantity, max_price, priority, notes } = req.body;

    const updates = [];
    const params = [];

    if (quantity !== undefined) {
      updates.push('quantity = ?');
      params.push(quantity);
    }
    if (max_price !== undefined) {
      updates.push('max_price = ?');
      params.push(max_price);
    }
    if (priority) {
      updates.push('priority = ?');
      params.push(priority);
    }
    if (notes !== undefined) {
      updates.push('notes = ?');
      params.push(notes);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    params.push(id);
    const query = `UPDATE wishlist SET ${updates.join(', ')} WHERE id = ?`;
    const result = db.prepare(query).run(...params);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    res.json({ message: 'Wishlist item updated' });
  } catch (error) {
    console.error('Update wishlist error:', error);
    res.status(500).json({ error: 'Failed to update wishlist item' });
  }
});

// Remove from wishlist
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const result = db.prepare('DELETE FROM wishlist WHERE id = ?').run(id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    res.json({ message: 'Item removed from wishlist' });
  } catch (error) {
    console.error('Delete wishlist error:', error);
    res.status(500).json({ error: 'Failed to remove from wishlist' });
  }
});

// Get affordable wishlist items
router.get('/affordable', (req, res) => {
  try {
    const { platform = 'scryfall_usd' } = req.query;

    const wishlist = db.prepare(`
      SELECT w.*, c.name, c.set_name, c.image_uri, c.prices, c.rarity
      FROM wishlist w
      JOIN cards c ON w.card_id = c.id
      WHERE w.max_price IS NOT NULL
    `).all();

    const platformKey = platform.includes('eur') ? 'eur' : 'usd';

    const affordable = wishlist.filter(item => {
      const prices = JSON.parse(item.prices || '{}');
      const currentPrice = parseFloat(prices[platformKey]);
      return currentPrice && currentPrice <= item.max_price;
    }).map(item => ({
      ...item,
      prices: JSON.parse(item.prices || '{}'),
      current_price: parseFloat(JSON.parse(item.prices || '{}')[platformKey])
    }));

    res.json(affordable);
  } catch (error) {
    console.error('Affordable wishlist error:', error);
    res.status(500).json({ error: 'Failed to get affordable items' });
  }
});

// Get wishlist statistics
router.get('/stats', (req, res) => {
  try {
    const { platform = 'scryfall_usd' } = req.query;
    const platformKey = platform.includes('eur') ? 'eur' : 'usd';

    const wishlist = db.prepare(`
      SELECT w.*, c.prices
      FROM wishlist w
      JOIN cards c ON w.card_id = c.id
    `).all();

    let totalValue = 0;
    let totalAffordable = 0;
    let affordableCount = 0;

    wishlist.forEach(item => {
      const prices = JSON.parse(item.prices || '{}');
      const price = parseFloat(prices[platformKey]) || 0;
      const itemTotal = price * item.quantity;
      totalValue += itemTotal;

      if (item.max_price && price <= item.max_price) {
        totalAffordable += itemTotal;
        affordableCount++;
      }
    });

    const byPriority = db.prepare(`
      SELECT priority, COUNT(*) as count
      FROM wishlist
      GROUP BY priority
    `).all();

    res.json({
      total_items: wishlist.length,
      total_value: totalValue,
      affordable_value: totalAffordable,
      affordable_count: affordableCount,
      by_priority: byPriority
    });
  } catch (error) {
    console.error('Wishlist stats error:', error);
    res.status(500).json({ error: 'Failed to get wishlist stats' });
  }
});

export default router;
