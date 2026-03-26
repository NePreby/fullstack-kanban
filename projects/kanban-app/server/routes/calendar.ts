import { Router } from 'express';
import db from '../db';

const router = Router();

// GET /api/calendar?range=7d — cards grouped by due_date or created_at
router.get('/', (req, res) => {
  const range = (req.query.range as string) || '7d';
  const days = range === '30d' ? 30 : range === '90d' ? 90 : 7;

  const results = db.prepare(`
    SELECT
      DATE(c.due_date) AS date,
      COUNT(*) AS card_count,
      GROUP_CONCAT(c.title, ' | ') AS titles
    FROM cards c
    WHERE c.due_date IS NOT NULL
      AND c.due_date >= DATE('now')
      AND c.due_date <= DATE('now', '+' || ? || ' days')
    GROUP BY DATE(c.due_date)
    ORDER BY date ASC
  `).all(days);

  // Also get recently created cards
  const recent = db.prepare(`
    SELECT
      DATE(c.created_at) AS date,
      COUNT(*) AS created_count
    FROM cards c
    WHERE c.created_at >= DATE('now', '-' || ? || ' days')
    GROUP BY DATE(c.created_at)
    ORDER BY date DESC
  `).all(days);

  res.json({ upcoming: results, recentlyCreated: recent });
});

export default router;
