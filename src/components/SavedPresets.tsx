import { useState } from 'react'
import { useMortgageStore } from '@/state/store'
import { useSavedPresetActions, useSavedPresets } from '@/state/presets'
import { Card } from '@/components/ui/Card'

/**
 * User-named presets backed by localStorage. Mirrors the "Start from" chips:
 * pick one to load its plan into the calculator; ✕ deletes it.
 */
export function SavedPresets() {
  const presets = useSavedPresets()
  const config = useMortgageStore((s) => s.config)
  const replaceConfig = useMortgageStore((s) => s.replaceConfig)
  const { save, remove } = useSavedPresetActions()
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)

  const onSave = () => {
    if (name.trim().length === 0) {
      setError('Give the preset a name first')
      return
    }
    try {
      save(name, config)
      setName('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save preset')
      return
    }
    setError(null)
  }

  const onRemove = (id: string, presetName: string) => {
    if (window.confirm(`Delete preset "${presetName}"?`)) {
      remove(id)
    }
  }

  return (
    <Card
      title="Saved presets"
      subtitle="Your named plans, stored in this browser"
      actions={
        <button
          type="button"
          onClick={onSave}
          disabled={name.trim().length === 0}
          className="rounded-md bg-brand-600 px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Save current
        </button>
      }
    >
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.target.value)
            setError(null)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              onSave()
            }
          }}
          placeholder="e.g. Best deal, after windfall"
          aria-label="Name for the new preset"
          className="w-full min-w-0 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-800 placeholder:text-slate-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
        />
      </div>
      {error && (
        <p role="alert" className="mt-2 text-xs font-medium text-rose-600 dark:text-rose-400">
          {error}
        </p>
      )}

      {presets.length === 0 ? (
        <p className="mt-3 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
          Nothing saved yet. Set up a plan and press <em>Save current</em> to keep it here with a
          name — handy for comparing scenarios on this device.
        </p>
      ) : (
        <ul className="mt-3 space-y-1.5" aria-label="saved presets">
          {presets.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-2.5 py-1.5 dark:border-slate-700"
            >
              <button
                type="button"
                aria-label={`Load preset ${p.name}`}
                onClick={() => replaceConfig(structuredClone(p.config))}
                className="min-w-0 flex-1 truncate text-left text-sm font-medium text-slate-700 hover:text-brand-600 dark:text-slate-200 dark:hover:text-brand-300"
                title="Load this preset"
              >
                {p.name}
              </button>
              <button
                type="button"
                aria-label={`Delete preset ${p.name}`}
                onClick={() => onRemove(p.id, p.name)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-base leading-none text-slate-400 hover:bg-slate-100 hover:text-rose-600 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-rose-400"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
