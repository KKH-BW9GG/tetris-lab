/**
 * 週間ベストスコア管理
 * localStorage に保存。週は月曜始まり。
 */

export interface ScoreEntry {
  name: string
  score: number
  date: string  // ISO date string
  sig?: string  // HMAC-SHA256 署名（改ざん検出用）
}

// ---- 署名ユーティリティ ----

const SIGN_SECRET = 'stacklab-v1'

async function signEntry(entry: ScoreEntry): Promise<string> {
  const data = `${entry.name}:${entry.score}:${entry.date}`
  const encoder = new TextEncoder()
  const keyData = encoder.encode(SIGN_SECRET)
  const msgData = encoder.encode(data)
  const key = await crypto.subtle.importKey(
    'raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, msgData)
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function verifyEntry(entry: ScoreEntry): Promise<boolean> {
  // sig なし（古いデータ等）は通過させる
  if (!entry.sig) return true
  const expected = await signEntry(entry)
  return expected === entry.sig
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
export async function saveScore(gameId: string, name: string, score: number): Promise<ScoreEntry[]> {
  const scores = getWeeklyScores(gameId)
  const entry: ScoreEntry = { name, score, date: new Date().toISOString() }
  entry.sig = await signEntry(entry)
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

export async function saveTime(gameId: string, name: string, timeMs: number): Promise<ScoreEntry[]> {
  const scores = getWeeklyScores(gameId)
  const entry: ScoreEntry = { name, score: timeMs, date: new Date().toISOString() }
  entry.sig = await signEntry(entry)
  const updated = [...scores, entry]
    .sort((a, b) => a.score - b.score)  // 昇順（タイムは小さいほど良い）
    .slice(0, TOP_N)
  try {
    localStorage.setItem(getWeekKey(gameId), JSON.stringify(updated))
  } catch {}
  return updated
}
