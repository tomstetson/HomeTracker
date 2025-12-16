import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { PropertyValueConfig, PropertyValueEstimate } from '../lib/propertyValueService';

interface PropertyValueState {
  config: PropertyValueConfig;
  currentEstimate: PropertyValueEstimate | null;
  lastUpdateAttempt: string | null;
  updateError: string | null;
  
  // Actions
  updateConfig: (updates: Partial<PropertyValueConfig>) => void;
  setCurrentEstimate: (estimate: PropertyValueEstimate) => void;
  setUpdateError: (error: string | null) => void;
  setLastUpdateAttempt: (date: string) => void;
}

const DEFAULT_CONFIG: PropertyValueConfig = {
  provider: 'none',
  apiKey: '',
  autoUpdate: false,
  updateFrequency: 'monthly',
};

export const usePropertyValueStore = create<PropertyValueState>()(
  persist(
    (set) => ({
      config: DEFAULT_CONFIG,
      currentEstimate: null,
      lastUpdateAttempt: null,
      updateError: null,
      
      updateConfig: (updates) =>
        set((state) => ({
          config: { ...state.config, ...updates },
        })),
      
      setCurrentEstimate: (estimate) =>
        set({ currentEstimate: estimate, updateError: null }),
      
      setUpdateError: (error) =>
        set({ updateError: error }),
      
      setLastUpdateAttempt: (date) =>
        set({ lastUpdateAttempt: date }),
    }),
    {
      name: 'hometracker_property_value',
    }
  )
);


