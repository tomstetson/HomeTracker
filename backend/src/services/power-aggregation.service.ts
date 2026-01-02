/**
 * Power Aggregation Service
 *
 * Handles downsampling of power readings:
 * - Every minute: Aggregate 2-second raw readings into 1-minute summaries
 * - Every hour: Aggregate 1-minute readings into hourly summaries
 *
 * This service implements the data retention strategy for efficient long-term storage.
 */

import { db } from './database.service';
import * as cron from 'node-cron';

interface RawReading {
  id: number;
  ts: number;
  total: number;
  phase_a: number | null;
  phase_b: number | null;
  circuits: string | null;
}

interface CircuitAggregates {
  [circuitName: string]: {
    sum: number;
    count: number;
  };
}

class PowerAggregationService {
  private minuteJob: cron.ScheduledTask | null = null;
  private hourlyJob: cron.ScheduledTask | null = null;
  private isEnabled: boolean = false;

  /**
   * Initialize the power aggregation scheduler
   */
  initialize(): void {
    // Check if power monitoring is enabled
    this.isEnabled = process.env.POWER_MONITORING_ENABLED === 'true';

    if (!this.isEnabled) {
      console.log('⚡ Power aggregation disabled (POWER_MONITORING_ENABLED != true)');
      return;
    }

    // Run minute aggregation every minute at :00 seconds
    this.minuteJob = cron.schedule('0 * * * * *', () => {
      this.aggregateMinuteData();
    });

    // Run hourly aggregation at the start of each hour
    this.hourlyJob = cron.schedule('0 0 * * * *', () => {
      this.aggregateHourlyData();
    });

    console.log('⚡ Power aggregation service initialized');
    console.log('   - Minute aggregation: Every minute at :00');
    console.log('   - Hourly aggregation: Every hour at :00');

    // Run initial aggregation after a short delay (catch up on missed aggregations)
    setTimeout(() => {
      this.catchUpAggregations();
    }, 10000);
  }

  /**
   * Catch up on any missed aggregations (e.g., after restart)
   */
  private async catchUpAggregations(): Promise<void> {
    try {
      console.log('⚡ Checking for missed aggregations...');

      // Find oldest un-aggregated raw reading
      const oldestRaw = db.prepare(`
        SELECT MIN(ts) as oldest_ts FROM power_readings_raw
      `).get() as { oldest_ts: number | null };

      if (!oldestRaw?.oldest_ts) {
        console.log('⚡ No raw readings to aggregate');
        return;
      }

      // Find newest 1-minute aggregate
      const newest1min = db.prepare(`
        SELECT MAX(ts) as newest_ts FROM power_readings_1min
      `).get() as { newest_ts: number | null };

      const startTs = newest1min?.newest_ts
        ? newest1min.newest_ts + 60
        : oldestRaw.oldest_ts;

      const now = Math.floor(Date.now() / 1000);
      const minutesToAggregate = Math.floor((now - startTs) / 60);

      if (minutesToAggregate > 0) {
        console.log(`⚡ Catching up on ${minutesToAggregate} minute(s) of aggregation...`);

        // Aggregate in batches to avoid blocking
        for (let i = 0; i < minutesToAggregate; i++) {
          const minuteStart = startTs + (i * 60);
          this.aggregateMinuteWindow(minuteStart, minuteStart + 60);
        }

        console.log('⚡ Minute catch-up complete');
      }

      // Similar catch-up for hourly aggregations
      const newestHourly = db.prepare(`
        SELECT MAX(ts) as newest_ts FROM power_readings_hourly
      `).get() as { newest_ts: number | null };

      const hourlyStartTs = newestHourly?.newest_ts
        ? newestHourly.newest_ts + 3600
        : Math.floor(oldestRaw.oldest_ts / 3600) * 3600;

      const hoursToAggregate = Math.floor((now - hourlyStartTs) / 3600);

      if (hoursToAggregate > 0) {
        console.log(`⚡ Catching up on ${hoursToAggregate} hour(s) of aggregation...`);

        for (let i = 0; i < hoursToAggregate; i++) {
          const hourStart = hourlyStartTs + (i * 3600);
          this.aggregateHourlyWindow(hourStart, hourStart + 3600);
        }

        console.log('⚡ Hourly catch-up complete');
      }

    } catch (error) {
      console.error('⚡ Error during catch-up aggregation:', error);
    }
  }

  /**
   * Aggregate the previous minute's raw readings into a 1-minute summary
   */
  private aggregateMinuteData(): void {
    try {
      const now = Math.floor(Date.now() / 1000);
      const minuteStart = Math.floor(now / 60) * 60 - 60; // Previous minute
      const minuteEnd = minuteStart + 60;

      this.aggregateMinuteWindow(minuteStart, minuteEnd);
    } catch (error) {
      console.error('⚡ Minute aggregation error:', error);
    }
  }

