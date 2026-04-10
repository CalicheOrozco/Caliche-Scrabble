import type { ButtonHTMLAttributes } from 'react';
import { clsx } from 'clsx';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export function Button({ variant = 'primary', size = 'md', className, children, ...props }: ButtonProps) {
  return (
    <button
      {...props}
      className={clsx(
        'inline-flex items-center justify-center rounded-xl font-semibold transition-all duration-150 select-none',
        'disabled:opacity-40 disabled:cursor-not-allowed',
        size === 'sm' && 'px-3 py-1.5 text-sm',
        size === 'md' && 'px-4 py-2 text-base',
        size === 'lg' && 'px-6 py-3 text-lg',
        variant === 'primary' && 'bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white shadow-md hover:shadow-indigo-500/30',
        variant === 'secondary' && 'bg-slate-700 hover:bg-slate-600 active:bg-slate-800 text-slate-100',
        variant === 'ghost' && 'bg-transparent hover:bg-slate-700/50 text-slate-400 hover:text-slate-200',
        className
      )}
    >
      {children}
    </button>
  );
}
