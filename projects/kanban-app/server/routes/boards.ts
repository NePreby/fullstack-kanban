import { Router } from 'express';
import db from '../db';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// GET /api/boards — list all boards
router.get('/', (_req, res) => {
  const boards = db.prepare('SELECT * FROM boards ORDER BY created_at DESC').all();
  res.json(boards);
});

// GET /api/boards/:boardId — get board with columns and cards
router.get('/:boardId', (req, res) => {
  const board = db.prepare('SELECT * FROM boards WHERE id = ?').get(req.params.boardId);
  if (!board) return res.status(404).json({ error: 'Board not found' });

  const columns = db.prepare('SELECT * FROM columns WHERE board_id = ? ORDER BY position').all(req.params.boardId) as any[];
  const cards = db.prepare('SELECT * FROM cards WHERE board_id = ? ORDER BY position').all(req.params.boardId) as any[];

  const columnsWithCards = columns.map(col => ({
    ...col,
    cards: cards.filter(c => c.column_id === col.id),
  }));

  res.json({ ...board, columns: columnsWithCards });
});

// POST /api/boards — create board
router.post('/', (req, res) => {
  const { title, description = '' } = req.body;
  if (!title) return res.status(400).json({ error: 'Title is required' });

  const id = uuidv4();
  db.prepare('INSERT INTO boards (id, title, description) VALUES (?, ?, ?)').run(id, title, description);

  // Create default columns
  const defaultColumns = ['To Do', 'In Progress', 'Review', 'Done'];
  const insertCol = db.prepare('INSERT INTO columns (id, board_id, title, position) VALUES (?, ?, ?, ?)');
  defaultColumns.forEach((colTitle, i) => {
    insertCol.run(uuidv4(), id, colTitle, i);
  });

  const board = db.prepare('SELECT * FROM boards WHERE id = ?').get(id);
  res.status(201).json(board);
});

// PATCH /api/boards/:boardId
router.patch('/:boardId', (req, res) => {
  const { title, description } = req.body;
  const board = db.prepare('SELECT * FROM boards WHERE id = ?').get(req.params.boardId);
  if (!board) return res.status(404).json({ error: 'Board not found' });

  db.prepare("UPDATE boards SET title = COALESCE(?, title), description = COALESCE(?, description), updated_at = datetime('now') WHERE id = ?")
    .run(title ?? null, description ?? null, req.params.boardId);

  const updated = db.prepare('SELECT * FROM boards WHERE id = ?').get(req.params.boardId);
  res.json(updated);
});

// DELETE /api/boards/:boardId
router.delete('/:boardId', (req, res) => {
  db.prepare('DELETE FROM boards WHERE id = ?').run(req.params.boardId);
  res.json({ ok: true });
});

// GET /api/boards/:boardId/columns
router.get('/:boardId/columns', (req, res) => {
  const columns = db.prepare('SELECT * FROM columns WHERE board_id = ? ORDER BY position').all(req.params.boardId);
  res.json(columns);
});

// POST /api/boards/:boardId/columns
router.post('/:boardId/columns', (req, res) => {
  const { title } = req.body;
  if (!title) return res.status(400).json({ error: 'Title is required' });

  const maxPos = db.prepare('SELECT MAX(position) as max FROM columns WHERE board_id = ?').get(req.params.boardId) as any;
  const id = uuidv4();
  db.prepare('INSERT INTO columns (id, board_id, title, position) VALUES (?, ?, ?, ?)')
    .run(id, req.params.boardId, title, (maxPos?.max ?? -1) + 1);

  const col = db.prepare('SELECT * FROM columns WHERE id = ?').get(id);
  res.status(201).json(col);
});

// PATCH /api/columns/:columnId
router.patch('/columns/:columnId', (req, res) => {
  const { title, position } = req.body;
  const col = db.prepare('SELECT * FROM columns WHERE id = ?').get(req.params.columnId);
  if (!col) return res.status(404).json({ error: 'Column not found' });

  db.prepare("UPDATE columns SET title = COALESCE(?, title), position = COALESCE(?, position), updated_at = datetime('now') WHERE id = ?")
    .run(title ?? null, position ?? null, req.params.columnId);

  const updated = db.prepare('SELECT * FROM columns WHERE id = ?').get(req.params.columnId);
  res.json(updated);
});

// DELETE /api/columns/:columnId
router.delete('/columns/:columnId', (req, res) => {
  db.prepare('DELETE FROM columns WHERE id = ?').run(req.params.columnId);
  res.json({ ok: true });
});

export default router;