  /**
   * Aggregate raw readings within a specific minute window
   */
  private aggregateMinuteWindow(startTs: number, endTs: number): void {
    // Get all raw readings for this minute
    const readings = db.prepare(`
      SELECT id, ts, total, phase_a, phase_b, circuits
      FROM power_readings_raw
      WHERE ts >= ? AND ts < ?
      ORDER BY ts
    `).all(startTs, endTs) as RawReading[];

    if (readings.length === 0) {
      return;
    }

    // Check if we already have an aggregate for this minute
    const existing = db.prepare(`
      SELECT id FROM power_readings_1min WHERE ts = ?
    `).get(startTs);

    if (existing) {
      return; // Already aggregated
    }

    // Calculate aggregates
    let totalSum = 0, totalMin = Infinity, totalMax = -Infinity;
    let phaseASum = 0, phaseACount = 0;
    let phaseBSum = 0, phaseBCount = 0;
    const circuitAggregates: CircuitAggregates = {};

    for (const reading of readings) {
      // Total power
      totalSum += reading.total;
      totalMin = Math.min(totalMin, reading.total);
      totalMax = Math.max(totalMax, reading.total);

      // Phase A
      if (reading.phase_a !== null) {
        phaseASum += reading.phase_a;
        phaseACount++;
      }

      // Phase B
      if (reading.phase_b !== null) {
        phaseBSum += reading.phase_b;
        phaseBCount++;
      }

      // Circuits
      if (reading.circuits) {
        try {
          const circuits = JSON.parse(reading.circuits) as Record<string, number>;
          for (const [name, value] of Object.entries(circuits)) {
            if (!circuitAggregates[name]) {
              circuitAggregates[name] = { sum: 0, count: 0 };
            }
            circuitAggregates[name].sum += value;
            circuitAggregates[name].count++;
          }
        } catch {
          // Skip invalid JSON
        }
      }
    }

    // Calculate averages
    const sampleCount = readings.length;
    const totalAvg = totalSum / sampleCount;
    const phaseAAvg = phaseACount > 0 ? phaseASum / phaseACount : null;
    const phaseBAvg = phaseBCount > 0 ? phaseBSum / phaseBCount : null;

    // Calculate circuit averages
    const circuitsAvg: Record<string, number> = {};
    for (const [name, agg] of Object.entries(circuitAggregates)) {
      circuitsAvg[name] = Math.round((agg.sum / agg.count) * 100) / 100;
    }

    // Insert 1-minute aggregate
    db.prepare(`
      INSERT INTO power_readings_1min
        (ts, total_avg, total_min, total_max, phase_a_avg, phase_b_avg, sample_count, circuits_avg)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      startTs,
      Math.round(totalAvg * 100) / 100,
      Math.round(totalMin * 100) / 100,
      Math.round(totalMax * 100) / 100,
      phaseAAvg !== null ? Math.round(phaseAAvg * 100) / 100 : null,
      phaseBAvg !== null ? Math.round(phaseBAvg * 100) / 100 : null,
      sampleCount,
      Object.keys(circuitsAvg).length > 0 ? JSON.stringify(circuitsAvg) : null
    );
  }

  /**
   * Aggregate the previous hour's 1-minute readings into an hourly summary
   */
  private aggregateHourlyData(): void {
    try {
      const now = Math.floor(Date.now() / 1000);
      const hourStart = Math.floor(now / 3600) * 3600 - 3600; // Previous hour
      const hourEnd = hourStart + 3600;

      this.aggregateHourlyWindow(hourStart, hourEnd);
    } catch (error) {
      console.error('⚡ Hourly aggregation error:', error);
    }
  }

  /**
   * Aggregate 1-minute readings within a specific hour window
   */
  private aggregateHourlyWindow(startTs: number, endTs: number): void {
    // Get all 1-minute readings for this hour
    const readings = db.prepare(`
      SELECT ts, total_avg, total_min, total_max, phase_a_avg, phase_b_avg, sample_count, circuits_avg
      FROM power_readings_1min
      WHERE ts >= ? AND ts < ?
      ORDER BY ts
    `).all(startTs, endTs) as Array<{
      ts: number;
      total_avg: number;
      total_min: number;
      total_max: number;
      phase_a_avg: number | null;
      phase_b_avg: number | null;
      sample_count: number;
      circuits_avg: string | null;
    }>;

    if (readings.length === 0) {
      return;
    }

    // Check if we already have an aggregate for this hour
    const existing = db.prepare(`
      SELECT id FROM power_readings_hourly WHERE ts = ?
    `).get(startTs);

    if (existing) {
      return; // Already aggregated
    }

    // Calculate hourly aggregates
    let totalSum = 0, totalMin = Infinity, totalMax = -Infinity;
    let phaseASum = 0, phaseACount = 0;
    let phaseBSum = 0, phaseBCount = 0;
    let totalSamples = 0;
    const circuitAggregates: CircuitAggregates = {};

    for (const reading of readings) {
      // Weight by sample count for accurate averaging
      totalSum += reading.total_avg * reading.sample_count;
      totalSamples += reading.sample_count;
      totalMin = Math.min(totalMin, reading.total_min);
      totalMax = Math.max(totalMax, reading.total_max);

      // Phase A
      if (reading.phase_a_avg !== null) {
        phaseASum += reading.phase_a_avg * reading.sample_count;
        phaseACount += reading.sample_count;
      }

      // Phase B
      if (reading.phase_b_avg !== null) {
        phaseBSum += reading.phase_b_avg * reading.sample_count;
        phaseBCount += reading.sample_count;
      }

      // Circuits
      if (reading.circuits_avg) {
        try {
          const circuits = JSON.parse(reading.circuits_avg) as Record<string, number>;
          for (const [name, value] of Object.entries(circuits)) {
            if (!circuitAggregates[name]) {
              circuitAggregates[name] = { sum: 0, count: 0 };
            }
            circuitAggregates[name].sum += value * reading.sample_count;
            circuitAggregates[name].count += reading.sample_count;
          }
        } catch {
          // Skip invalid JSON
        }
      }
    }

    // Calculate averages
    const totalAvg = totalSamples > 0 ? totalSum / totalSamples : 0;
    const phaseAAvg = phaseACount > 0 ? phaseASum / phaseACount : null;
    const phaseBAvg = phaseBCount > 0 ? phaseBSum / phaseBCount : null;

    // Find peak circuit
    let peakCircuit: string | null = null;
    let peakCircuitWatts: number | null = null;
    for (const [name, agg] of Object.entries(circuitAggregates)) {
      const avg = agg.sum / agg.count;
      if (peakCircuitWatts === null || avg > peakCircuitWatts) {
        peakCircuit = name;
        peakCircuitWatts = avg;
      }
    }

    // Calculate energy (kWh) for this hour
    // Average power (W) * 1 hour / 1000 = kWh
    const totalKwh = totalAvg / 1000;

    // Insert hourly aggregate (matches schema: total_kwh, peak_circuit, peak_circuit_watts, anomaly_count)
    db.prepare(`
      INSERT INTO power_readings_hourly
        (ts, total_avg, total_min, total_max, total_kwh, phase_a_avg, phase_b_avg,
         peak_circuit, peak_circuit_watts, anomaly_count)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      startTs,
      Math.round(totalAvg * 100) / 100,
      Math.round(totalMin * 100) / 100,
      Math.round(totalMax * 100) / 100,
      Math.round(totalKwh * 1000) / 1000, // 3 decimal places for kWh
      phaseAAvg !== null ? Math.round(phaseAAvg * 100) / 100 : null,
      phaseBAvg !== null ? Math.round(phaseBAvg * 100) / 100 : null,
      peakCircuit,
      peakCircuitWatts !== null ? Math.round(peakCircuitWatts * 100) / 100 : null,
      0 // anomaly_count - will be updated by learning service in Phase 3
    );

    console.log(`⚡ Hourly aggregate created: ${new Date(startTs * 1000).toISOString()} - ${totalAvg.toFixed(0)}W avg, ${totalKwh.toFixed(3)} kWh`);
  }

