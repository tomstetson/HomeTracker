/**
 * Power Retention Service
 *
 * Manages data retention for power readings:
 * - Raw readings (2-second): Keep for 7 days
 * - 1-minute aggregates: Keep for 90 days
 * - Hourly summaries: Keep forever
 *
 * Runs daily cleanup to maintain storage efficiency.
 */

import { db } from './database.service';
import * as cron from 'node-cron';

// Retention periods in seconds
const RETENTION_RAW_SECONDS = 7 * 24 * 60 * 60; // 7 days
const RETENTION_1MIN_SECONDS = 90 * 24 * 60 * 60; // 90 days

interface CleanupResult {
  rawDeleted: number;
  oneMinDeleted: number;
  timestamp: string;
}

class PowerRetentionService {
  private cleanupJob: cron.ScheduledTask | null = null;
  private isEnabled: boolean = false;

  /**
   * Initialize the power retention service
   */
  initialize(): void {
    // Check if power monitoring is enabled
    this.isEnabled = process.env.POWER_MONITORING_ENABLED === 'true';

    if (!this.isEnabled) {
      console.log('🗑️ Power retention disabled (POWER_MONITORING_ENABLED != true)');
      return;
    }

    // Run cleanup daily at 3 AM (off-peak hours)
    this.cleanupJob = cron.schedule('0 3 * * *', () => {
      console.log('🗑️ Running daily power data cleanup...');
      this.runCleanup();
    });

    console.log('🗑️ Power retention service initialized');
    console.log(`   - Raw data retention: 7 days`);
    console.log(`   - 1-minute aggregate retention: 90 days`);
    console.log(`   - Hourly summaries: Forever`);
    console.log(`   - Cleanup schedule: Daily at 3:00 AM`);

    // Run initial cleanup after a short delay
    setTimeout(() => {
      this.runCleanup();
    }, 30000); // 30 seconds after startup
  }

  /**
   * Run the data cleanup process
   */
  runCleanup(): CleanupResult {
    const now = Math.floor(Date.now() / 1000);
    const result: CleanupResult = {
      rawDeleted: 0,
      oneMinDeleted: 0,
      timestamp: new Date().toISOString(),
    };

    try {
      // Clean up raw readings older than 7 days
      const rawCutoff = now - RETENTION_RAW_SECONDS;
      const rawResult = db.prepare(`
        DELETE FROM power_readings_raw WHERE ts < ?
      `).run(rawCutoff);
      result.rawDeleted = rawResult.changes;

      // Clean up 1-minute aggregates older than 90 days
      const oneMinCutoff = now - RETENTION_1MIN_SECONDS;
      const oneMinResult = db.prepare(`
        DELETE FROM power_readings_1min WHERE ts < ?
      `).run(oneMinCutoff);
      result.oneMinDeleted = oneMinResult.changes;

      // Log results
      if (result.rawDeleted > 0 || result.oneMinDeleted > 0) {
        console.log(`🗑️ Cleanup complete:`);
        console.log(`   - Raw readings deleted: ${result.rawDeleted}`);
        console.log(`   - 1-min aggregates deleted: ${result.oneMinDeleted}`);
      } else {
        console.log('🗑️ Cleanup complete: No old data to remove');
      }

      // Update cleanup stats in power_config
      this.updateCleanupStats(result);

    } catch (error) {
      console.error('🗑️ Cleanup error:', error);
    }

    return result;
  }

  /**
   * Update cleanup statistics in the database
   */
  private updateCleanupStats(result: CleanupResult): void {
    try {
      db.prepare(`
        INSERT OR REPLACE INTO power_config (key, value, updated_at)
        VALUES ('last_cleanup', ?, datetime('now'))
      `).run(JSON.stringify(result));
    } catch (error) {
      // Non-critical, just log
      console.error('🗑️ Failed to update cleanup stats:', error);
    }
  }

