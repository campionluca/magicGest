import express from 'express';
import db from '../db/database.js';

const router = express.Router();

// Export collection as JSON
router.get('/export/collection', (req, res) => {
  try {
    const collection = db.prepare(`
      SELECT c.*, col.quantity, col.condition, col.foil, col.language, col.notes
      FROM collection col
      JOIN cards c ON col.card_id = c.id
    `).all();

    const exportData = collection.map(card => ({
      name: card.name,
      set_code: card.set_code,
      set_name: card.set_name,
      collector_number: card.collector_number,
      quantity: card.quantity,
      condition: card.condition,
      foil: card.foil === 1,
      language: card.language,
      notes: card.notes,
      scryfall_id: card.id
    }));

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename=magicgest-collection.json');
    res.json(exportData);
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Failed to export collection' });
  }
});

// Export collection as CSV
router.get('/export/collection/csv', (req, res) => {
  try {
    const collection = db.prepare(`
      SELECT c.name, c.set_code, c.set_name, c.collector_number,
             col.quantity, col.condition, col.foil, col.language
      FROM collection col
      JOIN cards c ON col.card_id = c.id
    `).all();

    const csvHeaders = 'Name,Set Code,Set Name,Collector Number,Quantity,Condition,Foil,Language\n';
    const csvRows = collection.map(card =>
      `"${card.name}","${card.set_code}","${card.set_name}","${card.collector_number}",${card.quantity},"${card.condition}",${card.foil === 1 ? 'Yes' : 'No'},"${card.language}"`
    ).join('\n');

    const csv = csvHeaders + csvRows;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=magicgest-collection.csv');
    res.send(csv);
  } catch (error) {
    console.error('Export CSV error:', error);
    res.status(500).json({ error: 'Failed to export collection as CSV' });
  }
});

// Export deck as text (MTGO format)
router.get('/export/deck/:deckId', (req, res) => {
  try {
    const { deckId } = req.params;

    const deck = db.prepare('SELECT * FROM decks WHERE id = ?').get(deckId);
    if (!deck) {
      return res.status(404).json({ error: 'Deck not found' });
    }

    const cards = db.prepare(`
      SELECT c.name, dc.quantity, dc.category
      FROM deck_cards dc
      JOIN cards c ON dc.card_id = c.id
      WHERE dc.deck_id = ?
      ORDER BY dc.category, c.cmc, c.name
    `).all(deckId);

    let deckText = `// ${deck.name}\n`;
    if (deck.format) deckText += `// Format: ${deck.format}\n`;
    deckText += '\n';

    // Mainboard
    const mainboard = cards.filter(c => c.category === 'mainboard');
    if (mainboard.length > 0) {
      mainboard.forEach(card => {
        deckText += `${card.quantity} ${card.name}\n`;
      });
    }

    // Sideboard
    const sideboard = cards.filter(c => c.category === 'sideboard');
    if (sideboard.length > 0) {
      deckText += '\nSideboard\n';
      sideboard.forEach(card => {
        deckText += `${card.quantity} ${card.name}\n`;
      });
    }

    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', `attachment; filename=${deck.name.replace(/[^a-z0-9]/gi, '_')}.txt`);
    res.send(deckText);
  } catch (error) {
    console.error('Export deck error:', error);
    res.status(500).json({ error: 'Failed to export deck' });
  }
});

export default router;
