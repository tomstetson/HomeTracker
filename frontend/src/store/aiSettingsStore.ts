import { create } from 'zustand';
import { getCollection, saveCollection } from '../lib/storage';

export type AIProvider = 'openai' | 'anthropic' | 'gemini' | 'none';

export interface AIProviderConfig {
  provider: AIProvider;
  apiKey: string;
  model: string;
  enabled: boolean;
}

export type AssistantSchedule = 'manual' | 'daily' | 'weekly';

export interface AIFeatureToggles {
  // Core features
  enableDiagramAssistant: boolean;      // Mermaid diagram AI help
  enableNaturalLanguageSearch: boolean; // AI-powered search in GlobalSearch
  enableDocumentIntelligence: boolean;  // Auto-extract data from documents
  enableMaintenanceAutomation: boolean; // AI maintenance suggestions
  enableSmartAssistant: boolean;        // Proactive home insights
}

export interface AISettings {
  activeProvider: AIProvider;
  providers: {
    openai: AIProviderConfig;
    anthropic: AIProviderConfig;
    gemini: AIProviderConfig;
  };
  // Feature toggles
  features: AIFeatureToggles;
  // Smart Assistant settings
  assistantSchedule: AssistantSchedule;
  lastAnalysisDate?: string;
  // Legacy (for backwards compatibility)
  enableDiagramAssistant: boolean;
  enableDocumentSummary: boolean;
}

