import express from 'express';
import cors from 'cors';
import { initDatabase } from './db/database.js';
import collectionRoutes from './routes/collection.js';
import deckRoutes from './routes/decks.js';
import cardRoutes from './routes/cards.js';
import priceRoutes from './routes/prices.js';
import importExportRoutes from './routes/import-export.js';

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
app.use('/api', importExportRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'MagicGest API is running' });
});

app.listen(PORT, () => {
  console.log(`🃏 MagicGest server running on http://localhost:${PORT}`);
});
