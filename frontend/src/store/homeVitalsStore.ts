import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface PaintColor {
  id: string;
  room: string;
  brand: string;
  colorName: string;
  colorCode: string;
  hexColor?: string;
  finish: 'flat' | 'eggshell' | 'satin' | 'semi-gloss' | 'gloss' | 'other';
  surface: 'walls' | 'ceiling' | 'trim' | 'doors' | 'cabinets' | 'exterior' | 'other';
  dateApplied?: string;
  purchaseLocation?: string;
  notes?: string;
}

export interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  type: 'plumber' | 'electrician' | 'hvac' | 'handyman' | 'locksmith' | 'other';
  notes?: string;
}

export interface ShutoffLocation {
  location: string;
  notes?: string;
  photoUrl?: string;
}

export interface HomeVitals {
  waterMain: ShutoffLocation;
  gasShutoff: ShutoffLocation;
  electricalPanel: ShutoffLocation;
  hvacFilter: {
    size: string;
    brand?: string;
    lastChanged?: string;
    changeIntervalDays?: number;
  };
  emergencyContacts: EmergencyContact[];
  circuitBreakers: Array<{
    number: number;
    label: string;
    amps?: number;
  }>;
  wifiNetwork?: {
    ssid: string;
    password?: string;
    routerLocation?: string;
  };
  securitySystem?: {
    provider?: string;
    accountNumber?: string;
    code?: string;
    phone?: string;
  };
}

export interface ServiceRecord {
  id: string;
  date: string;
  type: string;
  itemId?: string;
  vendorId?: string;
  vendorName?: string;
  cost?: number;
  description: string;
  notes?: string;
  receiptUrl?: string;
}

interface HomeVitalsState {
  paintColors: PaintColor[];
  homeVitals: HomeVitals;
  serviceHistory: ServiceRecord[];
  
  // Paint Colors
  addPaintColor: (color: PaintColor) => void;
  updatePaintColor: (id: string, updates: Partial<PaintColor>) => void;
  deletePaintColor: (id: string) => void;
  
  // Home Vitals
  updateHomeVitals: (updates: Partial<HomeVitals>) => void;
  addEmergencyContact: (contact: EmergencyContact) => void;
  updateEmergencyContact: (id: string, updates: Partial<EmergencyContact>) => void;
  deleteEmergencyContact: (id: string) => void;
  
  // Service History
  addServiceRecord: (record: ServiceRecord) => void;
  updateServiceRecord: (id: string, updates: Partial<ServiceRecord>) => void;
  deleteServiceRecord: (id: string) => void;
}

const defaultHomeVitals: HomeVitals = {
  waterMain: { location: '', notes: '' },
  gasShutoff: { location: '', notes: '' },
  electricalPanel: { location: '', notes: '' },
  hvacFilter: { size: '', lastChanged: '' },
  emergencyContacts: [],
  circuitBreakers: [],
};

export const useHomeVitalsStore = create<HomeVitalsState>()(
  persist(
    (set) => ({
      paintColors: [],
      homeVitals: defaultHomeVitals,
      serviceHistory: [],

      // Paint Colors
      addPaintColor: (color) =>
        set((state) => ({
          paintColors: [...state.paintColors, color],
        })),
      
      updatePaintColor: (id, updates) =>
        set((state) => ({
          paintColors: state.paintColors.map((c) =>
            c.id === id ? { ...c, ...updates } : c
          ),
        })),
      
      deletePaintColor: (id) =>
        set((state) => ({
          paintColors: state.paintColors.filter((c) => c.id !== id),
        })),

      // Home Vitals
      updateHomeVitals: (updates) =>
        set((state) => ({
          homeVitals: { ...state.homeVitals, ...updates },
        })),
      
      addEmergencyContact: (contact) =>
        set((state) => ({
          homeVitals: {
            ...state.homeVitals,
            emergencyContacts: [...state.homeVitals.emergencyContacts, contact],
          },
        })),
      
      updateEmergencyContact: (id, updates) =>
        set((state) => ({
          homeVitals: {
            ...state.homeVitals,
            emergencyContacts: state.homeVitals.emergencyContacts.map((c) =>
              c.id === id ? { ...c, ...updates } : c
            ),
          },
        })),
      
      deleteEmergencyContact: (id) =>
        set((state) => ({
          homeVitals: {
            ...state.homeVitals,
            emergencyContacts: state.homeVitals.emergencyContacts.filter(
              (c) => c.id !== id
            ),
          },
        })),

      // Service History
      addServiceRecord: (record) =>
        set((state) => ({
          serviceHistory: [record, ...state.serviceHistory],
        })),
      
      updateServiceRecord: (id, updates) =>
        set((state) => ({
          serviceHistory: state.serviceHistory.map((r) =>
            r.id === id ? { ...r, ...updates } : r
          ),
        })),
      
      deleteServiceRecord: (id) =>
        set((state) => ({
          serviceHistory: state.serviceHistory.filter((r) => r.id !== id),
        })),
    }),
    {
      name: 'hometracker_homeVitals',
    }
  )
);


