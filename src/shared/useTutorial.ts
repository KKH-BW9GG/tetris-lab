import { useCallback, useState } from 'react'
import { getPreferences } from './preferences'

type TutorialGameId = 'gravity' | 'colorMatch' | 'slime' | 'mirror' | 'sprint'

const STORAGE_KEY = 'tetris_tutorial_seen_v1'

function getSeenMap(): Partial<Record<TutorialGameId, boolean>> {
  if (typeof window === 'undefined') return {}

  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Partial<Record<TutorialGameId, boolean>>) : {}
  } catch {
    return {}
  }
}

function setSeen(gameId: TutorialGameId): void {
  if (typeof window === 'undefined') return

  try {
    const next = { ...getSeenMap(), [gameId]: true }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // Ignore persistence failures.
  }
}

export function useTutorial(gameId: TutorialGameId) {
  const [visible, setVisible] = useState(() => {
    const seen = getSeenMap()[gameId]
    return !seen && getPreferences().showTutorials
  })

  const dismiss = useCallback(() => {
    setSeen(gameId)
    setVisible(false)
  }, [gameId])

  const reopen = useCallback(() => {
    setVisible(true)
  }, [])

  return {
    visible,
    dismiss,
    reopen,
  }
}
