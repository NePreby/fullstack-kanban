import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Card } from '../../types';
import './KanbanCard.css';

interface KanbanCardProps {
  card: Card;
  isDragging?: boolean;
  onClick?: () => void;
}

const priorityColors: Record<string, string> = {
  low: '#22c55e',
  medium: '#eab308',
  high: '#f97316',
  urgent: '#ef4444',
};

const KanbanCard: React.FC<KanbanCardProps> = ({ card, isDragging, onClick }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: card.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`kanban-card ${isDragging ? 'dragging' : ''}`}
      onClick={onClick}
    >
      <div className="card-header">
        <span
          className="priority-dot"
          style={{ background: priorityColors[card.priority] || '#94a3b8' }}
          title={card.priority}
        />
        <span className="card-title">{card.title}</span>
      </div>
      {card.description && (
        <p className="card-description">{card.description.slice(0, 80)}</p>
      )}
      <div className="card-meta">
        {card.dueDate && (
          <span className="card-due">📅 {new Date(card.dueDate).toLocaleDateString()}</span>
        )}
        {card.assignee && <span className="card-assignee">👤 {card.assignee}</span>}
      </div>
    </div>
  );
};

export default KanbanCard;
