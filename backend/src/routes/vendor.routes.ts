import { Router, Request, Response } from 'express';
import { excelService } from '../services/excel.service';

const router = Router();

// Get all vendors
router.get('/', (req: Request, res: Response) => {
  try {
    const vendors = excelService.getVendors();
    res.json({ success: true, data: vendors });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get vendors' });
  }
});

// Get single vendor
router.get('/:id', (req: Request, res: Response) => {
  try {
    const vendor = excelService.getVendor(req.params.id);
    if (!vendor) {
      return res.status(404).json({ success: false, error: 'Vendor not found' });
    }
    res.json({ success: true, data: vendor });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get vendor' });
  }
});

// Create vendor
router.post('/', (req: Request, res: Response) => {
  try {
    const vendor = excelService.createVendor(req.body);
    res.status(201).json({ success: true, data: vendor });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to create vendor' });
  }
});

// Update vendor
router.put('/:id', (req: Request, res: Response) => {
  try {
    const vendor = excelService.updateVendor(req.params.id, req.body);
    if (!vendor) {
      return res.status(404).json({ success: false, error: 'Vendor not found' });
    }
    res.json({ success: true, data: vendor });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update vendor' });
  }
});

// Delete vendor
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const deleted = excelService.deleteVendor(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Vendor not found' });
    }
    res.json({ success: true, message: 'Vendor deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to delete vendor' });
  }
});

export default router;
