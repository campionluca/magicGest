import express from 'express';
import db from '../db/database.js';

const router = express.Router();

// Get all cards in collection
router.get('/', (req, res) => {
  try {
    const { sortBy = 'added_at', order = 'DESC', filter } = req.query;

    let query = `
      SELECT c.*, col.id as collection_id, col.quantity, col.condition,
             col.foil, col.language, col.notes, col.added_at
      FROM collection col
      JOIN cards c ON col.card_id = c.id
    `;

    const params = [];

    if (filter) {
      query += ` WHERE c.name LIKE ? OR c.set_name LIKE ?`;
      params.push(`%${filter}%`, `%${filter}%`);
    }

    query += ` ORDER BY col.${sortBy} ${order}`;

    const cards = db.prepare(query).all(...params);

    // Parse JSON fields
    const parsedCards = cards.map(card => ({
      ...card,
      colors: JSON.parse(card.colors || '[]'),
      prices: JSON.parse(card.prices || '{}')
    }));

    res.json(parsedCards);
  } catch (error) {
    console.error('Collection fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch collection' });
  }
});

// Add card to collection
router.post('/', (req, res) => {
  try {
    const { card_id, quantity = 1, condition = 'NM', foil = false, language = 'en', notes = '' } = req.body;

    if (!card_id) {
      return res.status(400).json({ error: 'card_id is required' });
    }

    // Check if card exists in cards table
    const card = db.prepare('SELECT id FROM cards WHERE id = ?').get(card_id);

    if (!card) {
      return res.status(404).json({ error: 'Card not found in database. Search for it first.' });
    }

    // Check if already in collection
    const existing = db.prepare('SELECT id, quantity FROM collection WHERE card_id = ? AND condition = ? AND foil = ?')
      .get(card_id, condition, foil ? 1 : 0);

    if (existing) {
      // Update quantity
      const newQuantity = existing.quantity + quantity;
      db.prepare('UPDATE collection SET quantity = ? WHERE id = ?').run(newQuantity, existing.id);

      res.json({ message: 'Card quantity updated', id: existing.id, quantity: newQuantity });
    } else {
      // Insert new
      const result = db.prepare(`
        INSERT INTO collection (card_id, quantity, condition, foil, language, notes)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(card_id, quantity, condition, foil ? 1 : 0, language, notes);

      res.json({ message: 'Card added to collection', id: result.lastInsertRowid });
    }
  } catch (error) {
    console.error('Add to collection error:', error);
    res.status(500).json({ error: 'Failed to add card to collection' });
  }
});

// Update card in collection
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { quantity, condition, foil, language, notes } = req.body;

    const updates = [];
    const params = [];

    if (quantity !== undefined) {
      updates.push('quantity = ?');
      params.push(quantity);
    }
    if (condition) {
      updates.push('condition = ?');
      params.push(condition);
    }
    if (foil !== undefined) {
      updates.push('foil = ?');
      params.push(foil ? 1 : 0);
    }
    if (language) {
      updates.push('language = ?');
      params.push(language);
    }
    if (notes !== undefined) {
      updates.push('notes = ?');
      params.push(notes);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    params.push(id);
    const query = `UPDATE collection SET ${updates.join(', ')} WHERE id = ?`;

    const result = db.prepare(query).run(...params);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Card not found in collection' });
    }

    res.json({ message: 'Card updated successfully' });
  } catch (error) {
    console.error('Update collection error:', error);
    res.status(500).json({ error: 'Failed to update card' });
  }
});

// Remove card from collection
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;

    const result = db.prepare('DELETE FROM collection WHERE id = ?').run(id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Card not found in collection' });
    }

    res.json({ message: 'Card removed from collection' });
  } catch (error) {
    console.error('Delete from collection error:', error);
    res.status(500).json({ error: 'Failed to remove card' });
  }
});

// Get collection statistics
router.get('/stats', (req, res) => {
  try {
    const totalCards = db.prepare('SELECT SUM(quantity) as total FROM collection').get();
    const uniqueCards = db.prepare('SELECT COUNT(*) as count FROM collection').get();
    const totalValue = db.prepare(`
      SELECT SUM(col.quantity * CAST(json_extract(c.prices, '$.usd') AS REAL)) as value
      FROM collection col
      JOIN cards c ON col.card_id = c.id
      WHERE json_extract(c.prices, '$.usd') IS NOT NULL
    `).get();

    const byRarity = db.prepare(`
      SELECT c.rarity, SUM(col.quantity) as count
      FROM collection col
      JOIN cards c ON col.card_id = c.id
      GROUP BY c.rarity
    `).all();

    const bySet = db.prepare(`
      SELECT c.set_name, c.set_code, SUM(col.quantity) as count
      FROM collection col
      JOIN cards c ON col.card_id = c.id
      GROUP BY c.set_code
      ORDER BY count DESC
      LIMIT 10
    `).all();

    res.json({
      total_cards: totalCards.total || 0,
      unique_cards: uniqueCards.count || 0,
      total_value: totalValue.value || 0,
      by_rarity: byRarity,
      top_sets: bySet
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: 'Failed to get statistics' });
  }
});

export default router;
