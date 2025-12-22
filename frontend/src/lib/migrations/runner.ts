/**
 * Migration Runner
 * 
 * Executes pending migrations in order and tracks history.
 */

import { compareVersions, getPendingMigrations, getLatestVersion } from './index';

export interface MigrationResult {
  success: boolean;
  fromVersion: string;
  toVersion: string;
  migrationsRun: string[];
  error?: string;
}

/**
 * Run all pending migrations on the data
 * Returns the migrated data and result info
 */
export const runMigrations = (data: any): { data: any; result: MigrationResult } => {
  const currentVersion = data.version || '1.0.0';
  const pendingMigrations = getPendingMigrations(currentVersion);
  
  const result: MigrationResult = {
    success: true,
    fromVersion: currentVersion,
    toVersion: currentVersion,
    migrationsRun: [],
  };
  
  if (pendingMigrations.length === 0) {
    console.log('✅ Data is up to date (version ' + currentVersion + ')');
    return { data, result };
  }
  
  console.log(`🔄 Running ${pendingMigrations.length} migration(s) from v${currentVersion}...`);
  
  let migratedData = { ...data };
  
  for (const migration of pendingMigrations) {
    try {
      console.log(`  → Migrating to v${migration.version}: ${migration.description}`);
      migratedData = migration.migrate(migratedData);
      result.migrationsRun.push(`${migration.version}: ${migration.description}`);
      result.toVersion = migration.version;
    } catch (error: any) {
      console.error(`❌ Migration ${migration.version} failed:`, error);
      result.success = false;
      result.error = `Migration ${migration.version} failed: ${error.message || String(error)}`;
      
      // Store migration error in data for user notification
      migratedData._migrationError = {
        version: migration.version,
        error: error.message || String(error),
        timestamp: new Date().toISOString(),
      };
      
      // Stop migration chain on error
      break;
    }
  }
  
  // Add migration history entry
  if (result.migrationsRun.length > 0) {
    if (!migratedData._migrationHistory) {
      migratedData._migrationHistory = [];
    }
    
    migratedData._migrationHistory.push({
      date: new Date().toISOString(),
      from: result.fromVersion,
      to: result.toVersion,
      migrations: result.migrationsRun,
      success: result.success,
    });
    
    // Keep only last 10 migration entries
    if (migratedData._migrationHistory.length > 10) {
      migratedData._migrationHistory = migratedData._migrationHistory.slice(-10);
    }
  }
  
  if (result.success) {
    console.log(`✅ Migrations complete. Now at v${result.toVersion}`);
  }
  
  return { data: migratedData, result };
};

/**
 * Check if data needs migration
 */
export const needsMigration = (data: any): boolean => {
  const currentVersion = data?.version || '1.0.0';
  const latestVersion = getLatestVersion();
  return compareVersions(latestVersion, currentVersion) > 0;
};

/**
 * Get current data version
 */
export const getDataVersion = (data: any): string => {
  return data?.version || '1.0.0';
};
