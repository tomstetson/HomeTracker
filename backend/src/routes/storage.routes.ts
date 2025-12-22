/**
 * Storage & Backup API Routes
 * 
 * Manages storage providers and backup schedules.
 */

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { backupSchedulerService } from '../services/backup-scheduler.service';
import { storageManager } from '../services/storage-providers';

const router = Router();

/**
 * GET /api/storage/providers
 * List all configured storage providers
 */
router.get('/providers', async (req: Request, res: Response) => {
  try {
    const providers: any[] = [];
    
    for (const [name, provider] of storageManager.getAllProviders()) {
      const connected = await provider.isConnected();
      const stats = await provider.getStats();
      
      providers.push({
        name,
        type: provider.type,
        connected,
        stats,
      });
    }
    
    res.json({ success: true, providers });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/storage/providers/webdav
 * Add a WebDAV storage provider
 */
router.post('/providers/webdav', async (req: Request, res: Response) => {
  try {
    const { name, url, username, password, basePath } = req.body;
    
    if (!name || !url || !username || !password) {
      return res.status(400).json({
        success: false,
        error: 'name, url, username, and password are required',
      });
    }
    
    const result = await backupSchedulerService.addWebDAVProvider(name, {
      url,
      username,
      password,
      basePath,
    });
    
    if (!result.success) {
      return res.status(400).json(result);
    }
    
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/storage/providers/:name/test
 * Test a storage provider connection
 */
router.post('/providers/:name/test', async (req: Request, res: Response) => {
  try {
    const provider = storageManager.getProvider(req.params.name);
    
    if (!provider) {
      return res.status(404).json({
        success: false,
        error: `Provider '${req.params.name}' not found`,
      });
    }
    
    const result = await provider.testConnection();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/storage/backups
 * List all backups across all providers
 */
router.get('/backups', async (req: Request, res: Response) => {
  try {
    const backups = await backupSchedulerService.listAllBackups();
    
    res.json({
      success: true,
      backups: backups.map(b => ({
        ...b,
        sizeMB: (b.size / (1024 * 1024)).toFixed(2),
      })),
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/storage/schedules
 * List all backup schedules
 */
router.get('/schedules', (req: Request, res: Response) => {
  try {
    const schedules = backupSchedulerService.getSchedules();
    res.json({ success: true, schedules });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/storage/schedules
 * Create a backup schedule
 */
router.post('/schedules', (req: Request, res: Response) => {
  try {
    const {
      name,
      provider,
      schedule,
      enabled = true,
      retentionDays = 30,
      includeImages = false,
      compress = true,
      encrypt = false,
    } = req.body;
    
    if (!name || !provider || !schedule) {
      return res.status(400).json({
        success: false,
        error: 'name, provider, and schedule are required',
      });
    }
    
    const config = backupSchedulerService.createSchedule({
      id: uuidv4(),
      name,
      provider,
      schedule,
      enabled,
      retentionDays,
      includeImages,
      compress,
      encrypt,
    });
    
    res.json({
      success: true,
      schedule: config,
      message: `Backup schedule '${name}' created`,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/storage/schedules/:id/run
 * Run a backup immediately
 */
router.post('/schedules/:id/run', async (req: Request, res: Response) => {
  try {
    const result = await backupSchedulerService.runBackup(req.params.id);
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error,
      });
    }
    
    res.json({
      success: true,
      result,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/storage/schedules/:id/toggle
 * Enable or disable a schedule
 */
router.put('/schedules/:id/toggle', (req: Request, res: Response) => {
  try {
    const { enabled } = req.body;
    
    if (typeof enabled !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'enabled (boolean) is required',
      });
    }
    
    const success = backupSchedulerService.toggleSchedule(req.params.id, enabled);
    
    if (!success) {
      return res.status(404).json({
        success: false,
        error: 'Schedule not found',
      });
    }
    
    res.json({
      success: true,
      message: `Schedule ${enabled ? 'enabled' : 'disabled'}`,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/storage/schedules/:id
 * Delete a backup schedule
 */
router.delete('/schedules/:id', (req: Request, res: Response) => {
  try {
    const deleted = backupSchedulerService.deleteSchedule(req.params.id);
    
    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Schedule not found',
      });
    }
    
    res.json({
      success: true,
      message: 'Schedule deleted',
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/storage/backups/restore
 * Restore from a backup
 */
router.post('/backups/restore', async (req: Request, res: Response) => {
  try {
    const { provider, filename } = req.body;
    
    if (!provider || !filename) {
      return res.status(400).json({
        success: false,
        error: 'provider and filename are required',
      });
    }
    
    const result = await backupSchedulerService.restoreBackup(provider, filename);
    
    if (!result.success) {
      return res.status(400).json(result);
    }
    
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/storage/stats
 * Get storage and backup statistics
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const stats = await backupSchedulerService.getStats();
    res.json({ success: true, stats });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
