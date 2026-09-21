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

function FieldWrapper({
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
  ({ label, error, hint, className, required, id, ...props }, ref) => {
    const generatedId = useId();
    const fieldId = id ?? generatedId;
    return <FieldWrapper label={label} error={error} hint={hint} required={required} id={fieldId}>
      <input
        ref={ref}
        id={fieldId}
        className={cn(styles.control, error ? styles.invalid : styles.valid, className)}
        required={required}
        {...props}
      />
    </FieldWrapper>;
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
    return <FieldWrapper label={label} error={error} hint={hint} required={required} id={fieldId}>
      <textarea
        ref={ref}
        id={fieldId}
        rows={rows}
        className={cn(styles.textarea, error ? styles.invalid : styles.valid, className)}
        required={required}
        {...props}
      />
    </FieldWrapper>;
  },
);
TextareaField.displayName = 'TextareaField';

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
  hint?: string;
  options: Array<{ value: string; label: string }>;
}

export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(
  ({ label, error, hint, options, className, required, id, ...props }, ref) => {
    const generatedId = useId();
    const fieldId = id ?? generatedId;
    return <FieldWrapper label={label} error={error} hint={hint} required={required} id={fieldId}>
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
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </FieldWrapper>;
  },
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
