import type * as React from 'react'

type Variant = 'primary' | 'ghost'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
}

const variantClass: Record<Variant, string> = {
  primary:
    'bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800 disabled:bg-slate-300 dark:disabled:bg-slate-700',
  ghost:
    'border border-slate-300 bg-transparent text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800',
}

export function Button({ children, variant = 'ghost', className, ...rest }: ButtonProps) {
  return (
    <button
      className={`px-2 py-1 text-xs font-medium ${variantClass[variant]} ${className ?? ''}`}
      {...rest}
    >
      {children}
    </button>
  )
}
