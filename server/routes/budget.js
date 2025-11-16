import express from 'express';
import db from '../db/database.js';

const router = express.Router();

// Get all budget transactions
router.get('/transactions', (req, res) => {
  try {
    const { type, limit = 50 } = req.query;

    let query = `
      SELECT bt.*, c.name as card_name, c.set_name
      FROM budget_transactions bt
      LEFT JOIN cards c ON bt.card_id = c.id
    `;

    const params = [];

    if (type) {
      query += ' WHERE bt.type = ?';
      params.push(type);
    }

    query += ' ORDER BY bt.transaction_date DESC LIMIT ?';
    params.push(parseInt(limit));

    const transactions = db.prepare(query).all(...params);
    res.json(transactions);
  } catch (error) {
    console.error('Fetch transactions error:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// Add transaction
router.post('/transactions', (req, res) => {
  try {
    const {
      type,
      amount,
      currency = 'USD',
      description = '',
      card_id = null,
      quantity = null,
      transaction_date = null
    } = req.body;

    if (!type || !amount) {
      return res.status(400).json({ error: 'type and amount are required' });
    }

    if (!['purchase', 'sale', 'trade'].includes(type)) {
      return res.status(400).json({ error: 'type must be purchase, sale, or trade' });
    }

    const result = db.prepare(`
      INSERT INTO budget_transactions
      (type, amount, currency, description, card_id, quantity, transaction_date)
      VALUES (?, ?, ?, ?, ?, ?, COALESCE(?, CURRENT_TIMESTAMP))
    `).run(type, amount, currency, description, card_id, quantity, transaction_date);

    res.json({ message: 'Transaction added', id: result.lastInsertRowid });
  } catch (error) {
    console.error('Add transaction error:', error);
    res.status(500).json({ error: 'Failed to add transaction' });
  }
});

// Delete transaction
router.delete('/transactions/:id', (req, res) => {
  try {
    const { id } = req.params;
    const result = db.prepare('DELETE FROM budget_transactions WHERE id = ?').run(id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.json({ message: 'Transaction deleted' });
  } catch (error) {
    console.error('Delete transaction error:', error);
    res.status(500).json({ error: 'Failed to delete transaction' });
  }
});

// Get budget summary
router.get('/summary', (req, res) => {
  try {
    const { period = 'all', currency = 'USD' } = req.query;

    let dateFilter = '';
    if (period === 'month') {
      dateFilter = "AND transaction_date >= date('now', '-1 month')";
    } else if (period === 'year') {
      dateFilter = "AND transaction_date >= date('now', '-1 year')";
    } else if (period === '30days') {
      dateFilter = "AND transaction_date >= date('now', '-30 days')";
    }

    const summary = db.prepare(`
      SELECT
        SUM(CASE WHEN type = 'purchase' THEN amount ELSE 0 END) as total_spent,
        SUM(CASE WHEN type = 'sale' THEN amount ELSE 0 END) as total_earned,
        SUM(CASE WHEN type = 'purchase' THEN amount WHEN type = 'sale' THEN -amount ELSE 0 END) as net_spent,
        COUNT(CASE WHEN type = 'purchase' THEN 1 END) as purchase_count,
        COUNT(CASE WHEN type = 'sale' THEN 1 END) as sale_count,
        COUNT(CASE WHEN type = 'trade' THEN 1 END) as trade_count
      FROM budget_transactions
      WHERE currency = ? ${dateFilter}
    `).get(currency);

    const byMonth = db.prepare(`
      SELECT
        strftime('%Y-%m', transaction_date) as month,
        SUM(CASE WHEN type = 'purchase' THEN amount ELSE 0 END) as spent,
        SUM(CASE WHEN type = 'sale' THEN amount ELSE 0 END) as earned
      FROM budget_transactions
      WHERE currency = ? AND transaction_date >= date('now', '-12 months')
      GROUP BY month
      ORDER BY month
    `).all(currency);

    const topPurchases = db.prepare(`
      SELECT bt.*, c.name, c.set_name, c.image_uri
      FROM budget_transactions bt
      LEFT JOIN cards c ON bt.card_id = c.id
      WHERE bt.type = 'purchase' AND bt.currency = ?
      ORDER BY bt.amount DESC
      LIMIT 5
    `).all(currency);

    res.json({
      summary: {
        total_spent: summary.total_spent || 0,
        total_earned: summary.total_earned || 0,
        net_spent: summary.net_spent || 0,
        purchase_count: summary.purchase_count || 0,
        sale_count: summary.sale_count || 0,
        trade_count: summary.trade_count || 0
      },
      by_month: byMonth,
      top_purchases: topPurchases
    });
  } catch (error) {
    console.error('Budget summary error:', error);
    res.status(500).json({ error: 'Failed to get budget summary' });
  }
});

// Create collection value snapshot
router.post('/snapshot', (req, res) => {
  try {
    const { platform = 'scryfall_usd' } = req.body;

    // Get collection stats
    const stats = db.prepare(`
      SELECT
        SUM(col.quantity) as total_cards,
        COUNT(*) as unique_cards
      FROM collection col
    `).get();

    // Calculate total value
    const platformKey = platform.includes('eur') ? 'eur' : 'usd';
    const collection = db.prepare(`
      SELECT col.quantity, c.prices
      FROM collection col
      JOIN cards c ON col.card_id = c.id
    `).all();

    let totalValue = 0;
    collection.forEach(item => {
      const prices = JSON.parse(item.prices || '{}');
      const price = parseFloat(prices[platformKey]) || 0;
      totalValue += price * item.quantity;
    });

    // Insert snapshot
    const result = db.prepare(`
      INSERT INTO collection_snapshots (total_value, total_cards, unique_cards, platform)
      VALUES (?, ?, ?, ?)
    `).run(totalValue, stats.total_cards, stats.unique_cards, platform);

    res.json({
      message: 'Snapshot created',
      id: result.lastInsertRowid,
      total_value: totalValue,
      total_cards: stats.total_cards,
      unique_cards: stats.unique_cards
    });
  } catch (error) {
    console.error('Create snapshot error:', error);
    res.status(500).json({ error: 'Failed to create snapshot' });
  }
});

// Get collection value history
router.get('/value-history', (req, res) => {
  try {
    const { platform = 'scryfall_usd', days = 30 } = req.query;

    const history = db.prepare(`
      SELECT *
      FROM collection_snapshots
      WHERE platform = ? AND snapshot_date >= datetime('now', '-' || ? || ' days')
      ORDER BY snapshot_date ASC
    `).all(platform, days);

    res.json(history);
  } catch (error) {
    console.error('Value history error:', error);
    res.status(500).json({ error: 'Failed to get value history' });
  }
});

export default router;
