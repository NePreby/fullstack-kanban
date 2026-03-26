import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Board } from '../../types';
import { getBoards, deleteBoard } from '../../api/boards';
import CreateBoard from './CreateBoard';
import './BoardList.css';

const BoardList: React.FC = () => {
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const fetchBoards = async () => {
    try {
      const data = await getBoards();
      setBoards(data);
    } catch (err) {
      console.error('Failed to fetch boards:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBoards(); }, []);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm('Delete this board and all its cards?')) return;
    try {
      await deleteBoard(id);
      await fetchBoards();
    } catch (err) {
      console.error('Failed to delete board:', err);
    }
  };

  if (loading) return <div className="boards-loading">Loading boards...</div>;

  return (
    <div className="boards-container">
      <header className="boards-header">
        <h1>📋 My Kanban Boards</h1>
        <button className="btn-primary" onClick={() => setShowCreate(true)}>
          + New Board
        </button>
      </header>

      {boards.length === 0 ? (
        <div className="boards-empty">
          <p>No boards yet. Create your first one!</p>
        </div>
      ) : (
        <div className="boards-grid">
          {boards.map(board => (
            <Link to={`/board/${board.id}`} key={board.id} className="board-card">
              <div className="board-card-content">
                <h2>{board.title}</h2>
                {board.description && <p>{board.description}</p>}
                <span className="board-date">
                  Created {new Date(board.createdAt).toLocaleDateString()}
                </span>
              </div>
              <button
                className="btn-delete"
                onClick={(e) => handleDelete(board.id, e)}
                title="Delete board"
              >
                🗑️
              </button>
            </Link>
          ))}
        </div>
      )}

      {showCreate && (
        <CreateBoard
          onClose={() => setShowCreate(false)}
          onCreated={fetchBoards}
        />
      )}
    </div>
  );
};

export default BoardList;
