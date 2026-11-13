import type { ButtonHTMLAttributes } from 'react'

export interface PillButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  label: string
  active?: boolean
  variant?: 'round' | 'square'
}

export function PillButton({
  label,
  active = false,
  variant = 'square',
  ...rest
}: PillButtonProps) {
  const radius =
    variant === 'round' ? 'rounded-full px-2.5 py-1 text-xs' : 'rounded-md px-2 py-1 text-[11px]'
  const base = active
    ? 'border-brand-500 bg-brand-600 text-white'
    : 'border-slate-300 bg-white text-slate-600 hover:border-slate-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300'
  return (
    <button
      type="button"
      aria-pressed={active}
      className={`border font-medium transition-colors ${radius} ${base} disabled:cursor-not-allowed disabled:opacity-40`}
      {...rest}
    >
      {label}
    </button>
  )
}