  /**
   * Get aggregation statistics
   */
  getStats(): {
    rawCount: number;
    oneMinCount: number;
    hourlyCount: number;
    oldestRaw: string | null;
    newestRaw: string | null;
    oldestHourly: string | null;
    newestHourly: string | null;
  } {
    const rawCount = (db.prepare('SELECT COUNT(*) as count FROM power_readings_raw').get() as { count: number }).count;
    const oneMinCount = (db.prepare('SELECT COUNT(*) as count FROM power_readings_1min').get() as { count: number }).count;
    const hourlyCount = (db.prepare('SELECT COUNT(*) as count FROM power_readings_hourly').get() as { count: number }).count;

    const oldestRaw = db.prepare('SELECT MIN(ts) as ts FROM power_readings_raw').get() as { ts: number | null };
    const newestRaw = db.prepare('SELECT MAX(ts) as ts FROM power_readings_raw').get() as { ts: number | null };
    const oldestHourly = db.prepare('SELECT MIN(ts) as ts FROM power_readings_hourly').get() as { ts: number | null };
    const newestHourly = db.prepare('SELECT MAX(ts) as ts FROM power_readings_hourly').get() as { ts: number | null };

    return {
      rawCount,
      oneMinCount,
      hourlyCount,
      oldestRaw: oldestRaw.ts ? new Date(oldestRaw.ts * 1000).toISOString() : null,
      newestRaw: newestRaw.ts ? new Date(newestRaw.ts * 1000).toISOString() : null,
      oldestHourly: oldestHourly.ts ? new Date(oldestHourly.ts * 1000).toISOString() : null,
      newestHourly: newestHourly.ts ? new Date(newestHourly.ts * 1000).toISOString() : null,
    };
  }

  /**
   * Stop the aggregation scheduler
   */
  stop(): void {
    if (this.minuteJob) {
      this.minuteJob.stop();
      this.minuteJob = null;
    }
    if (this.hourlyJob) {
      this.hourlyJob.stop();
      this.hourlyJob = null;
    }
    console.log('⚡ Power aggregation service stopped');
  }
}

// Singleton instance
export const powerAggregationService = new PowerAggregationService();
