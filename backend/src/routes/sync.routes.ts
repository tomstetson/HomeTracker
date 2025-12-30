/**
 * Sync API Routes
 * 
 * Handles real-time data synchronization between frontend and backend.
 * Ensures both JSON storage and Excel file are kept in sync.
 */

import { Router, Request, Response } from 'express';
import { excelService } from '../services/excel.service';
import fs from 'fs';
import path from 'path';

const router = Router();

const DATA_DIR = path.join(__dirname, '../../data');
const JSON_FILE = path.join(DATA_DIR, 'hometracker.json');

// Track sync history
interface SyncLog {
  timestamp: string;
  source: 'client' | 'server';
  collections: string[];
  itemCount: number;
}

let syncHistory: SyncLog[] = [];
const MAX_HISTORY = 100;

// GET /api/sync - Get all data from server
router.get('/', async (req: Request, res: Response) => {
  try {
    const data = excelService.getAllData();
    
    res.json({
      success: true,
      data,
      timestamp: new Date().toISOString(),
      serverVersion: '1.0.0',
    });
  } catch (error) {
    console.error('Sync GET error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve data',
    });
  }
});

// POST /api/sync - Sync data from client to server
router.post('/', async (req: Request, res: Response) => {
  try {
    const clientData = req.body;
    
    if (!clientData) {
      return res.status(400).json({
        success: false,
        error: 'No data provided',
      });
    }

    // Update each collection
    const collections = ['projects', 'items', 'vendors', 'warranties', 'maintenance', 'documents'];
    let totalItems = 0;
    const updatedCollections: string[] = [];

    for (const collection of collections) {
      if (clientData[collection] && Array.isArray(clientData[collection])) {
        excelService.updateCollection(collection, clientData[collection]);
        totalItems += clientData[collection].length;
        updatedCollections.push(collection);
      }
    }

    // Update settings if provided
    if (clientData.settings) {
      excelService.updateSettings(clientData.settings);
    }

    // Update homeVitals if provided
    if (clientData.homeVitals) {
      excelService.updateCollection('homeVitals', clientData.homeVitals);
    }

    // Force save to both JSON and Excel
    await excelService.forceSave();

    // Log sync
    const syncLog: SyncLog = {
      timestamp: new Date().toISOString(),
      source: 'client',
      collections: updatedCollections,
      itemCount: totalItems,
    };
    syncHistory.unshift(syncLog);
    if (syncHistory.length > MAX_HISTORY) {
      syncHistory = syncHistory.slice(0, MAX_HISTORY);
    }

    res.json({
      success: true,
      message: 'Data synced successfully',
      timestamp: new Date().toISOString(),
      itemsProcessed: totalItems,
      collectionsUpdated: updatedCollections,
    });
  } catch (error) {
    console.error('Sync POST error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to sync data',
    });
  }
});

// GET /api/sync/status - Get sync status
router.get('/status', (req: Request, res: Response) => {
  try {
    const stats = fs.existsSync(JSON_FILE) ? fs.statSync(JSON_FILE) : null;
    
    res.json({
      success: true,
      status: {
        isHealthy: true,
        lastModified: stats?.mtime?.toISOString() || null,
        fileSize: stats?.size || 0,
        recentSyncs: syncHistory.slice(0, 10),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get status',
    });
  }
});

// GET /api/sync/history - Get sync history
router.get('/history', (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 20;
  
  res.json({
    success: true,
    history: syncHistory.slice(0, limit),
  });
});

export default router;











