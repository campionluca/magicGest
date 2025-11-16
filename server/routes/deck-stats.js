import express from 'express';
import db from '../db/database.js';

const router = express.Router();

// Get advanced deck statistics
router.get('/:deckId/stats', (req, res) => {
  try {
    const { deckId } = req.params;
    const { category = 'mainboard' } = req.query;

    // Get deck cards
    const cards = db.prepare(`
      SELECT c.*, dc.quantity, dc.category
      FROM deck_cards dc
      JOIN cards c ON dc.card_id = c.id
      WHERE dc.deck_id = ? AND dc.category = ?
    `).all(deckId, category);

    if (cards.length === 0) {
      return res.json({
        mana_curve: [],
        color_distribution: {},
        type_distribution: {},
        total_cards: 0,
        avg_cmc: 0
      });
    }

    // Parse JSON fields
    const parsedCards = cards.map(card => ({
      ...card,
      colors: JSON.parse(card.colors || '[]')
    }));

    // Mana curve
    const manaCurve = {};
    let totalCmc = 0;
    let totalCards = 0;

    parsedCards.forEach(card => {
      const cmc = Math.min(card.cmc || 0, 7); // Cap at 7+
      const key = cmc === 7 ? '7+' : cmc.toString();
      manaCurve[key] = (manaCurve[key] || 0) + card.quantity;
      totalCmc += (card.cmc || 0) * card.quantity;
      totalCards += card.quantity;
    });

    // Color distribution
    const colorDistribution = { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 };
    parsedCards.forEach(card => {
      if (!card.colors || card.colors.length === 0) {
        colorDistribution.C += card.quantity;
      } else {
        card.colors.forEach(color => {
          if (colorDistribution[color] !== undefined) {
            colorDistribution[color] += card.quantity;
          }
        });
      }
    });

    // Type distribution
    const typeDistribution = {
      creature: 0,
      instant: 0,
      sorcery: 0,
      enchantment: 0,
      artifact: 0,
      planeswalker: 0,
      land: 0,
      other: 0
    };

    parsedCards.forEach(card => {
      const type = card.type_line.toLowerCase();
      let categorized = false;

      for (const t of Object.keys(typeDistribution)) {
        if (type.includes(t)) {
          typeDistribution[t] += card.quantity;
          categorized = true;
          break;
        }
      }

      if (!categorized) {
        typeDistribution.other += card.quantity;
      }
    });

    // Average CMC
    const avgCmc = totalCards > 0 ? (totalCmc / totalCards).toFixed(2) : 0;

    res.json({
      mana_curve: Object.entries(manaCurve).map(([cmc, count]) => ({
        cmc,
        count
      })).sort((a, b) => {
        const aVal = a.cmc === '7+' ? 7 : parseInt(a.cmc);
        const bVal = b.cmc === '7+' ? 7 : parseInt(b.cmc);
        return aVal - bVal;
      }),
      color_distribution: colorDistribution,
      type_distribution: typeDistribution,
      total_cards: totalCards,
      avg_cmc: parseFloat(avgCmc)
    });
  } catch (error) {
    console.error('Deck stats error:', error);
    res.status(500).json({ error: 'Failed to get deck statistics' });
  }
});

