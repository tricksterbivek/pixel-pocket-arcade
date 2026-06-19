import type { ButtonHTMLAttributes } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'accent';
export type ButtonSize = 'md' | 'lg';

const BASE =
  'inline-flex items-center justify-center gap-2 min-h-11 min-w-11 rounded-md font-semibold ' +
  'touch-manipulation select-none transition-[transform,box-shadow,background-color,filter] ' +
  'duration-150 ease-out active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed ' +
  'disabled:active:scale-100 disabled:shadow-none';

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-brand text-inverse shadow-raised active:shadow-pixel hover:brightness-105',
  accent:
    'bg-[var(--accent,var(--color-brand))] text-inverse shadow-raised active:shadow-pixel hover:brightness-105',
  secondary:
    'bg-raised text-fg border-2 border-border-strong shadow-pixel hover:bg-surface active:shadow-none',
  ghost: 'bg-transparent text-fg hover:bg-white/5 active:shadow-none',
  danger: 'bg-danger text-inverse shadow-raised active:shadow-pixel hover:brightness-105',
};

const SIZES: Record<ButtonSize, string> = {
  md: 'px-4 text-base',
  lg: 'px-6 py-3 text-base',
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
