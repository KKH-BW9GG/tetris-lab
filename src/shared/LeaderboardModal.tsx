import { useState } from 'react'
import type { ScoreEntry } from './leaderboard'
import { saveScore, saveTime } from './leaderboard'

interface Props {
  gameId: string
  score: number
  isTime?: boolean           // true = スプリントタイムモード（小さいほど良い）
  onClose: (entries: ScoreEntry[]) => void
}

function formatTime(ms: number): string {
  const m = Math.floor(ms / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  const cs = Math.floor((ms % 1000) / 10)
  return `${m}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`
}

export default function LeaderboardModal({ gameId, score, isTime = false, onClose }: Props) {
  const [name, setName] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [entries, setEntries] = useState<ScoreEntry[]>([])

  const handleSubmit = () => {
    const trimmed = name.trim().slice(0, 8) || 'AAA'
    const promise = isTime
      ? saveTime(gameId, trimmed, score)
      : saveScore(gameId, trimmed, score)
    promise.then((saved) => {
      setEntries(saved)
      setSubmitted(true)
    }).catch(() => {
      setSubmitted(true)
    })
  }

  const displayScore = isTime ? formatTime(score) : score.toLocaleString()

  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.88)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 9999,
        backdropFilter: 'blur(4px)',
        padding: '16px',
      }}
    >
      <div
        className="modal-enter"
        style={{
          background: 'linear-gradient(160deg, #111827 0%, #0d1424 100%)',
          border: '2px solid',
          borderColor: '#6366f1',
          borderRadius: 20,
          padding: '28px 32px',
          width: 'min(340px, calc(100vw - 32px))',
          maxWidth: 340,
          textAlign: 'center',
          color: '#fff',
          boxShadow: '0 0 40px rgba(99,102,241,0.4), 0 20px 60px rgba(0,0,0,0.7)',
          position: 'relative',
          overflow: 'hidden',
          maxHeight: 'min(640px, calc(100dvh - 32px))',
          overflowY: 'auto',
        }}
      >
        {/* 背景グロー */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.12) 0%, transparent 60%)',
          pointerEvents: 'none',
        }} />

        {/* ランクイン演出 */}
        <div style={{ fontSize: 32, marginBottom: 2 }}>🏆</div>
        <div style={{ fontSize: 22, fontWeight: 900, color: '#fbbf24', marginBottom: 2,
          textShadow: '0 0 20px rgba(251,191,36,0.7)' }}>
          TOP 5 ランクイン！
        </div>
        <div style={{ color: '#9ca3af', fontSize: 12, marginBottom: 14, letterSpacing: '0.05em' }}>
          今週のベスト5入り
        </div>
        <div style={{
          fontSize: 24, fontWeight: 700, color: '#a5f3fc', marginBottom: 18,
          textShadow: '0 0 12px rgba(165,243,252,0.5)',
        }}>
          {isTime ? 'タイム：' : 'スコア：'}{displayScore}
        </div>

        {!submitted ? (
          <>
            <div style={{ color: '#d1d5db', fontSize: 12, marginBottom: 8, letterSpacing: '0.05em' }}>
              名前を入力（最大8文字）
            </div>
            <input
              autoFocus
              maxLength={8}
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              placeholder="AAA"
              style={{
                width: '100%', padding: '10px 14px',
                background: '#1f2937',
                border: '2px solid #4b5563',
                borderRadius: 10, color: '#fff', fontSize: 16,
                textAlign: 'center', letterSpacing: '0.15em',
                marginBottom: 14, boxSizing: 'border-box',
                outline: 'none',
                transition: 'border-color 0.15s',
                fontWeight: 700,
              }}
              onFocus={e => { e.currentTarget.style.borderColor = '#6366f1' }}
              onBlur={e => { e.currentTarget.style.borderColor = '#4b5563' }}
            />
            <button
              onClick={handleSubmit}
              style={{
                width: '100%', padding: '11px',
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                borderRadius: 10,
                color: '#fff', fontWeight: 700, fontSize: 15,
                border: 'none', cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(99,102,241,0.5)',
                letterSpacing: '0.05em',
                transition: 'transform 0.1s, box-shadow 0.1s',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(99,102,241,0.65)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 4px 16px rgba(99,102,241,0.5)' }}
            >
              登録する
            </button>
          </>
        ) : (
          <>
            <div style={{ color: '#86efac', marginBottom: 16, fontWeight: 700, fontSize: 15,
              textShadow: '0 0 12px rgba(134,239,172,0.5)' }}>
              ✓ 登録完了！
            </div>
            <WeeklyTable entries={entries} isTime={isTime} />
            <button
              onClick={() => onClose(entries)}
              style={{
                marginTop: 16, width: '100%', padding: '10px',
                background: '#1f2937',
                border: '1px solid #374151',
                borderRadius: 10,
                color: '#9ca3af', fontWeight: 700, fontSize: 14,
                cursor: 'pointer',
                transition: 'background 0.15s, color 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#374151'; e.currentTarget.style.color = '#e5e7eb' }}
              onMouseLeave={e => { e.currentTarget.style.background = '#1f2937'; e.currentTarget.style.color = '#9ca3af' }}
            >
              閉じる
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export function WeeklyTable({ entries, isTime = false }: { entries: ScoreEntry[]; isTime?: boolean }) {
  if (entries.length === 0) return null

  function fmtScore(score: number) {
    if (!isTime) return score.toLocaleString()
    const m = Math.floor(score / 60000)
    const s = Math.floor((score % 60000) / 1000)
    const cs = Math.floor((score % 1000) / 10)
    return `${m}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`
  }

  const medals = ['🥇', '🥈', '🥉']
  const rankColors = ['#fbbf24', '#d1d5db', '#cd7c2e', '#6b7280', '#6b7280']
  const rankBg = [
    'linear-gradient(90deg, rgba(251,191,36,0.18) 0%, rgba(251,191,36,0.05) 100%)',
    'linear-gradient(90deg, rgba(209,213,219,0.12) 0%, rgba(209,213,219,0.03) 100%)',
    'linear-gradient(90deg, rgba(180,120,40,0.12) 0%, rgba(180,120,40,0.03) 100%)',
    'rgba(255,255,255,0.03)',
    'rgba(255,255,255,0.03)',
  ]

  return (
    <div style={{ marginTop: 8, width: '100%' }}>
      <div style={{ color: '#6b7280', fontSize: 10, marginBottom: 6, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
        今週のランキング
      </div>
      {entries.map((e, i) => (
        <div
          key={i}
          style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '5px 10px', borderRadius: 8,
            background: rankBg[i] ?? 'rgba(255,255,255,0.03)',
            marginBottom: 3, fontSize: 13,
            border: i === 0 ? '1px solid rgba(251,191,36,0.25)' : '1px solid transparent',
          }}
        >
          <span style={{ color: rankColors[i] ?? '#6b7280', fontWeight: i < 3 ? 700 : 400, display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ minWidth: 20 }}>{medals[i] ?? `${i + 1}.`}</span>
            <span>{e.name}</span>
          </span>
          <span style={{ color: '#e5e7eb', fontVariantNumeric: 'tabular-nums', fontWeight: 600, fontSize: 12 }}>
            {fmtScore(e.score)}
          </span>
        </div>
      ))}
    </div>
  )
}
