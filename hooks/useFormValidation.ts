'use client';

import { useState, useCallback, useMemo } from 'react';

interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any) => string | null;
  email?: boolean;
  url?: boolean;
  numeric?: boolean;
  min?: number;
  max?: number;
}

interface ValidationRules {
  [key: string]: ValidationRule;
}

interface FormErrors {
  [key: string]: string;
}

interface UseFormValidationReturn {
  errors: FormErrors;
  validateField: (fieldName: string, value: any) => void;
  validateAll: (values: Record<string, any>) => boolean;
  clearErrors: () => void;
  hasErrors: boolean;
}

export function useFormValidation(rules: ValidationRules): UseFormValidationReturn {
  const [errors, setErrors] = useState<FormErrors>({});

  const validateField = useCallback((fieldName: string, value: any) => {
    const rule = rules[fieldName];
    if (!rule) return;

    let error: string | null = null;

    // Required validation
    if (rule.required && (!value || (typeof value === 'string' && !value.trim()))) {
      error = 'Este campo es requerido';
    }

    // String validations
    if (typeof value === 'string' && !error) {
      if (rule.minLength && value.length < rule.minLength) {
        error = `Mínimo ${rule.minLength} caracteres`;
      }
      if (rule.maxLength && value.length > rule.maxLength) {
        error = `Máximo ${rule.maxLength} caracteres`;
      }
      if (rule.pattern && !rule.pattern.test(value)) {
        error = 'Formato inválido';
      }
      if (rule.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        error = 'Email inválido';
      }
      if (rule.url && !/^https?:\/\/.+/.test(value)) {
        error = 'URL inválida';
      }
    }

    // Numeric validations
    if (rule.numeric && !error) {
      const numValue = Number(value);
      if (isNaN(numValue)) {
        error = 'Debe ser un número válido';
      } else {
        if (rule.min !== undefined && numValue < rule.min) {
          error = `Mínimo ${rule.min}`;
        }
        if (rule.max !== undefined && numValue > rule.max) {
          error = `Máximo ${rule.max}`;
        }
      }
    }

    // Custom validation
    if (rule.custom && !error) {
      error = rule.custom(value);
    }

    setErrors(prev => ({
      ...prev,
      [fieldName]: error || '',
    }));
  }, [rules]);

  const validateAll = useCallback((values: Record<string, any>): boolean => {
    const newErrors: FormErrors = {};
    let hasErrors = false;

    Object.keys(rules).forEach(fieldName => {
      const rule = rules[fieldName];
      const value = values[fieldName];

      let error: string | null = null;

      // Required validation
      if (rule.required && (!value || (typeof value === 'string' && !value.trim()))) {
        error = 'Este campo es requerido';
      }

      // String validations
      if (typeof value === 'string' && !error) {
        if (rule.minLength && value.length < rule.minLength) {
          error = `Mínimo ${rule.minLength} caracteres`;
        }
        if (rule.maxLength && value.length > rule.maxLength) {
          error = `Máximo ${rule.maxLength} caracteres`;
        }
        if (rule.pattern && !rule.pattern.test(value)) {
          error = 'Formato inválido';
        }
        if (rule.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          error = 'Email inválido';
        }
        if (rule.url && !/^https?:\/\/.+/.test(value)) {
          error = 'URL inválida';
        }
      }

      // Numeric validations
      if (rule.numeric && !error) {
        const numValue = Number(value);
        if (isNaN(numValue)) {
          error = 'Debe ser un número válido';
        } else {
          if (rule.min !== undefined && numValue < rule.min) {
            error = `Mínimo ${rule.min}`;
          }
          if (rule.max !== undefined && numValue > rule.max) {
            error = `Máximo ${rule.max}`;
          }
        }
      }

      // Custom validation
      if (rule.custom && !error) {
        error = rule.custom(value);
      }

      if (error) {
        newErrors[fieldName] = error;
        hasErrors = true;
      }
    });

    setErrors(newErrors);
    return !hasErrors;
  }, [rules]);

  const clearErrors = useCallback(() => {
    setErrors({});
  }, []);

  const hasErrors = useMemo(() => {
    return Object.values(errors).some(error => error !== '');
  }, [errors]);

  return {
    errors,
    validateField,
    validateAll,
    clearErrors,
    hasErrors,
  };
}




