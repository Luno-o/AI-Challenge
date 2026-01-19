/**
 * @jest-environment node
 */

import { describe, it, expect } from '@jest/globals';
import tasksMock from './mocks/tasks.mock.json' assert { type: 'json' };

describe('Team Assistant API', () => {
  describe('Task Operations', () => {
    it('should list all tasks', () => {
      const tasks = tasksMock.tasks;

      expect(tasks).toBeInstanceOf(Array);
      expect(tasks.length).toBeGreaterThan(0);
    });

    it('should filter tasks by priority', () => {
      const highTasks = tasksMock.tasks.filter((t) => t.priority === 'high');

      expect(highTasks.length).toBeGreaterThan(0);
      highTasks.forEach((task) => {
        expect(task.priority).toBe('high');
      });
    });

    it('should filter tasks by status', () => {
      const todoTasks = tasksMock.tasks.filter((t) => t.status === 'todo');

      expect(todoTasks.length).toBeGreaterThan(0);
      todoTasks.forEach((task) => {
        expect(task.status).toBe('todo');
      });
    });

    it('should exclude done tasks from active list', () => {
      const activeTasks = tasksMock.tasks.filter((t) => t.status !== 'done');

      expect(activeTasks.length).toBeLessThan(tasksMock.tasks.length);
      activeTasks.forEach((task) => {
        expect(task.status).not.toBe('done');
      });
    });
  });

  describe('Task Dependencies', () => {
    it('should identify blocking tasks', () => {
      const task1 = tasksMock.tasks.find((t) => t.id === '1');
      const dependentTasks = tasksMock.tasks.filter((t) =>
        t.dependencies?.includes('1')
      );

      expect(dependentTasks.length).toBeGreaterThan(0);
      console.log(`Task "${task1.title}" blocks ${dependentTasks.length} tasks`);
    });
  });

  describe('Project Status', () => {
    it('should calculate correct statistics', () => {
      const stats = {
        total: tasksMock.tasks.length,
        done: tasksMock.tasks.filter((t) => t.status === 'done').length,
        in_progress: tasksMock.tasks.filter((t) => t.status === 'in_progress')
          .length,
        todo: tasksMock.tasks.filter((t) => t.status === 'todo').length,
        high_priority: tasksMock.tasks.filter(
          (t) => t.priority === 'high' && t.status !== 'done'
        ).length,
      };

      expect(stats.total).toBe(5);
      expect(stats.done + stats.in_progress + stats.todo).toBe(stats.total);
      expect(stats.high_priority).toBeGreaterThanOrEqual(0);

      console.log('📊 Project Stats:', stats);
    });
  });
});
