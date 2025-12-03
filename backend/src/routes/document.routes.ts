import { Router, Request, Response } from 'express';
import { excelService } from '../services/excel.service';

const router = Router();

// Get all documents
router.get('/', (req: Request, res: Response) => {
  try {
    const documents = excelService.getDocuments();
    res.json({ success: true, data: documents });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get documents' });
  }
});

// Get single document
router.get('/:id', (req: Request, res: Response) => {
  try {
    const doc = excelService.getDocument(req.params.id);
    if (!doc) {
      return res.status(404).json({ success: false, error: 'Document not found' });
    }
    res.json({ success: true, data: doc });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get document' });
  }
});

// Create document
router.post('/', (req: Request, res: Response) => {
  try {
    const doc = excelService.createDocument(req.body);
    res.status(201).json({ success: true, data: doc });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to create document' });
  }
});

// Update document
router.put('/:id', (req: Request, res: Response) => {
  try {
    const doc = excelService.updateDocument(req.params.id, req.body);
    if (!doc) {
      return res.status(404).json({ success: false, error: 'Document not found' });
    }
    res.json({ success: true, data: doc });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update document' });
  }
});

// Delete document
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const deleted = excelService.deleteDocument(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Document not found' });
    }
    res.json({ success: true, message: 'Document deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to delete document' });
  }
});

export default router;
