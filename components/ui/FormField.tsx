'use client';

import {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
  forwardRef,
  useId,
} from 'react';
import { cn } from '@/lib/cn';
import styles from './FormField.module.scss';

export function FormField({
  label,
  error,
  children,
  hint,
  required,
  id,
}: {
  label: string;
  error?: string;
  children: ReactNode;
  hint?: string;
  required?: boolean;
  id: string;
}) {
  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>
        {label}
        {required && (
          <span aria-hidden="true" className={styles.requiredMark}>
            {' '}
            *
          </span>
        )}
      </label>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className={styles.hint}>
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className={styles.error}>
          {error}
        </p>
      )}
    </div>
  );
}

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  ({ label, error, hint, className, required, id, ...props }, ref) => {
    const generatedId = useId();
    const fieldId = id ?? generatedId;
    return (
      <FormField label={label} error={error} hint={hint} required={required} id={fieldId}>
        <input
          ref={ref}
          id={fieldId}
          className={cn(styles.control, error ? styles.invalid : styles.valid, className)}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined}
          {...props}
        />
      </FormField>
    );
  },
);
TextField.displayName = 'TextField';

interface TextareaFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
  hint?: string;
}

export const TextareaField = forwardRef<HTMLTextAreaElement, TextareaFieldProps>(
  ({ label, error, hint, className, rows = 4, required, id, ...props }, ref) => {
    const generatedId = useId();
    const fieldId = id ?? generatedId;
    return (
      <FormField label={label} error={error} hint={hint} required={required} id={fieldId}>
        <textarea
          ref={ref}
          id={fieldId}
          rows={rows}
          className={cn(styles.textarea, error ? styles.invalid : styles.valid, className)}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined}
          {...props}
          onInput={(event) => {
            event.currentTarget.style.height = 'auto';
            event.currentTarget.style.height = `${event.currentTarget.scrollHeight}px`;
            props.onInput?.(event);
          }}
        />
      </FormField>
    );
  },
);
TextareaField.displayName = 'TextareaField';

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
  hint?: string;
  options?: Array<{ value: string; label: string }>;
}

export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(
  ({ label, error, hint, options, children, className, required, id, ...props }, ref) => {
    const generatedId = useId();
    const fieldId = id ?? generatedId;
    return (
      <FormField label={label} error={error} hint={hint} required={required} id={fieldId}>
        <div className={styles.selectWrap}>
          <select
            ref={ref}
            id={fieldId}
            className={cn(
              styles.control,
              styles.select,
              error ? styles.invalid : styles.valid,
              className,
            )}
            required={required}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined}
            {...props}
          >
            {options?.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
            {children}
          </select>
        </div>
      </FormField>
    );
  },
);
SelectField.displayName = 'SelectField';

export function CheckboxField({
  label,
  id,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  return (
    <label htmlFor={fieldId} className={styles.checkboxLabel}>
      <input id={fieldId} type="checkbox" className={styles.checkbox} {...props} />
      {label}
    </label>
  );
}

export {
  TextField as Input,
  TextareaField as Textarea,
  SelectField as Select,
  CheckboxField as Checkbox,
};