export const AI_PROVIDER_INFO: Record<AIProvider, {
  name: string;
  description: string;
  models: { value: string; label: string }[];
  docsUrl: string;
  keyUrl: string;
}> = {
  none: {
    name: 'Disabled',
    description: 'No AI features enabled',
    models: [],
    docsUrl: '',
    keyUrl: '',
  },
  openai: {
    name: 'OpenAI',
    description: 'GPT-4o, GPT-4, GPT-3.5 models',
    models: [
      { value: 'gpt-4o', label: 'GPT-4o (Recommended)' },
      { value: 'gpt-4o-mini', label: 'GPT-4o Mini (Faster)' },
      { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
      { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo (Budget)' },
    ],
    docsUrl: 'https://platform.openai.com/docs',
    keyUrl: 'https://platform.openai.com/api-keys',
  },
  anthropic: {
    name: 'Anthropic (Claude)',
    description: 'Claude 3.5 Sonnet, Claude 3 Opus, Haiku',
    models: [
      { value: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4 (Recommended)' },
      { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet' },
      { value: 'claude-3-5-haiku-20241022', label: 'Claude 3.5 Haiku (Faster)' },
      { value: 'claude-3-opus-20240229', label: 'Claude 3 Opus (Powerful)' },
    ],
    docsUrl: 'https://docs.anthropic.com',
    keyUrl: 'https://console.anthropic.com/settings/keys',
  },
  gemini: {
    name: 'Google Gemini',
    description: 'Gemini Pro, Gemini Flash models',
    models: [
      { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro (Recommended)' },
      { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash (Fast)' },
      { value: 'gemini-pro', label: 'Gemini Pro' },
    ],
    docsUrl: 'https://ai.google.dev/docs',
    keyUrl: 'https://aistudio.google.com/app/apikey',
  },
};

const DEFAULT_FEATURE_TOGGLES: AIFeatureToggles = {
  enableDiagramAssistant: true,
  enableNaturalLanguageSearch: true,
  enableDocumentIntelligence: true,
  enableMaintenanceAutomation: true,
  enableSmartAssistant: true,
};

const DEFAULT_SETTINGS: AISettings = {
  activeProvider: 'none',
  providers: {
    openai: {
      provider: 'openai',
      apiKey: '',
      model: 'gpt-4o-mini',
      enabled: false,
    },
    anthropic: {
      provider: 'anthropic',
      apiKey: '',
      model: 'claude-sonnet-4-20250514',
      enabled: false,
    },
    gemini: {
      provider: 'gemini',
      apiKey: '',
      model: 'gemini-1.5-flash',
      enabled: false,
    },
  },
  features: DEFAULT_FEATURE_TOGGLES,
  assistantSchedule: 'weekly',
  // Legacy fields for backwards compatibility
  enableDiagramAssistant: true,
  enableDocumentSummary: false,
};

interface AISettingsStore {
  settings: AISettings;
  isLoading: boolean;
  
  // Settings management
  setActiveProvider: (provider: AIProvider) => void;
  updateProviderConfig: (provider: AIProvider, config: Partial<AIProviderConfig>) => void;
  setDiagramAssistant: (enabled: boolean) => void;
  setDocumentSummary: (enabled: boolean) => void;
  
  // Feature toggles
  updateFeatureToggle: (feature: keyof AIFeatureToggles, enabled: boolean) => void;
  setAssistantSchedule: (schedule: AssistantSchedule) => void;
  updateLastAnalysisDate: () => void;
  
  // Getters
  getActiveConfig: () => AIProviderConfig | null;
  isAIEnabled: () => boolean;
  isFeatureEnabled: (feature: keyof AIFeatureToggles) => boolean;
  
  // Persistence
  loadFromStorage: () => void;
  saveToStorage: () => void;
}

export const useAISettingsStore = create<AISettingsStore>((set, get) => ({
  settings: DEFAULT_SETTINGS,
  isLoading: true,

  setActiveProvider: (provider) => {
    set((state) => ({
      settings: {
        ...state.settings,
        activeProvider: provider,
      },
    }));
    get().saveToStorage();
  },

  updateProviderConfig: (provider, config) => {
    if (provider === 'none') return;
    set((state) => ({
      settings: {
        ...state.settings,
        providers: {
          ...state.settings.providers,
          [provider]: {
            ...state.settings.providers[provider],
            ...config,
          },
        },
      },
    }));
    get().saveToStorage();
  },

  setDiagramAssistant: (enabled) => {
    set((state) => ({
      settings: {
        ...state.settings,
        enableDiagramAssistant: enabled,
      },
    }));
    get().saveToStorage();
  },

  setDocumentSummary: (enabled) => {
    set((state) => ({
      settings: {
        ...state.settings,
        enableDocumentSummary: enabled,
        features: {
          ...state.settings.features,
          enableDocumentIntelligence: enabled,
        },
      },
    }));
    get().saveToStorage();
  },

  updateFeatureToggle: (feature, enabled) => {
    set((state) => ({
      settings: {
        ...state.settings,
        features: {
          ...state.settings.features,
          [feature]: enabled,
        },
        // Keep legacy fields in sync
        ...(feature === 'enableDiagramAssistant' && { enableDiagramAssistant: enabled }),
        ...(feature === 'enableDocumentIntelligence' && { enableDocumentSummary: enabled }),
      },
    }));
    get().saveToStorage();
  },

  setAssistantSchedule: (schedule) => {
    set((state) => ({
      settings: {
        ...state.settings,
        assistantSchedule: schedule,
      },
    }));
    get().saveToStorage();
  },

  updateLastAnalysisDate: () => {
    set((state) => ({
      settings: {
        ...state.settings,
        lastAnalysisDate: new Date().toISOString(),
      },
    }));
    get().saveToStorage();
  },

  getActiveConfig: () => {
    const { settings } = get();
    if (settings.activeProvider === 'none') return null;
    return settings.providers[settings.activeProvider];
  },

  isAIEnabled: () => {
    const { settings } = get();
    if (settings.activeProvider === 'none') return false;
    const config = settings.providers[settings.activeProvider];
    return config.enabled && !!config.apiKey;
  },

  isFeatureEnabled: (feature) => {
    const { settings } = get();
    // Feature is only enabled if AI is configured AND the specific feature is toggled on
    if (settings.activeProvider === 'none') return false;
    const config = settings.providers[settings.activeProvider];
    if (!config.enabled || !config.apiKey) return false;
    return settings.features[feature] ?? false;
  },

  loadFromStorage: () => {
    try {
      const stored = getCollection('aiSettings') as AISettings | null;
      
      // Check for environment variable API keys (development convenience)
      // These ALWAYS take precedence over stored values
      const envKeys = {
        openai: (typeof import.meta.env !== 'undefined' && import.meta.env.VITE_OPENAI_API_KEY) || '',
        anthropic: (typeof import.meta.env !== 'undefined' && import.meta.env.VITE_ANTHROPIC_API_KEY) || '',
        gemini: (typeof import.meta.env !== 'undefined' && import.meta.env.VITE_GEMINI_API_KEY) || '',
      };
      
      // Log env key detection for debugging
      if (envKeys.openai) {
        console.log('🔑 OpenAI API key detected from environment');
      }
      
      // Start with defaults or stored settings
      const baseSettings = stored ? {
        ...DEFAULT_SETTINGS,
        ...stored,
        providers: {
          openai: {
            ...DEFAULT_SETTINGS.providers.openai,
            ...stored.providers?.openai,
          },
          anthropic: {
            ...DEFAULT_SETTINGS.providers.anthropic,
            ...stored.providers?.anthropic,
          },
          gemini: {
            ...DEFAULT_SETTINGS.providers.gemini,
            ...stored.providers?.gemini,
          },
        },
        features: {
          ...DEFAULT_FEATURE_TOGGLES,
          ...stored.features,
        },
      } : { ...DEFAULT_SETTINGS };
      
      // Apply environment variable keys (ALWAYS takes precedence for development)
      if (envKeys.openai) {
        baseSettings.providers.openai.apiKey = envKeys.openai;
        baseSettings.providers.openai.enabled = true;
        // Force select OpenAI when env key is present
        baseSettings.activeProvider = 'openai';
        // Ensure all features are enabled when using env key
        baseSettings.features = { ...DEFAULT_FEATURE_TOGGLES };
      }
      if (envKeys.anthropic) {
        baseSettings.providers.anthropic.apiKey = envKeys.anthropic;
        baseSettings.providers.anthropic.enabled = true;
        if (!envKeys.openai && baseSettings.activeProvider === 'none') {
          baseSettings.activeProvider = 'anthropic';
        }
      }
      if (envKeys.gemini) {
        baseSettings.providers.gemini.apiKey = envKeys.gemini;
        baseSettings.providers.gemini.enabled = true;
        if (!envKeys.openai && !envKeys.anthropic && baseSettings.activeProvider === 'none') {
          baseSettings.activeProvider = 'gemini';
        }
      }
      
      set({ settings: baseSettings, isLoading: false });
    } catch (error) {
      console.error('Failed to load AI settings:', error);
      set({ settings: DEFAULT_SETTINGS, isLoading: false });
    }
  },

  saveToStorage: () => {
    try {
      const { settings } = get();
      saveCollection('aiSettings', settings);
    } catch (error) {
      console.error('Failed to save AI settings:', error);
    }
  },
}));

// Load on initialization
useAISettingsStore.getState().loadFromStorage();


