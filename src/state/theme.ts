import { useCallback } from 'react'
import { applyTheme, useDark } from '@/components/charts/useDark'

/** Exposes the theme and a toggle that persists the explicit choice. */
export function useTheme(): { dark: boolean; toggle: () => void } {
  const dark = useDark()
  const toggle = useCallback(() => applyTheme(!dark), [dark])
  return { dark, toggle }
}
