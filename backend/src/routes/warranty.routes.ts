import { Router, Request, Response } from 'express';
import { excelService } from '../services/excel.service';

const router = Router();

// Get all warranties
router.get('/', (req: Request, res: Response) => {
  try {
    const warranties = excelService.getWarranties();
    res.json({ success: true, data: warranties });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get warranties' });
  }
});

// Get single warranty
router.get('/:id', (req: Request, res: Response) => {
  try {
    const warranty = excelService.getWarranty(req.params.id);
    if (!warranty) {
      return res.status(404).json({ success: false, error: 'Warranty not found' });
    }
    res.json({ success: true, data: warranty });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get warranty' });
  }
});

// Create warranty
router.post('/', (req: Request, res: Response) => {
  try {
    const warranty = excelService.createWarranty(req.body);
    res.status(201).json({ success: true, data: warranty });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to create warranty' });
  }
});

// Update warranty
router.put('/:id', (req: Request, res: Response) => {
  try {
    const warranty = excelService.updateWarranty(req.params.id, req.body);
    if (!warranty) {
      return res.status(404).json({ success: false, error: 'Warranty not found' });
    }
    res.json({ success: true, data: warranty });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update warranty' });
  }
});

// Delete warranty
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const deleted = excelService.deleteWarranty(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Warranty not found' });
    }
    res.json({ success: true, message: 'Warranty deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to delete warranty' });
  }
});

export default router;
