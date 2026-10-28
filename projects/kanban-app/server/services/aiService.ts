export interface TaskSuggestionInput {
  title: string;
  description?: string;
}

export interface TaskSuggestionOutput {
  category: 'bug' | 'feature' | 'enhancement' | 'documentation' | 'security' | 'performance' | 'design' | 'refactor' | 'task';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  tags: string[];
  reasoning: string;
  confidence: number;
}

const CATEGORY_KEYWORDS: Record<TaskSuggestionOutput['category'], string[]> = {
  security: ['vulnerability', 'cve', 'exploit', 'auth', 'unauthorized', 'sanitize', 'injection', 'leak', 'token', 'secret'],
  bug: ['fix', 'bug', 'error', 'fail', 'crash', 'broken', 'issue', 'defect', 'exception', 'unexpected'],
  performance: ['slow', 'speed', 'latency', 'optimize', 'memory', 'leak', 'cache', 'profiling', 'throughput'],
  documentation: ['doc', 'docs', 'readme', 'guide', 'tutorial', 'comment', 'manual', 'changelog', 'contributing'],
  design: ['ui', 'ux', 'css', 'style', 'theme', 'color', 'layout', 'responsive', 'modal', 'button', 'font'],
  refactor: ['refactor', 'cleanup', 'clean', 'structure', 'modular', 'decouple', 'extract', 'reorganize'],
  feature: ['add', 'feat', 'feature', 'new', 'implement', 'support', 'integrate', 'create'],
  enhancement: ['improve', 'better', 'enhance', 'upgrade', 'update', 'bump'],
  task: ['chore', 'setup', 'config', 'ci', 'test', 'deploy']
};

const URGENT_KEYWORDS = ['urgent', 'critical', 'emergency', 'outage', 'security breach', 'data loss', 'production down', 'blocker'];
const HIGH_KEYWORDS = ['error', 'fail', 'broken', 'crash', 'leak', 'high', 'important', 'regression', 'vulnerability', 'injection'];
const LOW_KEYWORDS = ['typo', 'cosmetic', 'minor', 'trivial', 'docs', 'readme', 'guide', 'contributing', 'cleanup', 'style'];

/**
 * Heuristic classifier providing instant, resilient offline suggestions
 */
export function classifyTaskHeuristic(input: TaskSuggestionInput): TaskSuggestionOutput {
  const text = `${input.title} ${input.description || ''}`.toLowerCase();

  // Detect priority
  let priority: TaskSuggestionOutput['priority'] = 'medium';
  if (URGENT_KEYWORDS.some(kw => text.includes(kw))) {
    priority = 'urgent';
  } else if (HIGH_KEYWORDS.some(kw => text.includes(kw))) {
    priority = 'high';
  } else if (LOW_KEYWORDS.some(kw => text.includes(kw))) {
    priority = 'low';
  }

  // Detect category
  let bestCategory: TaskSuggestionOutput['category'] = 'task';
  let maxMatches = 0;
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    const matches = keywords.filter(kw => text.includes(kw)).length;
    if (matches > maxMatches) {
      maxMatches = matches;
      bestCategory = cat as TaskSuggestionOutput['category'];
    }
  }

  const tags = [bestCategory];
  if (priority === 'urgent' || priority === 'high') {
    tags.push(priority);
  }

  return {
    category: bestCategory,
    priority,
    tags,
    reasoning: `Matched ${maxMatches > 0 ? bestCategory : 'default'} based on contextual keywords in title and description.`,
    confidence: maxMatches > 0 ? 0.85 : 0.60
  };
}

/**
 * Analyzes task text and returns category & priority recommendations.
 * Supports OpenAI API when configured, with graceful fallback to heuristic engine.
 */
export async function getTaskSuggestions(input: TaskSuggestionInput): Promise<TaskSuggestionOutput> {
  const apiKey = process.env.AI_API_KEY || process.env.OPENAI_API_KEY;
  const apiUrl = process.env.AI_API_URL || 'https://api.openai.com/v1/chat/completions';
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

  if (!apiKey) {
    // Graceful offline fallback
    return classifyTaskHeuristic(input);
  }

  try {
    const prompt = `Analyze this Kanban task and return JSON with category, priority, tags, reasoning, confidence:
Title: "${input.title}"
Description: "${input.description || ''}"

Categories: bug, feature, enhancement, documentation, security, performance, design, refactor, task.
Priorities: low, medium, high, urgent.
Respond ONLY with JSON: {"category": "...", "priority": "...", "tags": [...], "reasoning": "...", "confidence": 0.9}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.2
      }),
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!res.ok) {
      console.warn(`[AIService] Upstream API returned status ${res.status}, falling back to heuristic.`);
      return classifyTaskHeuristic(input);
    }

    const data = await res.json() as any;
    const content = data.choices?.[0]?.message?.content;
    if (content) {
      const parsed = JSON.parse(content);
      return {
        category: parsed.category || 'task',
        priority: ['low', 'medium', 'high', 'urgent'].includes(parsed.priority) ? parsed.priority : 'medium',
        tags: Array.isArray(parsed.tags) ? parsed.tags : [parsed.category || 'task'],
        reasoning: parsed.reasoning || 'Derived from AI contextual assessment.',
        confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.90
      };
    }
  } catch (err) {
    console.warn('[AIService] Failed calling external AI provider, using fallback:', err);
  }

  return classifyTaskHeuristic(input);
}
