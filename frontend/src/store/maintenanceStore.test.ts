/**
 * MaintenanceStore Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useMaintenanceStore, MaintenanceTask } from './maintenanceStore';

// Mock storage module
vi.mock('../lib/storage', () => ({
  getCollection: vi.fn(() => []),
  saveCollection: vi.fn(),
}));

const mockTask: MaintenanceTask = {
  id: 'task-1',
  title: 'Replace HVAC Filter',
  category: 'HVAC',
  priority: 'high',
  status: 'pending',
  dueDate: '2024-12-15',
  estimatedCost: 25,
};

describe('maintenanceStore', () => {
  beforeEach(() => {
    useMaintenanceStore.setState({
      tasks: [],
      isLoading: false,
    });
  });

  describe('setTasks', () => {
    it('should set tasks array', () => {
      const tasks = [mockTask];
      useMaintenanceStore.getState().setTasks(tasks);
      
      expect(useMaintenanceStore.getState().tasks).toEqual(tasks);
    });
  });

  describe('addTask', () => {
    it('should add a task', () => {
      useMaintenanceStore.getState().addTask(mockTask);
      
      expect(useMaintenanceStore.getState().tasks).toHaveLength(1);
      expect(useMaintenanceStore.getState().tasks[0]).toEqual(mockTask);
    });

    it('should append to existing tasks', () => {
      useMaintenanceStore.setState({ tasks: [mockTask] });
      
      const newTask = { ...mockTask, id: 'task-2', title: 'New Task' };
      useMaintenanceStore.getState().addTask(newTask);
      
      expect(useMaintenanceStore.getState().tasks).toHaveLength(2);
    });
  });

  describe('updateTask', () => {
    it('should update task by id', () => {
      useMaintenanceStore.setState({ tasks: [mockTask] });
      
      useMaintenanceStore.getState().updateTask('task-1', { title: 'Updated Title' });
      
      expect(useMaintenanceStore.getState().tasks[0].title).toBe('Updated Title');
    });

    it('should not affect other tasks', () => {
      const task2 = { ...mockTask, id: 'task-2', title: 'Task 2' };
      useMaintenanceStore.setState({ tasks: [mockTask, task2] });
      
      useMaintenanceStore.getState().updateTask('task-1', { title: 'Updated' });
      
      expect(useMaintenanceStore.getState().tasks[1].title).toBe('Task 2');
    });
  });

  describe('deleteTask', () => {
    it('should remove task by id', () => {
      useMaintenanceStore.setState({ tasks: [mockTask] });
      
      useMaintenanceStore.getState().deleteTask('task-1');
      
      expect(useMaintenanceStore.getState().tasks).toHaveLength(0);
    });

    it('should only remove matching task', () => {
      const task2 = { ...mockTask, id: 'task-2' };
      useMaintenanceStore.setState({ tasks: [mockTask, task2] });
      
      useMaintenanceStore.getState().deleteTask('task-1');
      
      expect(useMaintenanceStore.getState().tasks).toHaveLength(1);
      expect(useMaintenanceStore.getState().tasks[0].id).toBe('task-2');
    });
  });

  describe('completeTask', () => {
    it('should mark task as completed', () => {
      useMaintenanceStore.setState({ tasks: [mockTask] });
      
      useMaintenanceStore.getState().completeTask('task-1');
      
      const task = useMaintenanceStore.getState().tasks[0];
      expect(task.status).toBe('completed');
      expect(task.completedDate).toBeDefined();
    });

    it('should set actual cost when provided', () => {
      useMaintenanceStore.setState({ tasks: [mockTask] });
      
      useMaintenanceStore.getState().completeTask('task-1', 30);
      
      expect(useMaintenanceStore.getState().tasks[0].actualCost).toBe(30);
    });

    it('should set notes when provided', () => {
      useMaintenanceStore.setState({ tasks: [mockTask] });
      
      useMaintenanceStore.getState().completeTask('task-1', undefined, 'Completed successfully');
      
      expect(useMaintenanceStore.getState().tasks[0].notes).toBe('Completed successfully');
    });
  });

  describe('getTasksByStatus', () => {
    beforeEach(() => {
      const tasks: MaintenanceTask[] = [
        { ...mockTask, id: '1', status: 'pending' },
        { ...mockTask, id: '2', status: 'completed' },
        { ...mockTask, id: '3', status: 'pending' },
      ];
      useMaintenanceStore.setState({ tasks });
    });

    it('should filter by status', () => {
      const pending = useMaintenanceStore.getState().getTasksByStatus('pending');
      
      expect(pending).toHaveLength(2);
    });

    it('should return empty for status with no tasks', () => {
      const inProgress = useMaintenanceStore.getState().getTasksByStatus('in-progress');
      
      expect(inProgress).toHaveLength(0);
    });
  });

  describe('getUpcomingTasks', () => {
    it('should return pending tasks due within 30 days', () => {
      const today = new Date();
      const inTwoWeeks = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000);
      
      const tasks: MaintenanceTask[] = [
        { ...mockTask, id: '1', status: 'pending', dueDate: inTwoWeeks.toISOString().split('T')[0] },
      ];
      useMaintenanceStore.setState({ tasks });
      
      const upcoming = useMaintenanceStore.getState().getUpcomingTasks();
      
      expect(upcoming).toHaveLength(1);
    });

    it('should exclude completed tasks', () => {
      const today = new Date();
      const inTwoWeeks = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000);
      
      const tasks: MaintenanceTask[] = [
        { ...mockTask, id: '1', status: 'completed', dueDate: inTwoWeeks.toISOString().split('T')[0] },
      ];
      useMaintenanceStore.setState({ tasks });
      
      const upcoming = useMaintenanceStore.getState().getUpcomingTasks();
      
      expect(upcoming).toHaveLength(0);
    });
  });

  describe('getOverdueTasks', () => {
    it('should return tasks past due date', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 7);
      
      const tasks: MaintenanceTask[] = [
        { ...mockTask, id: '1', status: 'pending', dueDate: pastDate.toISOString().split('T')[0] },
      ];
      useMaintenanceStore.setState({ tasks });
      
      const overdue = useMaintenanceStore.getState().getOverdueTasks();
      
      expect(overdue).toHaveLength(1);
    });

    it('should exclude completed tasks', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 7);
      
      const tasks: MaintenanceTask[] = [
        { ...mockTask, id: '1', status: 'completed', dueDate: pastDate.toISOString().split('T')[0] },
      ];
      useMaintenanceStore.setState({ tasks });
      
      const overdue = useMaintenanceStore.getState().getOverdueTasks();
      
      expect(overdue).toHaveLength(0);
    });
  });
});
