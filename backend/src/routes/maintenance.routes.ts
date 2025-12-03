import { Router, Request, Response } from 'express';
import { excelService } from '../services/excel.service';

const router = Router();

// Get all maintenance tasks
router.get('/', (req: Request, res: Response) => {
  try {
    const tasks = excelService.getMaintenanceTasks();
    res.json({ success: true, data: tasks });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get maintenance tasks' });
  }
});

// Get single task
router.get('/:id', (req: Request, res: Response) => {
  try {
    const task = excelService.getMaintenanceTask(req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }
    res.json({ success: true, data: task });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get task' });
  }
});

// Create task
router.post('/', (req: Request, res: Response) => {
  try {
    const task = excelService.createMaintenanceTask(req.body);
    res.status(201).json({ success: true, data: task });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to create task' });
  }
});

// Update task
router.put('/:id', (req: Request, res: Response) => {
  try {
    const task = excelService.updateMaintenanceTask(req.params.id, req.body);
    if (!task) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }
    res.json({ success: true, data: task });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update task' });
  }
});

// Delete task
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const deleted = excelService.deleteMaintenanceTask(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }
    res.json({ success: true, message: 'Task deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to delete task' });
  }
});

export default router;
