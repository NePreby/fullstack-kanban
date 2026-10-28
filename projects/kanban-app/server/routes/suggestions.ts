import { Router, Request, Response } from 'express';
import { getTaskSuggestions } from '../services/aiService';

const router = Router();

/**
 * POST /api/cards/suggestions
 * Analyzes task title and optional description to recommend category and priority.
 */
router.post('/', async (req: Request, res: Response) => {
  const { title, description } = req.body;

  if (!title || typeof title !== 'string' || !title.trim()) {
    return res.status(400).json({
      error: 'Invalid input',
      message: 'Field "title" is required and cannot be empty.'
    });
  }

  try {
    const suggestions = await getTaskSuggestions({
      title: title.trim(),
      description: typeof description === 'string' ? description.trim() : ''
    });

    return res.status(200).json(suggestions);
  } catch (err: any) {
    console.error('[SuggestionsRoute] Error generating recommendations:', err);
    return res.status(500).json({
      error: 'AI Processing Error',
      message: 'Failed to generate suggestions. Please try again or fill manually.'
    });
  }
});

export default router;
