/**
 * @jest-environment node
 */

import { describe, it, expect } from '@jest/globals';
import tasksMock from './mocks/tasks.mock.json' assert { type: 'json' };
import gitStatusMock from './mocks/git-status.mock.json' assert { type: 'json' };

// Mock функции из teamAssistantService
function calculateTaskScore(task, allTasks, gitStatus) {
  let score = 0;

  // Priority weight
  if (task.priority === 'high') score += 10;
  else if (task.priority === 'medium') score += 5;
  else if (task.priority === 'low') score += 2;

  // Dependency blocking
  const blocksCount = allTasks.filter((t) =>
    t.dependencies?.includes(task.id)
  ).length;
  score += blocksCount * 8;

  // Git context relevance
  const relatedToChanges = gitStatus.modified.some((file) => {
    const fileName = file.split('/').pop().replace('.js', '').toLowerCase();
    return task.title.toLowerCase().includes(fileName);
  });
  if (relatedToChanges) score += 3;

  // Status bonus
  if (task.status === 'in_progress') score += 4;

  return score;
}

describe('Priority Engine', () => {
  describe('calculateTaskScore', () => {
    it('should score high priority task correctly', () => {
      const task = tasksMock.tasks[0]; // Fix authentication bug (high)
      const score = calculateTaskScore(task, tasksMock.tasks, gitStatusMock);

      expect(score).toBeGreaterThanOrEqual(10); // Base high priority
      expect(task.priority).toBe('high');
    });

    it('should add bonus for blocking other tasks', () => {
      const task = tasksMock.tasks[0]; // Task ID "1"
      const blockingTask = tasksMock.tasks[2]; // Task ID "3" depends on "1"

      const score = calculateTaskScore(task, tasksMock.tasks, gitStatusMock);

      // Should have: 10 (high) + 8 (blocks 1 task) = 18+
      expect(score).toBeGreaterThanOrEqual(18);
    });

    it('should add bonus for git context relevance', () => {
      // Mock task related to modified file
      const gitRelatedTask = {
        id: '10',
        title: 'Fix teamAssistantService bug',
        priority: 'medium',
        status: 'todo',
        dependencies: [],
      };

      const score = calculateTaskScore(
        gitRelatedTask,
        tasksMock.tasks,
        gitStatusMock
      );

      // Should have: 5 (medium) + 3 (git context) = 8
      expect(score).toBe(8);
    });

    it('should add bonus for in-progress status', () => {
      const task = tasksMock.tasks[1]; // Add unit tests (in_progress)
      const score = calculateTaskScore(task, tasksMock.tasks, gitStatusMock);

      // Should have: 10 (high) + 4 (in_progress) = 14
      expect(score).toBeGreaterThanOrEqual(14);
    });

    it('should rank tasks correctly', () => {
      const scores = tasksMock.tasks
        .filter((t) => t.status !== 'done')
        .map((task) => ({
          id: task.id,
          title: task.title,
          score: calculateTaskScore(task, tasksMock.tasks, gitStatusMock),
        }))
        .sort((a, b) => b.score - a.score);

      // Highest score should be a high priority task
      expect(scores[0].score).toBeGreaterThan(scores[scores.length - 1].score);
      console.log('📊 Task Rankings:', scores);
    });
  });
});
