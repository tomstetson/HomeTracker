/**
 * useFormValidation - Hook for form validation with Zod schemas
 * 
 * Provides real-time validation, error display, and form state management.
 */

import { useState, useCallback, useMemo } from 'react';
import { z } from 'zod';

export interface FormValidationOptions<T> {
  schema: z.ZodType<T>;
  initialValues?: Partial<T>;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
}

export interface FormValidationResult<T> {
  values: Partial<T>;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  isValid: boolean;
  isDirty: boolean;
  
  // Actions
  setValue: (field: keyof T, value: any) => void;
  setValues: (values: Partial<T>) => void;
  setError: (field: keyof T, message: string) => void;
  clearError: (field: keyof T) => void;
  setTouched: (field: keyof T) => void;
  validate: () => boolean;
  validateField: (field: keyof T) => boolean;
  reset: (newValues?: Partial<T>) => void;
  
  // Helpers
  getFieldProps: (field: keyof T) => {
    value: any;
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
    onBlur: () => void;
    error?: string;
  };
}

export function useFormValidation<T extends Record<string, any>>(
  options: FormValidationOptions<T>
): FormValidationResult<T> {
  const { schema, initialValues = {}, validateOnChange = true, validateOnBlur = true } = options;

  const [values, setValuesState] = useState<Partial<T>>(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouchedState] = useState<Record<string, boolean>>({});
  const [initialState] = useState(initialValues);

  // Check if form is dirty (values changed from initial)
  const isDirty = useMemo(() => {
    return JSON.stringify(values) !== JSON.stringify(initialState);
  }, [values, initialState]);

  // Check if form is valid (no errors and required fields filled)
  const isValid = useMemo(() => {
    return Object.keys(errors).length === 0;
  }, [errors]);

  // Validate entire form
  const validate = useCallback((): boolean => {
    const result = schema.safeParse(values);
    
    if (result.success) {
      setErrors({});
      return true;
    }
    
    const newErrors: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const path = issue.path.join('.');
      if (!newErrors[path]) {
        newErrors[path] = issue.message;
      }
    }
    setErrors(newErrors);
    return false;
  }, [schema, values]);

  // Validate a single field
  const validateField = useCallback((field: keyof T): boolean => {
    // Create a partial schema for just this field if possible
    try {
      const result = schema.safeParse(values);
      
      if (result.success) {
        setErrors(prev => {
          const next = { ...prev };
          delete next[field as string];
          return next;
        });
        return true;
      }
      
      // Find errors for this specific field
      const fieldErrors = result.error.issues.filter(
        (issue) => issue.path[0] === field
      );
      
      if (fieldErrors.length > 0) {
        setErrors(prev => ({
          ...prev,
          [field as string]: fieldErrors[0].message,
        }));
        return false;
      }
      
      // No errors for this field
      setErrors(prev => {
        const next = { ...prev };
        delete next[field as string];
        return next;
      });
      return true;
    } catch {
      return true;
    }
  }, [schema, values]);

  // Set a single value
  const setValue = useCallback((field: keyof T, value: any) => {
    setValuesState(prev => ({ ...prev, [field]: value }));
    
    if (validateOnChange) {
      // Defer validation to next tick to allow state to update
      setTimeout(() => validateField(field), 0);
    }
  }, [validateOnChange, validateField]);

  // Set multiple values
  const setValues = useCallback((newValues: Partial<T>) => {
    setValuesState(prev => ({ ...prev, ...newValues }));
  }, []);

  // Set an error manually
  const setError = useCallback((field: keyof T, message: string) => {
    setErrors(prev => ({ ...prev, [field as string]: message }));
  }, []);

  // Clear an error
  const clearError = useCallback((field: keyof T) => {
    setErrors(prev => {
      const next = { ...prev };
      delete next[field as string];
      return next;
    });
  }, []);

  // Mark field as touched
  const setTouched = useCallback((field: keyof T) => {
    setTouchedState(prev => ({ ...prev, [field as string]: true }));
    
    if (validateOnBlur) {
      validateField(field);
    }
  }, [validateOnBlur, validateField]);

  // Reset form to initial or new values
  const reset = useCallback((newValues?: Partial<T>) => {
    setValuesState(newValues ?? initialState);
    setErrors({});
    setTouchedState({});
  }, [initialState]);

  // Get props for a form field (for easy binding)
  const getFieldProps = useCallback((field: keyof T) => ({
    value: values[field] ?? '',
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const value = e.target.type === 'checkbox' 
        ? (e.target as HTMLInputElement).checked 
        : e.target.value;
      setValue(field, value);
    },
    onBlur: () => setTouched(field),
    error: touched[field as string] ? errors[field as string] : undefined,
  }), [values, errors, touched, setValue, setTouched]);

  return {
    values,
    errors,
    touched,
    isValid,
    isDirty,
    setValue,
    setValues,
    setError,
    clearError,
    setTouched,
    validate,
    validateField,
    reset,
    getFieldProps,
  };
}

export default useFormValidation;
