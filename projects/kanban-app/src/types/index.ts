// Re-export all shared types for frontend use
export type {
  Board,
  Column,
  Card,
  View,
  CreateBoardRequest,
  UpdateBoardRequest,
  CreateCardRequest,
  UpdateCardRequest,
  MoveCardRequest,
  SearchQuery,
  CalendarQuery,
  CreateViewRequest,
  BoardWithColumns,
  ColumnWithCards,
} from '../../shared/types';

// Frontend-specific types
export interface DragItem {
  id: string;
  type: 'card';
  columnId: string;
  position: number;
}

export interface ApiError {
  error: string;
  message: string;
  status: number;
}

export interface DropResult {
  active: { id: string };
  over: { id: string } | null;
}