  /**
   * Get storage statistics for power data
   */
  getStorageStats(): {
    rawCount: number;
    rawOldestTs: number | null;
    rawNewestTs: number | null;
    rawEstimatedSizeKb: number;
    oneMinCount: number;
    oneMinOldestTs: number | null;
    oneMinNewestTs: number | null;
    oneMinEstimatedSizeKb: number;
    hourlyCount: number;
    hourlyOldestTs: number | null;
    hourlyNewestTs: number | null;
    hourlyEstimatedSizeKb: number;
    totalEstimatedSizeKb: number;
    lastCleanup: CleanupResult | null;
  } {
    // Get counts and timestamps
    const rawStats = db.prepare(`
      SELECT COUNT(*) as count, MIN(ts) as oldest, MAX(ts) as newest
      FROM power_readings_raw
    `).get() as { count: number; oldest: number | null; newest: number | null };

    const oneMinStats = db.prepare(`
      SELECT COUNT(*) as count, MIN(ts) as oldest, MAX(ts) as newest
      FROM power_readings_1min
    `).get() as { count: number; oldest: number | null; newest: number | null };

    const hourlyStats = db.prepare(`
      SELECT COUNT(*) as count, MIN(ts) as oldest, MAX(ts) as newest
      FROM power_readings_hourly
    `).get() as { count: number; oldest: number | null; newest: number | null };

    // Estimate sizes (approximate row sizes in bytes)
    const RAW_ROW_SIZE = 150; // id, ts, total, phase_a, phase_b, circuits json
    const ONE_MIN_ROW_SIZE = 200; // More aggregated fields
    const HOURLY_ROW_SIZE = 250; // Even more fields including energy_kwh

    const rawEstimatedSizeKb = Math.round((rawStats.count * RAW_ROW_SIZE) / 1024);
    const oneMinEstimatedSizeKb = Math.round((oneMinStats.count * ONE_MIN_ROW_SIZE) / 1024);
    const hourlyEstimatedSizeKb = Math.round((hourlyStats.count * HOURLY_ROW_SIZE) / 1024);

    // Get last cleanup info
    let lastCleanup: CleanupResult | null = null;
    try {
      const row = db.prepare(`
        SELECT value FROM power_config WHERE key = 'last_cleanup'
      `).get() as { value: string } | undefined;
      if (row) {
        lastCleanup = JSON.parse(row.value);
      }
    } catch {
      // Ignore parse errors
    }

    return {
      rawCount: rawStats.count,
      rawOldestTs: rawStats.oldest,
      rawNewestTs: rawStats.newest,
      rawEstimatedSizeKb,
      oneMinCount: oneMinStats.count,
      oneMinOldestTs: oneMinStats.oldest,
      oneMinNewestTs: oneMinStats.newest,
      oneMinEstimatedSizeKb,
      hourlyCount: hourlyStats.count,
      hourlyOldestTs: hourlyStats.oldest,
      hourlyNewestTs: hourlyStats.newest,
      hourlyEstimatedSizeKb,
      totalEstimatedSizeKb: rawEstimatedSizeKb + oneMinEstimatedSizeKb + hourlyEstimatedSizeKb,
      lastCleanup,
    };
  }

  /**
   * Force immediate cleanup (for manual trigger via API)
   */
  forceCleanup(): CleanupResult {
    console.log('🗑️ Manual cleanup triggered...');
    return this.runCleanup();
  }

  /**
   * Get data retention policy info
   */
  getRetentionPolicy(): {
    rawRetentionDays: number;
    oneMinRetentionDays: number;
    hourlyRetention: string;
    cleanupSchedule: string;
  } {
    return {
      rawRetentionDays: 7,
      oneMinRetentionDays: 90,
      hourlyRetention: 'forever',
      cleanupSchedule: 'Daily at 3:00 AM',
    };
  }

  /**
   * Stop the retention service
   */
  stop(): void {
    if (this.cleanupJob) {
      this.cleanupJob.stop();
      this.cleanupJob = null;
    }
    console.log('🗑️ Power retention service stopped');
  }
}

// Singleton instance
export const powerRetentionService = new PowerRetentionService();
