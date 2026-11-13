import { useEffect, useState } from 'react'

const mq = typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: dark)') : null
export const THEME_KEY = 'mortgage-calc-theme'

export function applyTheme(dark: boolean): void {
  document.documentElement.classList.toggle('dark', dark)
  try {
    localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light')
  } catch {
    /* private mode */
  }
}

/** Current theme: explicit override (localStorage) wins, else OS preference. */
export function isDarkNow(): boolean {
  try {
    const stored = localStorage.getItem(THEME_KEY)
    if (stored) return stored === 'dark'
  } catch {
    /* private mode */
  }
  return mq?.matches ?? false
}

// The resolved class is applied once per document, at module load, *without*
// persisting the choice, so an explicit user setting keeps winning and a pure
// OS-driven choice is never locked in as an explicit one.
if (typeof document !== 'undefined') {
  applyTheme(isDarkNow())
}

export function useDark(): boolean {
  const [dark, setDark] = useState<boolean>(() => isDarkNow())
  useEffect(() => {
    const read = () => setDark(document.documentElement.classList.contains('dark'))
    const mo = new MutationObserver(read)
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    mq?.addEventListener('change', read)
    return () => {
      mo.disconnect()
      mq?.removeEventListener('change', read)
    }
  }, [])
  return dark
}
