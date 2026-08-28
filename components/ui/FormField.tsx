import { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/cn';

function FieldWrapper({ label, error, children, hint }: { label: string; error?: string; children: ReactNode; hint?: string }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-neutral-900">{label}</label>
      {children}
      {hint && !error && <p className="text-sm text-neutral-500">{hint}</p>}
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  ({ label, error, hint, className, ...props }, ref) => (
    <FieldWrapper label={label} error={error} hint={hint}>
      <input
        ref={ref}
        className={cn(
          'h-10 w-full rounded-lg border px-3 text-sm text-neutral-900 placeholder:text-neutral-500',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
          error ? 'border-danger' : 'border-neutral-100',
          className,
        )}
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
  ({ label, error, hint, className, rows = 4, ...props }, ref) => (
    <FieldWrapper label={label} error={error} hint={hint}>
      <textarea
        ref={ref}
        rows={rows}
        className={cn(
          'w-full rounded-lg border px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-500',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
          error ? 'border-danger' : 'border-neutral-100',
          className,
        )}
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
  ({ label, error, hint, options, className, ...props }, ref) => (
    <FieldWrapper label={label} error={error} hint={hint}>
      <select
        ref={ref}
        className={cn(
          'h-10 w-full rounded-lg border bg-white px-3 text-sm text-neutral-900',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
          error ? 'border-danger' : 'border-neutral-100',
          className,
        )}
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
    <label className="flex items-center gap-2 text-sm font-medium text-neutral-900">
      <input type="checkbox" className="h-4 w-4 rounded border-neutral-100 text-primary focus-visible:ring-primary" {...props} />
      {label}
    </label>
  );
}
