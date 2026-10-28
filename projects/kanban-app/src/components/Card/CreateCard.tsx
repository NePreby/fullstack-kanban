import React, { useState } from 'react';
import { createCard, getCardSuggestions } from '../../api/cards';
import './CreateCard.css';

interface CreateCardProps {
  boardId: string;
  columnId: string;
  onClose: () => void;
  onCreated: () => void;
}

interface SuggestionState {
  category: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  tags: string[];
  reasoning: string;
}

const CreateCard: React.FC<CreateCardProps> = ({ boardId, columnId, onClose, onCreated }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [tags, setTags] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [suggestion, setSuggestion] = useState<SuggestionState | null>(null);

  const handleFetchSuggestions = async () => {
    if (!title.trim()) return;
    setSuggesting(true);
    try {
      const data = await getCardSuggestions({ title: title.trim(), description });
      setSuggestion(data);
    } catch (err) {
      console.error('Failed to get suggestions:', err);
    } finally {
      setSuggesting(false);
    }
  };

  const handleApplySuggestion = () => {
    if (!suggestion) return;
    setPriority(suggestion.priority);
    setTags(Array.from(new Set([...tags, ...suggestion.tags])));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setSubmitting(true);
    try {
      await createCard({
        columnId,
        boardId,
        title: title.trim(),
        description,
        priority,
        tags: JSON.stringify(tags)
      });
      onCreated();
      onClose();
    } catch (err) {
      console.error('Failed to create card:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="create-card-overlay" onClick={onClose}>
      <div className="create-card-modal" onClick={e => e.stopPropagation()}>
        <div className="create-card-header">
          <h3>Create Card</h3>
          <button
            type="button"
            className="ai-suggest-btn"
            onClick={handleFetchSuggestions}
            disabled={!title.trim() || suggesting}
            title="Generate AI category and priority suggestions"
          >
            {suggesting ? '✨ Analyzing...' : '✨ AI Suggest'}
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Card title"
            value={title}
            onChange={e => setTitle(e.target.value)}
            onBlur={() => { if (title.trim() && !suggestion) handleFetchSuggestions(); }}
            autoFocus
          />
          <textarea
            placeholder="Description (optional)"
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={3}
          />

          {suggestion && (
            <div className="ai-suggestion-box">
              <div className="ai-suggestion-info">
                <span className="ai-badge category">🏷️ {suggestion.category}</span>
                <span className={`ai-badge priority ${suggestion.priority}`}>⚡ {suggestion.priority}</span>
              </div>
              <p className="ai-reasoning">{suggestion.reasoning}</p>
              <div className="ai-actions">
                <button type="button" className="apply-btn" onClick={handleApplySuggestion}>
                  Apply Suggestions
                </button>
                <button type="button" className="dismiss-btn" onClick={() => setSuggestion(null)}>
                  Dismiss
                </button>
              </div>
            </div>
          )}

          <div className="form-group">
            <label>Priority (Editable):</label>
            <select value={priority} onChange={e => setPriority(e.target.value as any)}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          <div className="create-card-actions">
            <button type="button" onClick={onClose}>Cancel</button>
            <button type="submit" disabled={submitting || !title.trim()}>
              {submitting ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateCard;
