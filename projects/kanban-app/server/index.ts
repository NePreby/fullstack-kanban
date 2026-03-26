import express from 'express';
import cors from 'cors';
import { runMigrations } from './migrate';
import boardsRouter from './routes/boards';
import cardsRouter from './routes/cards';
import searchRouter from './routes/search';
import calendarRouter from './routes/calendar';
import viewsRouter from './routes/views';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Run migrations on startup
runMigrations();

// Routes
app.use('/api/boards', boardsRouter);
app.use('/api/cards', cardsRouter);
app.use('/api/search', searchRouter);
app.use('/api/calendar', calendarRouter);
app.use('/api/views', viewsRouter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
