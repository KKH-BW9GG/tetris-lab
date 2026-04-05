import { useCallback, useEffect, useState } from 'react'

export interface Preferences {
  musicEnabled: boolean
  sfxEnabled: boolean
  showTutorials: boolean
  leftHandedControls: boolean
}

const STORAGE_KEY = 'tetris_preferences_v1'

const DEFAULT_PREFERENCES: Preferences = {
  musicEnabled: true,
  sfxEnabled: true,
  showTutorials: true,
  leftHandedControls: false,
}

function isPreferences(value: unknown): value is Partial<Preferences> {
  return typeof value === 'object' && value !== null
}

export function getPreferences(): Preferences {
  if (typeof window === 'undefined') return DEFAULT_PREFERENCES

  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_PREFERENCES
    const parsed: unknown = JSON.parse(raw)
    if (!isPreferences(parsed)) return DEFAULT_PREFERENCES
    return {
      musicEnabled: parsed.musicEnabled ?? DEFAULT_PREFERENCES.musicEnabled,
      sfxEnabled: parsed.sfxEnabled ?? DEFAULT_PREFERENCES.sfxEnabled,
      showTutorials: parsed.showTutorials ?? DEFAULT_PREFERENCES.showTutorials,
      leftHandedControls:
        parsed.leftHandedControls ?? DEFAULT_PREFERENCES.leftHandedControls,
    }
  } catch {
    return DEFAULT_PREFERENCES
  }
}

export function savePreferences(next: Preferences): void {
  if (typeof window === 'undefined') return

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // Ignore preference persistence failures.
  }

  window.dispatchEvent(new CustomEvent('tetris-preferences-changed'))
}

export function usePreferences() {
  const [preferences, setPreferences] = useState<Preferences>(getPreferences)

  useEffect(() => {
    const sync = () => setPreferences(getPreferences())
    window.addEventListener('storage', sync)
    window.addEventListener('tetris-preferences-changed', sync)
    return () => {
      window.removeEventListener('storage', sync)
      window.removeEventListener('tetris-preferences-changed', sync)
    }
  }, [])

  const updatePreference = useCallback(
    <K extends keyof Preferences>(key: K, value: Preferences[K]) => {
      const next = { ...preferences, [key]: value }
      setPreferences(next)
      savePreferences(next)
    },
    [preferences],
  )

  return { preferences, updatePreference }
}
