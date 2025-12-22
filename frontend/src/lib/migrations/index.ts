/**
 * Data Migration System for HomeTracker
 * 
 * This module handles versioned data migrations to ensure backward compatibility
 * when the data schema changes.
 * 
 * How it works:
 * 1. Each migration has a version number (semver) and a migrate function
 * 2. On app load, migrations are run in order from current version to latest
 * 3. Migration history is tracked for debugging
 * 
 * To add a new migration:
 * 1. Add a new Migration object to the migrations array
 * 2. Increment the version (following semver)
 * 3. Implement the migrate function
 * 4. Test with sample data
 */

export interface Migration {
  version: string;
  description: string;
  migrate: (data: any) => any;
}

/**
 * Compare two semver version strings
 * Returns: 1 if v1 > v2, -1 if v1 < v2, 0 if equal
 */
export const compareVersions = (v1: string, v2: string): number => {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);
  
  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const p1 = parts1[i] || 0;
    const p2 = parts2[i] || 0;
    if (p1 > p2) return 1;
    if (p1 < p2) return -1;
  }
  return 0;
};

/**
 * All migrations in order
 * Add new migrations at the end of this array
 */
export const migrations: Migration[] = [
  {
    version: '1.1.0',
    description: 'Add settings namespace and consolidate storage keys',
    migrate: (data) => {
      // Ensure settings object exists
      if (!data.settings) {
        data.settings = {
          property: {},
          notifications: { enabled: true },
          ai: {},
          display: { theme: 'system' },
        };
      }
      
      // Migrate property settings if they exist in old location
      // Note: hometracker_settings is handled separately in consolidateStorageKeys
      
      return { ...data, version: '1.1.0' };
    },
  },
  {
    version: '1.2.0',
    description: 'Normalize diagram data format for tldraw v3 compatibility',
    migrate: (data) => {
      // Fix incompatible tldraw data that causes ValidationError
      if (data.diagrams && Array.isArray(data.diagrams)) {
        data.diagrams = data.diagrams.map((diagram: any) => {
          if (!diagram.data || diagram.data.type === 'mermaid') {
            return diagram;
          }
          
          // Check for incompatible tldraw data
          if (diagram.data.store) {
            let hasInvalidData = false;
            
            for (const [key, record] of Object.entries(diagram.data.store as Record<string, any>)) {
              if (!key.startsWith('shape:')) continue;
              
              const shape = record as any;
              // Text shapes with 'text' in props are incompatible with tldraw v3
              if (shape.type === 'text' && shape.props?.text !== undefined) {
                hasInvalidData = true;
                break;
              }
            }
            
            if (hasInvalidData) {
              console.log(`Migration 1.2.0: Clearing incompatible diagram data for "${diagram.name}"`);
              return { ...diagram, data: null };
            }
          }
          
          return diagram;
        });
      }
      
      return { ...data, version: '1.2.0' };
    },
  },
  {
    version: '1.3.0',
    description: 'Add migration history tracking',
    migrate: (data) => {
      // Initialize migration history if not present
      if (!data._migrationHistory) {
        data._migrationHistory = [];
      }
      
      return { ...data, version: '1.3.0' };
    },
  },
];

/**
 * Get the latest version from migrations
 */
export const getLatestVersion = (): string => {
  if (migrations.length === 0) return '1.0.0';
  return migrations[migrations.length - 1].version;
};

/**
 * Get migrations that need to run for a given current version
 */
export const getPendingMigrations = (currentVersion: string): Migration[] => {
  return migrations
    .filter(m => compareVersions(m.version, currentVersion) > 0)
    .sort((a, b) => compareVersions(a.version, b.version));
};
