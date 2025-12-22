/**
 * Storage Key Consolidation
 * 
 * Migrates data from legacy localStorage keys into the main storage.
 * This runs BEFORE version migrations to ensure all data is in one place.
 */

const MAIN_KEY = 'hometracker_data';
const LEGACY_KEYS = ['hometracker_settings', 'hometracker_diagrams'];

/**
 * Consolidate legacy localStorage keys into main storage
 * Returns true if any data was migrated
 */
export const consolidateStorageKeys = (): boolean => {
  let migrated = false;
  
  try {
    const mainDataStr = localStorage.getItem(MAIN_KEY);
    const mainData = mainDataStr ? JSON.parse(mainDataStr) : {};
    
    // Migrate hometracker_settings
    const settingsStr = localStorage.getItem('hometracker_settings');
    if (settingsStr) {
      try {
        const settingsData = JSON.parse(settingsStr);
        
        // Ensure settings namespace exists
        if (!mainData.settings) {
          mainData.settings = {
            property: {},
            notifications: { enabled: true },
            ai: {},
            display: { theme: 'system' },
          };
        }
        
        // Merge property settings
        mainData.settings.property = {
          ...mainData.settings.property,
          ...settingsData,
        };
        
        // Remove legacy key
        localStorage.removeItem('hometracker_settings');
        console.log('✅ Migrated hometracker_settings → hometracker_data.settings.property');
        migrated = true;
      } catch (e) {
        console.warn('Failed to migrate hometracker_settings:', e);
      }
    }
    
    // Migrate hometracker_diagrams (legacy, if exists)
    const diagramsStr = localStorage.getItem('hometracker_diagrams');
    if (diagramsStr) {
      try {
        const legacyDiagrams = JSON.parse(diagramsStr);
        
        if (Array.isArray(legacyDiagrams) && legacyDiagrams.length > 0) {
          // Ensure diagrams array exists
          if (!mainData.diagrams) {
            mainData.diagrams = [];
          }
          
          // Merge, avoiding duplicates by ID
          const existingIds = new Set(mainData.diagrams.map((d: any) => d.id));
          const newDiagrams = legacyDiagrams.filter((d: any) => !existingIds.has(d.id));
          
          mainData.diagrams = [...mainData.diagrams, ...newDiagrams];
          console.log(`✅ Migrated ${newDiagrams.length} diagrams from hometracker_diagrams`);
        }
        
        // Remove legacy key
        localStorage.removeItem('hometracker_diagrams');
        migrated = true;
      } catch (e) {
        console.warn('Failed to migrate hometracker_diagrams:', e);
      }
    }
    
    // Save consolidated data if any migration occurred
    if (migrated) {
      mainData.lastUpdated = new Date().toISOString();
      localStorage.setItem(MAIN_KEY, JSON.stringify(mainData));
    }
    
  } catch (e) {
    console.error('Storage consolidation failed:', e);
  }
  
  return migrated;
};

/**
 * Check if there are any legacy keys that need consolidation
 */
export const hasLegacyKeys = (): boolean => {
  return LEGACY_KEYS.some(key => localStorage.getItem(key) !== null);
};
