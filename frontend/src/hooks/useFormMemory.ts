import { useState, useCallback } from 'react';

const STORAGE_PREFIX = 'hometracker_form_memory_';

interface FormMemoryOptions {
  fields: string[];
  expireDays?: number;
}

interface FormMemoryEntry {
  value: string;
  timestamp: number;
}

interface FormMemoryData {
  [field: string]: FormMemoryEntry;
}

export function useFormMemory(formKey: string, options: FormMemoryOptions) {
  const storageKey = `${STORAGE_PREFIX}${formKey}`;
  const expireMs = (options.expireDays || 30) * 24 * 60 * 60 * 1000;

  const [memory, setMemory] = useState<Record<string, string>>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (!stored) return {};

      const data: FormMemoryData = JSON.parse(stored);
      const now = Date.now();
      const result: Record<string, string> = {};

      for (const field of options.fields) {
        const entry = data[field];
        if (entry && (now - entry.timestamp) < expireMs) {
          result[field] = entry.value;
        }
      }

      return result;
    } catch {
      return {};
    }
  });

  const remember = useCallback((field: string, value: string) => {
    if (!options.fields.includes(field) || !value) return;

    setMemory(prev => {
      const updated = { ...prev, [field]: value };

      try {
        const stored = localStorage.getItem(storageKey);
        const data: FormMemoryData = stored ? JSON.parse(stored) : {};
        
        data[field] = {
          value,
          timestamp: Date.now(),
        };

        localStorage.setItem(storageKey, JSON.stringify(data));
      } catch (error) {
        console.warn('Failed to save form memory:', error);
      }

      return updated;
    });
  }, [storageKey, options.fields]);

  const rememberAll = useCallback((values: Record<string, string>) => {
    const entries = Object.entries(values).filter(
      ([field, value]) => options.fields.includes(field) && value
    );

    if (entries.length === 0) return;

    setMemory(prev => {
      const updated = { ...prev };
      
      try {
        const stored = localStorage.getItem(storageKey);
        const data: FormMemoryData = stored ? JSON.parse(stored) : {};
        const now = Date.now();

        for (const [field, value] of entries) {
          updated[field] = value;
          data[field] = { value, timestamp: now };
        }

        localStorage.setItem(storageKey, JSON.stringify(data));
      } catch (error) {
        console.warn('Failed to save form memory:', error);
      }

      return updated;
    });
  }, [storageKey, options.fields]);

  const clear = useCallback(() => {
    setMemory({});
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // Ignore
    }
  }, [storageKey]);

  const getLastUsed = useCallback((field: string): string | undefined => {
    return memory[field];
  }, [memory]);

  return {
    lastUsed: memory,
    remember,
    rememberAll,
    clear,
    getLastUsed,
  };
}

export function useFormDefaults<T extends Record<string, any>>(
  formKey: string,
  defaultValues: T,
  fieldsToRemember: (keyof T)[]
) {
  const { lastUsed, rememberAll, getLastUsed } = useFormMemory(formKey, {
    fields: fieldsToRemember as string[],
  });

  const getDefaults = useCallback((): T => {
    const result = { ...defaultValues };
    
    for (const field of fieldsToRemember) {
      const remembered = getLastUsed(field as string);
      if (remembered !== undefined) {
        (result as any)[field] = remembered;
      }
    }

    return result;
  }, [defaultValues, fieldsToRemember, getLastUsed]);

  const saveValues = useCallback((values: Partial<T>) => {
    const toSave: Record<string, string> = {};
    
    for (const field of fieldsToRemember) {
      const value = values[field];
      if (value !== undefined && value !== null && value !== '') {
        toSave[field as string] = String(value);
      }
    }

    if (Object.keys(toSave).length > 0) {
      rememberAll(toSave);
    }
  }, [fieldsToRemember, rememberAll]);

  return {
    getDefaults,
    saveValues,
    lastUsed,
  };
}
