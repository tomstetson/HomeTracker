import { Router, Request, Response } from 'express';
import { excelService } from '../services/excel.service';

const router = Router();

// Get all items
router.get('/', (req: Request, res: Response) => {
  try {
    const items = excelService.getItems();
    res.json({ success: true, data: items });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get items' });
  }
});

// Get single item
router.get('/:id', (req: Request, res: Response) => {
  try {
    const item = excelService.getItem(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, error: 'Item not found' });
    }
    res.json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get item' });
  }
});

// Create item
router.post('/', (req: Request, res: Response) => {
  try {
    const item = excelService.createItem(req.body);
    res.status(201).json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to create item' });
  }
});

// Update item
router.put('/:id', (req: Request, res: Response) => {
  try {
    const item = excelService.updateItem(req.params.id, req.body);
    if (!item) {
      return res.status(404).json({ success: false, error: 'Item not found' });
    }
    res.json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update item' });
  }
});

// Delete item
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const deleted = excelService.deleteItem(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Item not found' });
    }
    res.json({ success: true, message: 'Item deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to delete item' });
  }
});

export default router;
