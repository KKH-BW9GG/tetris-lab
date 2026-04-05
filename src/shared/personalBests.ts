export type PersonalBestGameId =
  | 'gravity'
  | 'colorMatch'
  | 'slime'
  | 'mirror'
  | 'sprint'

interface PersonalBestEntry {
  value: number
  updatedAt: string
}

type PersonalBestMap = Partial<Record<PersonalBestGameId, PersonalBestEntry>>

const STORAGE_KEY = 'tetris_personal_bests_v1'

function getAllPersonalBests(): PersonalBestMap {
  if (typeof window === 'undefined') return {}

  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as PersonalBestMap) : {}
  } catch {
    return {}
  }
}

function saveAllPersonalBests(next: PersonalBestMap): void {
  if (typeof window === 'undefined') return

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // Ignore persistence failures.
  }
}

export function getPersonalBest(gameId: PersonalBestGameId): number | null {
  return getAllPersonalBests()[gameId]?.value ?? null
}

export function recordPersonalBest(
  gameId: PersonalBestGameId,
  value: number,
  lowerIsBetter = false,
): { improved: boolean; best: number } {
  const current = getPersonalBest(gameId)
  if (current !== null) {
    const improved = lowerIsBetter ? value < current : value > current
    if (!improved) return { improved: false, best: current }
  }

  const next = {
    ...getAllPersonalBests(),
    [gameId]: {
      value,
      updatedAt: new Date().toISOString(),
    },
  }
  saveAllPersonalBests(next)
  return { improved: true, best: value }
}

export function formatPersonalBest(
  gameId: PersonalBestGameId,
  value: number | null,
): string {
  if (value === null) return 'No record yet'
  if (gameId === 'sprint') {
    const m = Math.floor(value / 60000)
    const s = Math.floor((value % 60000) / 1000)
    const cs = Math.floor((value % 1000) / 10)
    return `${m}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`
  }
  return value.toLocaleString()
}
