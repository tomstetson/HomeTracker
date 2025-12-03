import { useState } from 'react';
import { z } from 'zod';
import { validateForm } from './validation';

export function useValidation<T>(schema: z.ZodSchema<T>) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (data: any): { success: boolean; data?: T } => {
    const result = validateForm(schema, data);
    if (result.success) {
      setErrors({});
      return { success: true, data: result.data };
    } else {
      setErrors(result.errors || {});
      return { success: false };
    }
  };

  const clearErrors = () => setErrors({});
  
  const getError = (fieldName: string): string | undefined => errors[fieldName];
  
  const hasErrors = Object.keys(errors).length > 0;

  return { validate, errors, clearErrors, getError, hasErrors };
}




