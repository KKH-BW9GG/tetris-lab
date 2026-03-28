/**
 * 週間ベストスコア管理
 * localStorage に保存。週は月曜始まり。
 */

export interface ScoreEntry {
  name: string
  score: number
  date: string  // ISO date string
}

const TOP_N = 5

function getWeekKey(gameId: string): string {
  const now = new Date()
  // 月曜始まりの週番号
  const day = now.getDay() === 0 ? 6 : now.getDay() - 1  // 0=Mon
  const monday = new Date(now)
  monday.setDate(now.getDate() - day)
  const iso = monday.toISOString().slice(0, 10)
  return `tetris_weekly_${gameId}_${iso}`
}

export function getWeeklyScores(gameId: string): ScoreEntry[] {
  try {
    const raw = localStorage.getItem(getWeekKey(gameId))
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

/** スコアが週間トップ5に入るか判定 */
export function isTopScore(gameId: string, score: number): boolean {
  const scores = getWeeklyScores(gameId)
  if (scores.length < TOP_N) return true
  return score > scores[scores.length - 1].score
}

/** スコアを追加して保存。追加後のランキングを返す */
export function saveScore(gameId: string, name: string, score: number): ScoreEntry[] {
  const scores = getWeeklyScores(gameId)
  const entry: ScoreEntry = { name, score, date: new Date().toISOString() }
  const updated = [...scores, entry]
    .sort((a, b) => b.score - a.score)
    .slice(0, TOP_N)
  try {
    localStorage.setItem(getWeekKey(gameId), JSON.stringify(updated))
  } catch {
    // localStorage 失敗は無視
  }
  return updated
}

/** スプリント用: タイム（ミリ秒）でランキング（小さいほど良い） */
export function isTopTime(gameId: string, timeMs: number): boolean {
  const scores = getWeeklyScores(gameId)
  if (scores.length < TOP_N) return true
  return timeMs < scores[scores.length - 1].score  // score フィールドに timeMs を入れる
}

export function saveTime(gameId: string, name: string, timeMs: number): ScoreEntry[] {
  const scores = getWeeklyScores(gameId)
  const entry: ScoreEntry = { name, score: timeMs, date: new Date().toISOString() }
  const updated = [...scores, entry]
    .sort((a, b) => a.score - b.score)  // 昇順（タイムは小さいほど良い）
    .slice(0, TOP_N)
  try {
    localStorage.setItem(getWeekKey(gameId), JSON.stringify(updated))
  } catch {}
  return updated
}
