import assert from 'node:assert';
import test from 'node:test';

// Test heuristic classification
test('AI Service - Heuristic Categorization and Priority Detection', async (t) => {
  const { classifyTaskHeuristic } = await import('./services/aiService.ts');

  // Bug & Urgent test
  const bugTask = classifyTaskHeuristic({
    title: 'Critical production crash when submitting invalid token',
    description: 'The server throws unhandled exception and exits'
  });
  assert.strictEqual(bugTask.category, 'bug');
  assert.strictEqual(bugTask.priority, 'urgent');
  assert.ok(bugTask.confidence >= 0.8);

  // Security test
  const secTask = classifyTaskHeuristic({
    title: 'SQL injection vulnerability in user profile search endpoint',
    description: 'Sanitize user inputs in raw database queries'
  });
  assert.strictEqual(secTask.category, 'security');

  // Documentation test
  const docTask = classifyTaskHeuristic({
    title: 'Update README guide and API contributing instructions',
    description: 'Add missing setup commands'
  });
  assert.strictEqual(docTask.category, 'documentation');
  assert.strictEqual(docTask.priority, 'low');

  // Performance test
  const perfTask = classifyTaskHeuristic({
    title: 'High latency in card reordering queries under load',
    description: 'Optimize indexes and query execution plan'
  });
  assert.strictEqual(perfTask.category, 'performance');
});

test('AI Service - Graceful Fallback When External API Key is Missing', async (t) => {
  const { getTaskSuggestions } = await import('./services/aiService.ts');
  const result = await getTaskSuggestions({
    title: 'Add drag and drop support for mobile touch devices',
    description: 'Implement touch listener for touchstart and touchend'
  });
  assert.ok(['feature', 'enhancement', 'task'].includes(result.category));
  assert.ok(['low', 'medium', 'high', 'urgent'].includes(result.priority));
  assert.ok(result.reasoning.length > 0);
});
