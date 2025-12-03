import { Router, Request, Response } from 'express';
import { excelService } from '../services/excel.service';

const router = Router();

// Get all projects
router.get('/', (req: Request, res: Response) => {
  try {
    const projects = excelService.getProjects();
    res.json({ success: true, data: projects });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get projects' });
  }
});

// Get single project
router.get('/:id', (req: Request, res: Response) => {
  try {
    const project = excelService.getProject(req.params.id);
    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }
    res.json({ success: true, data: project });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get project' });
  }
});

// Create project
router.post('/', (req: Request, res: Response) => {
  try {
    const project = excelService.createProject(req.body);
    res.status(201).json({ success: true, data: project });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to create project' });
  }
});

// Update project
router.put('/:id', (req: Request, res: Response) => {
  try {
    const project = excelService.updateProject(req.params.id, req.body);
    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }
    res.json({ success: true, data: project });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update project' });
  }
});

// Delete project
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const deleted = excelService.deleteProject(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }
    res.json({ success: true, message: 'Project deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to delete project' });
  }
});

export default router;
