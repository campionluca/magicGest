import express from 'express';
import cors from 'cors';
import { initDatabase } from './db/database.js';
import collectionRoutes from './routes/collection.js';
import deckRoutes from './routes/decks.js';
import cardRoutes from './routes/cards.js';
import priceRoutes from './routes/prices.js';
import importExportRoutes from './routes/import-export.js';
import wishlistRoutes from './routes/wishlist.js';
import alertRoutes from './routes/alerts.js';
import budgetRoutes from './routes/budget.js';
import deckStatsRoutes from './routes/deck-stats.js';

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize database
initDatabase();

// Routes
app.use('/api/collection', collectionRoutes);
app.use('/api/decks', deckRoutes);
app.use('/api/cards', cardRoutes);
app.use('/api/prices', priceRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/budget', budgetRoutes);
app.use('/api/deck-stats', deckStatsRoutes);
app.use('/api', importExportRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'MagicGest API is running' });
});

app.listen(PORT, () => {
  console.log(`🃏 MagicGest server running on http://localhost:${PORT}`);
});
