import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(() => {
  cleanup()
  localStorage.clear()
})

// jsdom in this environment exposes a `localStorage` object WITHOUT the Storage
// methods (getItem/setItem/removeItem are undefined), which crashes any code
// that touches it — even at import time. Install a minimal in-memory Storage
// implementation so localStorage behaves like a real browser (and is cleared
// between tests via the standard `localStorage.clear()`).
function installLocalStorage(): void {
  const hasStorage = (v: unknown): v is Storage =>
    v != null && typeof (v as Storage).getItem === 'function'

  try {
    if (hasStorage(globalThis.localStorage)) return
  } catch {
    // access threw — treat as missing
  }

  const backing = new Map<string, string>()
  const impl: Storage = {
    get length() {
      return backing.size
    },
    clear() {
      backing.clear()
    },
    getItem(key: string) {
      return backing.has(key) ? backing.get(key)! : null
    },
    key(i: number) {
      return Array.from(backing.keys())[i] ?? null
    },
    removeItem(key: string) {
      backing.delete(key)
    },
    setItem(key: string, value: string) {
      backing.set(key, String(value))
    },
  }
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    writable: true,
    value: impl,
  })
}

installLocalStorage()

// jsdom lacks these browser APIs that the chart/theme layer touches at import
// time. Stub them globally so any component (or the full app) can render.
if (typeof window !== 'undefined') {
  if (!window.matchMedia) {
    window.matchMedia = ((q: string) =>
      ({
        matches: false,
        media: q,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      }) as MediaQueryList) as typeof window.matchMedia
  }
  if (!('ResizeObserver' in globalThis)) {
    ;(globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  }
}
