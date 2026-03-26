import { Router } from 'express';
import db from '../db';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// GET /api/views?board_id=xxx — list saved views for a board
router.get('/', (req, res) => {
  const boardId = req.query.board_id as string;
  if (!boardId) return res.status(400).json({ error: 'board_id is required' });

  const views = db.prepare('SELECT * FROM views WHERE board_id = ? ORDER BY created_at DESC').all(boardId);
  res.json(views);
});

// POST /api/views — create a saved view
router.post('/', (req, res) => {
  const { board_id, name, filters = '{}', sort_by = 'created_at', sort_order = 'desc' } = req.body;
  if (!board_id || !name) return res.status(400).json({ error: 'board_id and name are required' });

  const id = uuidv4();
  db.prepare('INSERT INTO views (id, board_id, name, filters, sort_by, sort_order) VALUES (?, ?, ?, ?, ?, ?)')
    .run(id, board_id, name, typeof filters === 'string' ? filters : JSON.stringify(filters), sort_by, sort_order);

  const view = db.prepare('SELECT * FROM views WHERE id = ?').get(id);
  res.status(201).json(view);
});

// PATCH /api/views/:viewId
router.patch('/:viewId', (req, res) => {
  const view = db.prepare('SELECT * FROM views WHERE id = ?').get(req.params.viewId);
  if (!view) return res.status(404).json({ error: 'View not found' });

  const { name, filters, sort_by, sort_order } = req.body;
  db.prepare(`
    UPDATE views SET
      name = COALESCE(?, name),
      filters = COALESCE(?, filters),
      sort_by = COALESCE(?, sort_by),
      sort_order = COALESCE(?, sort_order),
      updated_at = datetime('now')
    WHERE id = ?
  `).run(
    name ?? null,
    filters ? (typeof filters === 'string' ? filters : JSON.stringify(filters)) : null,
    sort_by ?? null,
    sort_order ?? null,
    req.params.viewId
  );

  const updated = db.prepare('SELECT * FROM views WHERE id = ?').get(req.params.viewId);
  res.json(updated);
});

// DELETE /api/views/:viewId
router.delete('/:viewId', (req, res) => {
  db.prepare('DELETE FROM views WHERE id = ?').run(req.params.viewId);
  res.json({ ok: true });
});

// GET /api/views/:viewId/cards — get cards matching a saved view's filters
router.get('/:viewId/cards', (req, res) => {
  const view = db.prepare('SELECT * FROM views WHERE id = ?').get(req.params.viewId) as any;
  if (!view) return res.status(404).json({ error: 'View not found' });

  const filters = JSON.parse(view.filters || '{}');
  let query = 'SELECT c.*, col.title AS column_title FROM cards c JOIN columns col ON col.id = c.column_id WHERE c.board_id = ?';
  const params: any[] = [view.board_id];

  if (filters.status) {
    query += ' AND c.status = ?';
    params.push(filters.status);
  }
  if (filters.assignee) {
    query += ' AND c.assignee = ?';
    params.push(filters.assignee);
  }
  if (filters.priority) {
    query += ' AND c.priority = ?';
    params.push(filters.priority);
  }

  const dir = view.sort_order === 'asc' ? 'ASC' : 'DESC';
  query += ` ORDER BY c.${view.sort_by} ${dir}`;

  const cards = db.prepare(query).all(...params);
  res.json({ view, cards });
});

export default router;