// Playtest - draw opening hand
router.post('/:deckId/playtest/draw', (req, res) => {
  try {
    const { deckId } = req.params;
    const { hand_size = 7, mulligans = 0 } = req.body;

    // Get mainboard cards
    const deckCards = db.prepare(`
      SELECT c.*, dc.quantity
      FROM deck_cards dc
      JOIN cards c ON dc.card_id = c.id
      WHERE dc.deck_id = ? AND dc.category = 'mainboard'
    `).all(deckId);

    if (deckCards.length === 0) {
      return res.status(400).json({ error: 'Deck is empty' });
    }

    // Build full deck array with duplicates
    const fullDeck = [];
    deckCards.forEach(card => {
      for (let i = 0; i < card.quantity; i++) {
        fullDeck.push({
          ...card,
          colors: JSON.parse(card.colors || '[]')
        });
      }
    });

    // Shuffle
    for (let i = fullDeck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [fullDeck[i], fullDeck[j]] = [fullDeck[j], fullDeck[i]];
    }

    // Draw hand (London mulligan - draw 7, put back based on mulligans)
    const actualHandSize = Math.max(hand_size - mulligans, 1);
    const hand = fullDeck.slice(0, actualHandSize);

    // Calculate hand stats
    const lands = hand.filter(c => c.type_line.toLowerCase().includes('land')).length;
    const avgCmc = hand.reduce((sum, c) => sum + (c.cmc || 0), 0) / hand.length;
    const colors = {};

    hand.forEach(card => {
      const cardColors = card.colors || [];
      if (cardColors.length === 0 && !card.type_line.toLowerCase().includes('land')) {
        colors.C = (colors.C || 0) + 1;
      } else {
        cardColors.forEach(color => {
          colors[color] = (colors[color] || 0) + 1;
        });
      }
    });

    res.json({
      hand,
      stats: {
        hand_size: hand.length,
        lands,
        spells: hand.length - lands,
        avg_cmc: avgCmc.toFixed(2),
        colors,
        mulligans
      },
      deck_size: fullDeck.length
    });
  } catch (error) {
    console.error('Playtest draw error:', error);
    res.status(500).json({ error: 'Failed to draw hand' });
  }
});

// Analyze deck for issues
router.get('/:deckId/analyze', (req, res) => {
  try {
    const { deckId } = req.params;

    const deck = db.prepare('SELECT * FROM decks WHERE id = ?').get(deckId);
    if (!deck) {
      return res.status(404).json({ error: 'Deck not found' });
    }

    const cards = db.prepare(`
      SELECT c.*, dc.quantity, dc.category
      FROM deck_cards dc
      JOIN cards c ON dc.card_id = c.id
      WHERE dc.deck_id = ? AND dc.category = 'mainboard'
    `).all(deckId);

    const issues = [];
    const suggestions = [];

    // Count cards
    const totalCards = cards.reduce((sum, c) => sum + c.quantity, 0);

    // Check deck size
    if (deck.format) {
      if (deck.format === 'Commander' && totalCards !== 99) {
        issues.push(`Commander decks must have exactly 99 cards (current: ${totalCards})`);
      } else if (['Standard', 'Modern', 'Pioneer'].includes(deck.format) && totalCards < 60) {
        issues.push(`${deck.format} decks must have at least 60 cards (current: ${totalCards})`);
      }
    }

    // Count lands
    const lands = cards.filter(c => c.type_line.toLowerCase().includes('land'));
    const landCount = lands.reduce((sum, c) => sum + c.quantity, 0);
    const landPercentage = (landCount / totalCards) * 100;

    if (landPercentage < 30) {
      suggestions.push('Consider adding more lands (current: ' + landPercentage.toFixed(1) + '%)');
    } else if (landPercentage > 50) {
      suggestions.push('Too many lands (current: ' + landPercentage.toFixed(1) + '%)');
    }

    // Check for 4-of limit (except basic lands and commander format)
    if (deck.format !== 'Commander') {
      const overLimit = cards.filter(c => {
        const isBasicLand = c.type_line.includes('Basic') && c.type_line.includes('Land');
        return !isBasicLand && c.quantity > 4;
      });

      if (overLimit.length > 0) {
        overLimit.forEach(card => {
          issues.push(`${card.name}: ${card.quantity} copies (max 4 allowed)`);
        });
      }
    }

    // Check mana curve
    const avgCmc = cards.reduce((sum, c) => sum + (c.cmc || 0) * c.quantity, 0) / totalCards;
    if (avgCmc > 4) {
      suggestions.push(`High average CMC (${avgCmc.toFixed(2)}). Consider adding more low-cost cards.`);
    }

    res.json({
      deck_name: deck.name,
      format: deck.format,
      total_cards: totalCards,
      land_count: landCount,
      land_percentage: parseFloat(landPercentage.toFixed(1)),
      avg_cmc: parseFloat(avgCmc.toFixed(2)),
      issues,
      suggestions
    });
  } catch (error) {
    console.error('Deck analysis error:', error);
    res.status(500).json({ error: 'Failed to analyze deck' });
  }
});

export default router;
