import { Router, Request, Response } from 'express';
import { excelService } from '../services/excel.service';
import multer from 'multer';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Download Excel file
router.get('/download', async (req: Request, res: Response) => {
  try {
    const buffer = await excelService.getExcelBuffer();
    const filename = `hometracker-${new Date().toISOString().split('T')[0]}.xlsx`;
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (error) {
    console.error('Error downloading Excel:', error);
    res.status(500).json({ success: false, error: 'Failed to generate Excel file' });
  }
});

// Get all data as JSON (for Excel viewer in GUI)
router.get('/data', (req: Request, res: Response) => {
  try {
    const data = excelService.getAllData();
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error getting data:', error);
    res.status(500).json({ success: false, error: 'Failed to get data' });
  }
});

// Import data from Excel file
router.post('/import', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }
    
    await excelService.importFromExcel(req.file.buffer);
    res.json({ success: true, message: 'Data imported successfully' });
  } catch (error) {
    console.error('Error importing Excel:', error);
    res.status(500).json({ success: false, error: 'Failed to import Excel file' });
  }
});

// Sync/export current data to Excel
router.post('/sync', async (req: Request, res: Response) => {
  try {
    await excelService.forceSave();
    res.json({ success: true, message: 'Data synced to Excel' });
  } catch (error) {
    console.error('Error syncing Excel:', error);
    res.status(500).json({ success: false, error: 'Failed to sync data' });
  }
});

// Bulk update all data
router.put('/data', (req: Request, res: Response) => {
  try {
    const data = req.body;
    excelService.setAllData(data);
    res.json({ success: true, message: 'Data updated successfully' });
  } catch (error) {
    console.error('Error updating data:', error);
    res.status(500).json({ success: false, error: 'Failed to update data' });
  }
});

export default router;


