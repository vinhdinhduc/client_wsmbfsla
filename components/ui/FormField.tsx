import {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
  forwardRef,
} from 'react';
import { cn } from '@/lib/cn';
import styles from './FormField.module.scss';

function FieldWrapper({
  label,
  error,
  children,
  hint,
  required,
}: {
  label: string;
  error?: string;
  children: ReactNode;
  hint?: string;
  required?: boolean;
}) {
  return (
    <div className={styles.field}>
      <label className={styles.label}>
        {label}
        {required && <span className={styles.requiredMark}> *</span>}
      </label>
      {children}
      {hint && !error && <p className={styles.hint}>{hint}</p>}
      {error && <p className={styles.error}>{error}</p>}
    </div>
  );
}

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  ({ label, error, hint, className, required, ...props }, ref) => (
    <FieldWrapper label={label} error={error} hint={hint} required={required}>
      <input
        ref={ref}
        className={cn(styles.control, error ? styles.invalid : styles.valid, className)}
        required={required}
        {...props}
      />
    </FieldWrapper>
  ),
);
TextField.displayName = 'TextField';

interface TextareaFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
  hint?: string;
}

export const TextareaField = forwardRef<HTMLTextAreaElement, TextareaFieldProps>(
  ({ label, error, hint, className, rows = 4, required, ...props }, ref) => (
    <FieldWrapper label={label} error={error} hint={hint} required={required}>
      <textarea
        ref={ref}
        rows={rows}
        className={cn(styles.textarea, error ? styles.invalid : styles.valid, className)}
        required={required}
        {...props}
      />
    </FieldWrapper>
  ),
);
TextareaField.displayName = 'TextareaField';

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
  hint?: string;
  options: Array<{ value: string; label: string }>;
}

export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(
  ({ label, error, hint, options, className, required, ...props }, ref) => (
    <FieldWrapper label={label} error={error} hint={hint} required={required}>
      <select
        ref={ref}
        className={cn(
          styles.control,
          styles.select,
          error ? styles.invalid : styles.valid,
          className,
        )}
        required={required}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </FieldWrapper>
  ),
);
SelectField.displayName = 'SelectField';

export function CheckboxField({
  label,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className={styles.checkboxLabel}>
      <input type="checkbox" className={styles.checkbox} {...props} />
      {label}
    </label>
  );
}
