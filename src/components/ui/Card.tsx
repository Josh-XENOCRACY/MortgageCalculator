import type * as React from 'react'

interface CardProps extends React.HTMLAttributes<HTMLElement> {
  title: string
  subtitle?: string
  actions?: React.ReactNode
  /** Fixed content height in px. Omit for natural height. */
  height?: number
  children: React.ReactNode
}

export function Card({
  title,
  subtitle,
  actions,
  height,
  children,
  className,
  ...rest
}: CardProps) {
  return (
    <section
      aria-label={title}
      className={`rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900 ${className ?? ''}`}
      {...rest}
    >
      <header className="flex items-start justify-between gap-2 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
        <div className="min-w-0">
          <h2 className="m-0 text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</h2>
          {subtitle && (
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>
          )}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-1">{actions}</div>}
      </header>
      <div
        className={height !== undefined ? 'min-h-0 p-3' : 'p-4'}
        style={height !== undefined ? { height } : undefined}
      >
        {children}
      </div>
    </section>
  )
}
