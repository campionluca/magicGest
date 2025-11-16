import express from 'express';
import db from '../db/database.js';

const router = express.Router();

// Get all decks
router.get('/', (req, res) => {
  try {
    const decks = db.prepare(`
      SELECT d.*,
             COUNT(dc.id) as card_count,
             SUM(dc.quantity) as total_cards
      FROM decks d
      LEFT JOIN deck_cards dc ON d.id = dc.deck_id
      GROUP BY d.id
      ORDER BY d.updated_at DESC
    `).all();

    res.json(decks);
  } catch (error) {
    console.error('Fetch decks error:', error);
    res.status(500).json({ error: 'Failed to fetch decks' });
  }
});

// Get single deck with cards
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;

    const deck = db.prepare('SELECT * FROM decks WHERE id = ?').get(id);

    if (!deck) {
      return res.status(404).json({ error: 'Deck not found' });
    }

    const cards = db.prepare(`
      SELECT c.*, dc.quantity, dc.category, dc.id as deck_card_id
      FROM deck_cards dc
      JOIN cards c ON dc.card_id = c.id
      WHERE dc.deck_id = ?
      ORDER BY dc.category, c.cmc, c.name
    `).all(id);

    // Parse JSON fields
    const parsedCards = cards.map(card => ({
      ...card,
      colors: JSON.parse(card.colors || '[]'),
      prices: JSON.parse(card.prices || '{}')
    }));

    // Calculate deck value
    const deckValue = db.prepare(`
      SELECT SUM(dc.quantity * CAST(json_extract(c.prices, '$.usd') AS REAL)) as value
      FROM deck_cards dc
      JOIN cards c ON dc.card_id = c.id
      WHERE dc.deck_id = ? AND json_extract(c.prices, '$.usd') IS NOT NULL
    `).get(id);

    res.json({
      ...deck,
      cards: parsedCards,
      value: deckValue.value || 0
    });
  } catch (error) {
    console.error('Fetch deck error:', error);
    res.status(500).json({ error: 'Failed to fetch deck' });
  }
});

// Create new deck
router.post('/', (req, res) => {
  try {
    const { name, format = '', description = '', color_identity = '' } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Deck name is required' });
    }

    const result = db.prepare(`
      INSERT INTO decks (name, format, description, color_identity)
      VALUES (?, ?, ?, ?)
    `).run(name, format, description, color_identity);

    res.json({ message: 'Deck created', id: result.lastInsertRowid });
  } catch (error) {
    console.error('Create deck error:', error);
    res.status(500).json({ error: 'Failed to create deck' });
  }
});

// Update deck
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, format, description, color_identity } = req.body;

    const updates = [];
    const params = [];

    if (name) {
      updates.push('name = ?');
      params.push(name);
    }
    if (format !== undefined) {
      updates.push('format = ?');
      params.push(format);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      params.push(description);
    }
    if (color_identity !== undefined) {
      updates.push('color_identity = ?');
      params.push(color_identity);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(id);

    const query = `UPDATE decks SET ${updates.join(', ')} WHERE id = ?`;
    const result = db.prepare(query).run(...params);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Deck not found' });
    }

    res.json({ message: 'Deck updated successfully' });
  } catch (error) {
    console.error('Update deck error:', error);
    res.status(500).json({ error: 'Failed to update deck' });
  }
});

// Delete deck
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;

    const result = db.prepare('DELETE FROM decks WHERE id = ?').run(id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Deck not found' });
    }

    res.json({ message: 'Deck deleted successfully' });
  } catch (error) {
    console.error('Delete deck error:', error);
    res.status(500).json({ error: 'Failed to delete deck' });
  }
});

// Add card to deck
router.post('/:id/cards', (req, res) => {
  try {
    const { id } = req.params;
    const { card_id, quantity = 1, category = 'mainboard' } = req.body;

    if (!card_id) {
      return res.status(400).json({ error: 'card_id is required' });
    }

    // Check if deck exists
    const deck = db.prepare('SELECT id FROM decks WHERE id = ?').get(id);
    if (!deck) {
      return res.status(404).json({ error: 'Deck not found' });
    }

    // Check if card already in deck
    const existing = db.prepare(`
      SELECT id, quantity FROM deck_cards
      WHERE deck_id = ? AND card_id = ? AND category = ?
    `).get(id, card_id, category);

    if (existing) {
      const newQuantity = existing.quantity + quantity;
      db.prepare('UPDATE deck_cards SET quantity = ? WHERE id = ?').run(newQuantity, existing.id);
      res.json({ message: 'Card quantity updated', quantity: newQuantity });
    } else {
      const result = db.prepare(`
        INSERT INTO deck_cards (deck_id, card_id, quantity, category)
        VALUES (?, ?, ?, ?)
      `).run(id, card_id, quantity, category);

      res.json({ message: 'Card added to deck', id: result.lastInsertRowid });
    }

    // Update deck timestamp
    db.prepare('UPDATE decks SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(id);
  } catch (error) {
    console.error('Add card to deck error:', error);
    res.status(500).json({ error: 'Failed to add card to deck' });
  }
});

// Remove card from deck
router.delete('/:deckId/cards/:cardId', (req, res) => {
  try {
    const { deckId, cardId } = req.params;

    const result = db.prepare('DELETE FROM deck_cards WHERE id = ?').run(cardId);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Card not found in deck' });
    }

    // Update deck timestamp
    db.prepare('UPDATE decks SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(deckId);

    res.json({ message: 'Card removed from deck' });
  } catch (error) {
    console.error('Remove card from deck error:', error);
    res.status(500).json({ error: 'Failed to remove card from deck' });
  }
});

// Update card quantity in deck
router.put('/:deckId/cards/:cardId', (req, res) => {
  try {
    const { deckId, cardId } = req.params;
    const { quantity, category } = req.body;

    const updates = [];
    const params = [];

    if (quantity !== undefined) {
      updates.push('quantity = ?');
      params.push(quantity);
    }
    if (category) {
      updates.push('category = ?');
      params.push(category);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    params.push(cardId);
    const query = `UPDATE deck_cards SET ${updates.join(', ')} WHERE id = ?`;
    const result = db.prepare(query).run(...params);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Card not found in deck' });
    }

    // Update deck timestamp
    db.prepare('UPDATE decks SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(deckId);

    res.json({ message: 'Card updated successfully' });
  } catch (error) {
    console.error('Update deck card error:', error);
    res.status(500).json({ error: 'Failed to update card' });
  }
});

export default router;
