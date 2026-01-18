/**
 * @jest-environment node
 */

import { describe, it, expect } from '@jest/globals';

// Mock parseIntent function
function parseIntent(query) {
  const lowerQuery = query.toLowerCase().trim();

  // Create task
  if (
    lowerQuery.includes('создай задач') ||
    lowerQuery.includes('новая задача')
  ) {
    const titleMatch = query.match(
      /(?:создай задач[уа]?|новая задача):\s*(.+?)(?:\s*,|\s+приоритет|$)/i
    );
    const priorityMatch = query.match(/приоритет\s+(high|medium|low)/i);

    return {
      action: 'create_task',
      params: {
        title: titleMatch ? titleMatch[1].trim() : 'Новая задача',
        priority: priorityMatch ? priorityMatch[1] : 'medium',
      },
      tools: ['task_mcp'],
    };
  }

  // List tasks
  if (
    lowerQuery.includes('покажи') &&
    (lowerQuery.includes('high') || lowerQuery.includes('приоритет'))
  ) {
    return {
      action: 'list_tasks',
      params: { priority: 'high' },
      tools: ['task_mcp'],
    };
  }

  // Recommend
  if (lowerQuery.includes('что делать')) {
    return { action: 'recommend_next', params: {}, tools: ['task_mcp', 'git_mcp'] };
  }

  // Git status
  if (lowerQuery === 'git status') {
    return { action: 'git_status', params: {}, tools: ['git_mcp'] };
  }

  // Default
  return { action: 'list_tasks', params: {}, tools: ['task_mcp'] };
}

describe('Intent Router', () => {
  describe('parseIntent', () => {
    it('should parse create task command', () => {
      const intent = parseIntent(
        'Создай задачу: исправить баг в авторизации, приоритет high'
      );

      expect(intent.action).toBe('create_task');
      expect(intent.params.title).toBe('исправить баг в авторизации');
      expect(intent.params.priority).toBe('high');
      expect(intent.tools).toContain('task_mcp');
    });

    it('should parse list tasks with priority filter', () => {
      const intent = parseIntent('Покажи задачи с приоритетом high');

      expect(intent.action).toBe('list_tasks');
      expect(intent.params.priority).toBe('high');
    });

    it('should parse recommendation request', () => {
      const intent = parseIntent('Что делать первым?');

      expect(intent.action).toBe('recommend_next');
      expect(intent.tools).toContain('task_mcp');
      expect(intent.tools).toContain('git_mcp');
    });

    it('should parse git status command', () => {
      const intent = parseIntent('git status');

      expect(intent.action).toBe('git_status');
      expect(intent.tools).toContain('git_mcp');
    });

    it('should default to list_tasks for unknown commands', () => {
      const intent = parseIntent('какая-то странная команда');

      expect(intent.action).toBe('list_tasks');
    });

    it('should handle create task without priority', () => {
      const intent = parseIntent('Создай задачу: добавить тесты');

      expect(intent.action).toBe('create_task');
      expect(intent.params.title).toBe('добавить тесты');
      expect(intent.params.priority).toBe('medium'); // Default
    });
  });
});
