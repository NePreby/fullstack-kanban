import { Router } from 'express';
import db from '../db';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// GET /api/cards?column_id=X&board_id=X — list cards
router.get('/', (req, res) => {
  const { column_id, board_id } = req.query;
  let cards;
  if (column_id) {
    cards = db.prepare('SELECT * FROM cards WHERE column_id = ? ORDER BY position').all(column_id);
  } else if (board_id) {
    cards = db.prepare('SELECT * FROM cards WHERE board_id = ? ORDER BY position').all(board_id);
  } else {
    cards = db.prepare('SELECT * FROM cards ORDER BY created_at DESC').all();
  }
  res.json(cards);
});

// POST /api/cards — create card
router.post('/', (req, res) => {
  const { column_id, board_id, title, description = '', priority = 'medium' } = req.body;
  if (!column_id || !board_id || !title) {
    return res.status(400).json({ error: 'column_id, board_id, and title are required' });
  }

  const maxPos = db.prepare('SELECT MAX(position) as max FROM cards WHERE column_id = ?').get(column_id) as any;
  const id = uuidv4();
  db.prepare('INSERT INTO cards (id, column_id, board_id, title, description, position, priority) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(id, column_id, board_id, title, description, (maxPos?.max ?? -1) + 1, priority);

  const card = db.prepare('SELECT * FROM cards WHERE id = ?').get(id);
  res.status(201).json(card);
});

// PATCH /api/cards/:cardId — update card
router.patch('/:cardId', (req, res) => {
  const { title, description, column_id, position, priority, status, assignee, due_date, tags } = req.body;
  const card = db.prepare('SELECT * FROM cards WHERE id = ?').get(req.params.cardId);
  if (!card) return res.status(404).json({ error: 'Card not found' });

  // Handle move to different column
  if (column_id !== undefined && (card as any).column_id !== column_id) {
    // Reorder old column
    db.prepare("UPDATE cards SET position = position - 1 WHERE column_id = ? AND position > ?")
      .run((card as any).column_id, (card as any).position);
    // Get new position
    const maxPos = db.prepare('SELECT MAX(position) as max FROM cards WHERE column_id = ?').get(column_id) as any;
    const newPos = position ?? (maxPos?.max ?? -1) + 1;
    db.prepare("UPDATE cards SET column_id = ?, position = ?, board_id = COALESCE(?, board_id), updated_at = datetime('now') WHERE id = ?")
      .run(column_id, newPos, req.body.board_id ?? null, req.params.cardId);
  } else if (position !== undefined && position !== (card as any).position) {
    // Reorder within same column
    const oldPos = (card as any).position;
    if (position > oldPos) {
      db.prepare("UPDATE cards SET position = position - 1 WHERE column_id = ? AND position > ? AND position <= ?")
        .run((card as any).column_id, oldPos, position);
    } else {
      db.prepare("UPDATE cards SET position = position + 1 WHERE column_id = ? AND position >= ? AND position < ?")
        .run((card as any).column_id, position, oldPos);
    }
    db.prepare("UPDATE cards SET position = ?, updated_at = datetime('now') WHERE id = ?")
      .run(position, req.params.cardId);
  }

  // Update other fields
  db.prepare("UPDATE cards SET title = COALESCE(?, title), description = COALESCE(?, description), priority = COALESCE(?, priority), status = COALESCE(?, status), assignee = COALESCE(?, assignee), due_date = COALESCE(?, due_date), tags = COALESCE(?, tags), updated_at = datetime('now') WHERE id = ?")
    .run(title ?? null, description ?? null, priority ?? null, status ?? null, assignee ?? null, due_date ?? null, tags ?? null, req.params.cardId);

  const updated = db.prepare('SELECT * FROM cards WHERE id = ?').get(req.params.cardId);
  res.json(updated);
});

// DELETE /api/cards/:cardId
router.delete('/:cardId', (req, res) => {
  const card = db.prepare('SELECT * FROM cards WHERE id = ?').get(req.params.cardId) as any;
  if (!card) return res.status(404).json({ error: 'Card not found' });

  db.prepare('DELETE FROM cards WHERE id = ?').run(req.params.cardId);
  db.prepare("UPDATE cards SET position = position - 1 WHERE column_id = ? AND position > ?")
    .run(card.column_id, card.position);

  res.json({ ok: true });
});

export default router;
