import { useEffect, useId, useRef, useState } from 'react'

export interface NumberInputProps {
  id?: string
  label: string
  value: number
  onCommit: (v: number) => void
  /** Debounce ms before onCommit fires; 0 = commit immediately. */
  delayMs?: number
  min?: number
  max?: number
  step?: number
  suffix?: string
  prefix?: string
  hint?: string
  className?: string
}

/**
 * A controlled numeric input that lets the user type freely, then commits
 * (optionally debounced) to the store. While focused the field is *not*
 * rewritten mid-keystroke (so partial values like "4.2" or "12." can be typed);
 * the display is only normalised on blur or when the store changes out-of-focus.
 */
export function NumberInput({
  id,
  label,
  value,
  onCommit,
  delayMs = 150,
  min,
  max,
  step,
  suffix,
  prefix,
  hint,
  className,
}: NumberInputProps) {
  const autoId = useId()
  const inputId = id ?? autoId
  const [text, setText] = useState<string>(String(value))
  const focused = useRef(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Follow the store on external changes when not focused.
  useEffect(() => {
    if (!focused.current) setText(String(value))
  }, [value])

  const normalize = (raw: string): number | null => {
    const n = Number(raw)
    if (Number.isNaN(n)) return null
    // Integer fields (amounts, months) round whole; fields with a step (e.g. rate
    // % at step 0.01) keep their decimal and snap to the step instead.
    let v = step ? n : Math.round(n)
    if (min !== undefined) v = Math.max(min, v)
    if (max !== undefined) v = Math.min(max, v)
    if (step) v = Math.round(v / step) * step
    // Neutralise float noise from the step snap (e.g. 0.30000000000000004).
    return parseFloat(v.toPrecision(12))
  }

  const commit = (raw: string) => {
    const v = normalize(raw)
    if (v === null) return
    onCommit(v)
  }

  const scheduleCommit = (raw: string) => {
    if (timer.current) clearTimeout(timer.current)
    if (delayMs > 0) {
      timer.current = setTimeout(() => commit(raw), delayMs)
    } else {
      commit(raw)
    }
  }

  const settle = () => {
    focused.current = false
    if (timer.current) clearTimeout(timer.current)
    const v = normalize(text)
    if (v === null) {
      // Revert to the last valid store value if the field is unusable.
      setText(String(value))
      return
    }
    if (String(v) !== text) setText(String(v))
  }

  return (
    <label htmlFor={inputId} className={`block ${className ?? ''}`}>
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </span>
      <span className="flex">
        {prefix != null && (
          <span className="inline-flex items-center rounded-l-md border border-r-0 border-slate-300 bg-slate-100 px-2 text-sm tabular-nums text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {prefix}
          </span>
        )}
        <input
          id={inputId}
          inputMode="decimal"
          className={
            'w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm tabular-nums outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 ' +
            (prefix != null ? 'rounded-l-none' : '') +
            (suffix != null ? 'rounded-r-none' : '')
          }
          value={text}
          onFocus={() => {
            focused.current = true
          }}
          onBlur={settle}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.currentTarget.blur()
            }
          }}
          onChange={(e) => {
            setText(e.target.value)
            scheduleCommit(e.target.value)
          }}
          step={step}
          {...(min !== undefined ? { min } : {})}
          {...(max !== undefined ? { max } : {})}
        />
        {suffix != null && (
          <span className="inline-flex items-center rounded-r-md border border-l-0 border-slate-300 bg-slate-100 px-2 text-sm tabular-nums text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {suffix}
          </span>
        )}
      </span>
      {hint && <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">{hint}</span>}
    </label>
  )
}
