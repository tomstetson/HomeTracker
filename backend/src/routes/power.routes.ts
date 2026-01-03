/**
 * Power Monitoring API Routes
 *
 * Manages Emporia Vue power monitoring configuration and data access.
 */

import { Router, Request, Response } from 'express';
import { db } from '../services/database.service';
import { powerAggregationService } from '../services/power-aggregation.service';
import { powerRetentionService } from '../services/power-retention.service';

const router = Router();

/**
 * GET /api/power/config
 * Get power monitoring configuration
 */
router.get('/config', (req: Request, res: Response) => {
  try {
    const config: Record<string, string | null> = {};
    const keys = ['emporia_email', 'emporia_password', 'device_gid', 'enabled'];

    for (const key of keys) {
      const row = db.prepare('SELECT value FROM power_config WHERE key = ?').get(key) as { value: string } | undefined;
      // Mask password for security
      if (key === 'emporia_password' && row?.value) {
        config[key] = '********';
      } else {
        config[key] = row?.value || null;
      }
    }

    // Get learning status
    const learningStatus = db.prepare(`
      SELECT * FROM power_learning_status WHERE id = 1
    `).get() as {
      learning_mode: number;
      learning_progress: number;
      first_reading_ts: number | null;
      total_readings: number;
      last_updated: string | null;
    } | undefined;

    res.json({
      success: true,
      config,
      learningStatus: learningStatus || {
        learning_mode: 1,
        learning_progress: 0,
        first_reading_ts: null,
        total_readings: 0,
        last_updated: null,
      },
    });
  } catch (error: any) {
    console.error('Error getting power config:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/power/config
 * Update power monitoring configuration
 */
router.post('/config', (req: Request, res: Response) => {
  try {
    const { email, password, enabled } = req.body;

    // Validate inputs
    if (enabled && (!email || !password)) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required when enabling power monitoring',
      });
    }

    // Update configuration
    const updates: Array<{ key: string; value: string }> = [];

    if (email !== undefined) {
      updates.push({ key: 'emporia_email', value: email });
    }

    if (password !== undefined && password !== '********') {
      updates.push({ key: 'emporia_password', value: password });
    }

    if (enabled !== undefined) {
      updates.push({ key: 'enabled', value: enabled ? 'true' : 'false' });
    }

    const stmt = db.prepare(`
      INSERT OR REPLACE INTO power_config (key, value, updated_at)
      VALUES (?, ?, datetime('now'))
    `);

    for (const update of updates) {
      stmt.run(update.key, update.value);
    }

    res.json({
      success: true,
      message: 'Power configuration updated',
      requiresRestart: true,
    });
  } catch (error: any) {
    console.error('Error updating power config:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/power/test-connection
 * Test Emporia Vue connection (placeholder - actual test requires Python worker)
 */
router.post('/test-connection', async (req: Request, res: Response) => {
  try {
    // Get current config
    const emailRow = db.prepare('SELECT value FROM power_config WHERE key = ?').get('emporia_email') as { value: string } | undefined;
    const passwordRow = db.prepare('SELECT value FROM power_config WHERE key = ?').get('emporia_password') as { value: string } | undefined;

    if (!emailRow?.value || !passwordRow?.value) {
      return res.json({
        success: false,
        connected: false,
        error: 'Emporia credentials not configured',
      });
    }

    // Check if we have recent readings (within last 5 minutes)
    const fiveMinutesAgo = Math.floor(Date.now() / 1000) - 300;
    const recentReading = db.prepare(`
      SELECT ts FROM power_readings_raw WHERE ts > ? ORDER BY ts DESC LIMIT 1
    `).get(fiveMinutesAgo) as { ts: number } | undefined;

    if (recentReading) {
      res.json({
        success: true,
        connected: true,
        lastReading: new Date(recentReading.ts * 1000).toISOString(),
        message: 'Emporia Vue connection active',
      });
    } else {
      // Check if Python worker is running by looking at any readings
      const anyReading = db.prepare(`
        SELECT ts FROM power_readings_raw ORDER BY ts DESC LIMIT 1
      `).get() as { ts: number } | undefined;

      if (anyReading) {
        const lastReadingTime = new Date(anyReading.ts * 1000);
        res.json({
          success: true,
          connected: false,
          lastReading: lastReadingTime.toISOString(),
          message: `Last reading was ${Math.floor((Date.now() - anyReading.ts * 1000) / 60000)} minutes ago`,
        });
      } else {
        res.json({
          success: true,
          connected: false,
          lastReading: null,
          message: 'No readings yet. Ensure POWER_MONITORING_ENABLED=true in docker-compose',
        });
      }
    }
  } catch (error: any) {
    console.error('Error testing power connection:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/power/stats
 * Get power monitoring statistics
 */
router.get('/stats', (req: Request, res: Response) => {
  try {
    // Get storage stats from retention service
    const storageStats = powerRetentionService.getStorageStats();

    // Get aggregation stats
    const aggregationStats = powerAggregationService.getStats();

    // Get retention policy
    const retentionPolicy = powerRetentionService.getRetentionPolicy();

    // Get latest reading
    const latestReading = db.prepare(`
      SELECT ts, total, phase_a, phase_b, circuits
      FROM power_readings_raw
      ORDER BY ts DESC
      LIMIT 1
    `).get() as {
      ts: number;
      total: number;
      phase_a: number | null;
      phase_b: number | null;
      circuits: string | null;
    } | undefined;

    // Get today's energy usage
    const todayStart = Math.floor(new Date().setHours(0, 0, 0, 0) / 1000);
    const todayEnergy = db.prepare(`
      SELECT SUM(total_kwh) as kwh FROM power_readings_hourly WHERE ts >= ?
    `).get(todayStart) as { kwh: number | null };

    res.json({
      success: true,
      storage: storageStats,
      aggregation: aggregationStats,
      retention: retentionPolicy,
      latestReading: latestReading ? {
        timestamp: new Date(latestReading.ts * 1000).toISOString(),
        totalWatts: latestReading.total,
        phaseA: latestReading.phase_a,
        phaseB: latestReading.phase_b,
        circuits: latestReading.circuits ? JSON.parse(latestReading.circuits) : null,
      } : null,
      todayEnergyKwh: todayEnergy?.kwh || 0,
    });
  } catch (error: any) {
    console.error('Error getting power stats:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/power/readings/latest
 * Get latest power readings
 */
router.get('/readings/latest', (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 60, 300);

    const readings = db.prepare(`
      SELECT ts, total, phase_a, phase_b, circuits
      FROM power_readings_raw
      ORDER BY ts DESC
      LIMIT ?
    `).all(limit) as Array<{
      ts: number;
      total: number;
      phase_a: number | null;
      phase_b: number | null;
      circuits: string | null;
    }>;

    res.json({
      success: true,
      readings: readings.map(r => ({
        timestamp: new Date(r.ts * 1000).toISOString(),
        ts: r.ts,
        total: r.total,
        phaseA: r.phase_a,
        phaseB: r.phase_b,
        circuits: r.circuits ? JSON.parse(r.circuits) : null,
      })),
    });
  } catch (error: any) {
    console.error('Error getting latest readings:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/power/readings/hourly
 * Get hourly power summaries
 */
router.get('/readings/hourly', (req: Request, res: Response) => {
  try {
    const hours = Math.min(parseInt(req.query.hours as string) || 24, 168); // Max 1 week
    const startTs = Math.floor(Date.now() / 1000) - (hours * 3600);

    const readings = db.prepare(`
      SELECT ts, total_avg, total_min, total_max, total_kwh,
             phase_a_avg, phase_b_avg, peak_circuit, peak_circuit_watts
      FROM power_readings_hourly
      WHERE ts >= ?
      ORDER BY ts ASC
    `).all(startTs) as Array<{
      ts: number;
      total_avg: number;
      total_min: number;
      total_max: number;
      total_kwh: number;
      phase_a_avg: number | null;
      phase_b_avg: number | null;
      peak_circuit: string | null;
      peak_circuit_watts: number | null;
    }>;

    res.json({
      success: true,
      readings: readings.map(r => ({
        timestamp: new Date(r.ts * 1000).toISOString(),
        ts: r.ts,
        avgWatts: r.total_avg,
        minWatts: r.total_min,
        maxWatts: r.total_max,
        kwh: r.total_kwh,
        phaseAAvg: r.phase_a_avg,
        phaseBAvg: r.phase_b_avg,
        peakCircuit: r.peak_circuit,
        peakCircuitWatts: r.peak_circuit_watts,
      })),
    });
  } catch (error: any) {
    console.error('Error getting hourly readings:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/power/cleanup
 * Manually trigger data cleanup
 */
router.post('/cleanup', (req: Request, res: Response) => {
  try {
    const result = powerRetentionService.forceCleanup();
    res.json({
      success: true,
      result,
    });
  } catch (error: any) {
    console.error('Error running cleanup:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
