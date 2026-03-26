import type { Card, CreateCardRequest, UpdateCardRequest, MoveCardRequest } from '../types';

const API_BASE = '/api';

export async function getCards(columnId?: string): Promise<Card[]> {
  const url = columnId
    ? `${API_BASE}/cards?column_id=${columnId}`
    : `${API_BASE}/cards`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch cards: ${res.statusText}`);
  return res.json();
}

export async function createCard(data: CreateCardRequest): Promise<Card> {
  const res = await fetch(`${API_BASE}/cards`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Failed to create card: ${res.statusText}`);
  return res.json();
}

export async function updateCard(id: string, data: UpdateCardRequest): Promise<Card> {
  const res = await fetch(`${API_BASE}/cards/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Failed to update card: ${res.statusText}`);
  return res.json();
}

export async function deleteCard(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/cards/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error(`Failed to delete card: ${res.statusText}`);
}

export async function moveCard(id: string, data: MoveCardRequest): Promise<Card> {
  return updateCard(id, {
    columnId: data.targetColumnId,
    // position handled by backend
  });
}
