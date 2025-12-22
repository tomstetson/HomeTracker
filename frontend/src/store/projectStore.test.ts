import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useProjectStore } from './projectStore';

// Mock storage functions
vi.mock('../lib/storage', () => ({
  getCollection: vi.fn(() => null),
  saveCollection: vi.fn(),
}));

describe('projectStore', () => {
  beforeEach(() => {
    useProjectStore.setState({
      projects: [],
      isLoading: false,
    });
  });

  describe('addProject', () => {
    it('should add a project', () => {
      const project = {
        id: 'test-1',
        name: 'Test Project',
        status: 'backlog' as const,
        priority: 'medium' as const,
        progress: 0,
        category: 'General',
        tags: [],
      };

      useProjectStore.getState().addProject(project);
      
      const state = useProjectStore.getState();
      expect(state.projects).toHaveLength(1);
      expect(state.projects[0].name).toBe('Test Project');
    });
  });

  describe('updateProject', () => {
    it('should update project details', () => {
      useProjectStore.setState({
        projects: [{
          id: 'test-1',
          name: 'Original',
          status: 'backlog' as const,
          priority: 'low' as const,
          progress: 0,
          category: 'General',
          tags: [],
        }],
        isLoading: false,
      });

      useProjectStore.getState().updateProject('test-1', { name: 'Updated', priority: 'high' });
      
      const project = useProjectStore.getState().projects[0];
      expect(project.name).toBe('Updated');
      expect(project.priority).toBe('high');
    });
  });

  describe('deleteProject', () => {
    it('should delete a project', () => {
      useProjectStore.setState({
        projects: [
          { id: '1', name: 'Project 1', status: 'backlog' as const, priority: 'low' as const, progress: 0, category: 'A', tags: [] },
          { id: '2', name: 'Project 2', status: 'backlog' as const, priority: 'low' as const, progress: 0, category: 'B', tags: [] },
        ],
        isLoading: false,
      });

      useProjectStore.getState().deleteProject('1');
      
      const state = useProjectStore.getState();
      expect(state.projects).toHaveLength(1);
      expect(state.projects[0].id).toBe('2');
    });
  });

  describe('moveProject', () => {
    it('should change project status', () => {
      useProjectStore.setState({
        projects: [{
          id: 'test-1',
          name: 'Test',
          status: 'backlog' as const,
          priority: 'low' as const,
          progress: 0,
          category: 'General',
          tags: [],
        }],
        isLoading: false,
      });

      useProjectStore.getState().moveProject('test-1', 'in-progress');
      
      expect(useProjectStore.getState().projects[0].status).toBe('in-progress');
    });
  });

  describe('subtask management', () => {
    it('should add a subtask', () => {
      useProjectStore.setState({
        projects: [{
          id: 'test-1',
          name: 'Test',
          status: 'backlog' as const,
          priority: 'low' as const,
          progress: 0,
          category: 'General',
          tags: [],
          subtasks: [],
        }],
        isLoading: false,
      });

      useProjectStore.getState().addSubtask('test-1', { title: 'New Task', completed: false });
      
      const subtasks = useProjectStore.getState().projects[0].subtasks;
      expect(subtasks).toHaveLength(1);
      expect(subtasks![0].title).toBe('New Task');
    });

    it('should toggle subtask completion', () => {
      useProjectStore.setState({
        projects: [{
          id: 'test-1',
          name: 'Test',
          status: 'backlog' as const,
          priority: 'low' as const,
          progress: 0,
          category: 'General',
          tags: [],
          subtasks: [{ id: 's1', title: 'Task', completed: false, order: 1 }],
        }],
        isLoading: false,
      });

      useProjectStore.getState().toggleSubtask('test-1', 's1');
      expect(useProjectStore.getState().projects[0].subtasks![0].completed).toBe(true);

      useProjectStore.getState().toggleSubtask('test-1', 's1');
      expect(useProjectStore.getState().projects[0].subtasks![0].completed).toBe(false);
    });

    it('should delete a subtask', () => {
      useProjectStore.setState({
        projects: [{
          id: 'test-1',
          name: 'Test',
          status: 'backlog' as const,
          priority: 'low' as const,
          progress: 0,
          category: 'General',
          tags: [],
          subtasks: [
            { id: 's1', title: 'Task 1', completed: false, order: 1 },
            { id: 's2', title: 'Task 2', completed: false, order: 2 },
          ],
        }],
        isLoading: false,
      });

      useProjectStore.getState().deleteSubtask('test-1', 's1');
      
      const subtasks = useProjectStore.getState().projects[0].subtasks;
      expect(subtasks).toHaveLength(1);
      expect(subtasks![0].id).toBe('s2');
    });
  });

  describe('getSubtaskProgress', () => {
    it('should calculate subtask progress', () => {
      const project = {
        id: 'test-1',
        name: 'Test',
        status: 'in-progress' as const,
        priority: 'medium' as const,
        progress: 0,
        category: 'General',
        tags: [],
        subtasks: [
          { id: 's1', title: 'Task 1', completed: true, order: 1 },
          { id: 's2', title: 'Task 2', completed: true, order: 2 },
          { id: 's3', title: 'Task 3', completed: false, order: 3 },
          { id: 's4', title: 'Task 4', completed: false, order: 4 },
        ],
      };

      const progress = useProjectStore.getState().getSubtaskProgress(project);
      
      expect(progress.completed).toBe(2);
      expect(progress.total).toBe(4);
      expect(progress.percentage).toBe(50);
    });

    it('should return zero for project without subtasks', () => {
      const project = {
        id: 'test-1',
        name: 'Test',
        status: 'backlog' as const,
        priority: 'low' as const,
        progress: 0,
        category: 'General',
        tags: [],
      };

      const progress = useProjectStore.getState().getSubtaskProgress(project);
      
      expect(progress.completed).toBe(0);
      expect(progress.total).toBe(0);
      expect(progress.percentage).toBe(0);
    });
  });
});
