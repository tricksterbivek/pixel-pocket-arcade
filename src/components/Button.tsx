import type { ButtonHTMLAttributes } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'accent';
export type ButtonSize = 'md' | 'lg';

const BASE =
  'inline-flex items-center justify-center gap-2 min-h-11 min-w-11 rounded-md font-semibold ' +
  'touch-manipulation select-none transition-all duration-200 ease-out ' +
  'hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] ' +
  'disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0 disabled:shadow-none';

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-linear-to-br from-brand to-[#ff6fa0] text-inverse shadow-raised hover:shadow-[0_16px_36px_-14px_rgba(255,77,141,0.7)]',
  accent: 'bg-[var(--accent,var(--color-brand))] text-inverse shadow-raised hover:brightness-110',
  secondary:
    'bg-raised/80 text-fg border border-border-strong/60 backdrop-blur hover:bg-raised hover:border-border-strong',
  ghost: 'bg-transparent text-fg hover:bg-white/10',
  danger: 'bg-linear-to-br from-danger to-[#ff7d7d] text-inverse shadow-raised hover:brightness-110',
};

const SIZES: Record<ButtonSize, string> = {
  md: 'px-5 text-sm',
  lg: 'px-7 py-3 text-base',
};

/** Shared button styling, also used by router links that should look like buttons. */
export function buttonClasses(
  variant: ButtonVariant = 'primary',
  size: ButtonSize = 'md',
  className = '',
): string {
  return [BASE, VARIANTS[variant], SIZES[size], className].filter(Boolean).join(' ');
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export function Button({ variant = 'primary', size = 'md', className, type, ...rest }: ButtonProps) {
  return <button type={type ?? 'button'} className={buttonClasses(variant, size, className)} {...rest} />;
}
