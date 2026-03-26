import { Router } from 'express';
import db from '../db';

const router = Router();

// GET /api/search?q=term — search cards by title, description, or assignee
router.get('/', (req, res) => {
  const q = (req.query.q as string || '').trim();
  if (!q) return res.json([]);

  const like = `%${q}%`;
  const results = db.prepare(`
    SELECT c.*, col.title AS column_title, b.title AS board_title
    FROM cards c
    JOIN columns col ON col.id = c.column_id
    JOIN boards b ON b.id = c.board_id
    WHERE c.title LIKE ? OR c.description LIKE ? OR c.assignee LIKE ?
    ORDER BY c.updated_at DESC
    LIMIT 50
  `).all(like, like, like);

  res.json(results);
});

export default router;
