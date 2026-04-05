import { useState } from 'react'
import GravityTetris from './games/gravity/GravityTetris'
import ColorMatchTetris from './games/colorMatch/ColorMatchTetris'
import SlimeTetris from './games/slimeBlock/SlimeTetris'
import MirrorTetris from './games/mirror/MirrorTetris'
import SprintTetris from './games/sprint/SprintTetris'
import SettingsModal from './shared/SettingsModal'
import { formatPersonalBest, getPersonalBest } from './shared/personalBests'
import { usePreferences } from './shared/preferences'

type GameId = 'gravity' | 'colorMatch' | 'slime' | 'mirror' | 'sprint'

const GAMES: { id: GameId; title: string; tagline: string; desc: string; color: string; emoji: string; glow: string }[] = [
  {
    id: 'gravity',
    title: '重力反転テトリス',
    tagline: 'GRAVITY FLIP',
    desc: '一定時間ごとに重力が反転。上下どちらかが詰まったら終了。',
    color: 'from-indigo-600 to-purple-700',
    emoji: '🔄',
    glow: 'rgba(99,102,241,0.5)',
  },
  {
    id: 'colorMatch',
    title: '色マッチテトリス',
    tagline: 'COLOR MATCH',
    desc: 'ライン消去 + 同色4個隣接で同時消去。連鎖が決め手。',
    color: 'from-orange-500 to-pink-600',
    emoji: '🎨',
    glow: 'rgba(249,115,22,0.5)',
  },
  {
    id: 'slime',
    title: 'スライム×ブロック',
    tagline: 'SLIME BLOCK',
    desc: 'スライムは設置後に隙間へ流れ落ちる。見た目で見極めろ。',
    color: 'from-emerald-500 to-teal-600',
    emoji: '🟢',
    glow: 'rgba(16,185,129,0.5)',
  },
  {
    id: 'mirror',
    title: 'ミラーテトリス',
    tagline: 'MIRROR MODE',
    desc: '操作ピースと左右ミラーが同時落下。対称な美しいパターンを作れ。',
    color: 'from-purple-600 to-violet-700',
    emoji: '🪞',
    glow: 'rgba(139,92,246,0.5)',
  },
  {
    id: 'sprint',
    title: 'スプリントテトリス',
    tagline: '40 LINE SPRINT',
    desc: '40ラインをできるだけ速く消去。タイムを競え。',
    color: 'from-cyan-600 to-teal-600',
    emoji: '⚡',
    glow: 'rgba(6,182,212,0.5)',
  },
]

const VERSION = __APP_VERSION__

function VersionBadge() {
  return (
    <div
      style={{
        position: 'fixed',
        top: 8,
        right: 10,
        fontSize: 11,
        color: 'rgba(156,163,175,0.7)',
        fontVariantNumeric: 'tabular-nums',
        pointerEvents: 'none',
        zIndex: 9999,
        letterSpacing: '0.05em',
      }}
    >
      v{VERSION}
    </div>
  )
}

export default function App() {
  const [current, setCurrent] = useState<GameId | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const { preferences, updatePreference } = usePreferences()

  if (current === 'gravity') return <><VersionBadge /><GravityTetris onBack={() => setCurrent(null)} /></>
  if (current === 'colorMatch') return <><VersionBadge /><ColorMatchTetris onBack={() => setCurrent(null)} /></>
  if (current === 'slime') return <><VersionBadge /><SlimeTetris onBack={() => setCurrent(null)} /></>
  if (current === 'mirror') return <><VersionBadge /><MirrorTetris onBack={() => setCurrent(null)} /></>
  if (current === 'sprint') return <><VersionBadge /><SprintTetris onBack={() => setCurrent(null)} /></>

  return (
    <div className="menu-bg scanlines min-h-screen flex flex-col items-center justify-center gap-6 px-4 py-8 sm:px-6" style={{ position: 'relative' }}>
      <VersionBadge />

      {/* Title block */}
      <div className="relative z-10 text-center max-w-3xl">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/6 px-3 py-1 text-[11px] font-semibold tracking-[0.24em] text-cyan-300 uppercase backdrop-blur-sm">
          Arcade Experiment Lab
        </div>
        <h1
          className="mt-4 text-4xl font-black tracking-widest text-white sm:text-5xl"
          style={{
            textShadow: '0 0 30px rgba(99,102,241,0.8), 0 0 60px rgba(99,102,241,0.4)',
            letterSpacing: '0.2em',
          }}
        >
          STACK LAB
        </h1>
        <p className="text-indigo-400 text-sm tracking-[0.3em] uppercase mt-2 font-semibold">
          5 Variant Modes
        </p>
        <p className="mt-4 text-sm leading-relaxed text-white/70 sm:text-base">
          ルールごとに体験がまるごと変わる、実験寄りのテトリス集です。
          PC のキーボードでも、スマホ・タブレットのタッチ操作でもそのまま遊べます。
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-xs text-white/65">
          <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1">PC: ← → / Space / Shift</span>
          <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1">Touch: 画面下の操作パッド</span>
          <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1">Weekly Top 5 Leaderboard</span>
        </div>
        <div className="mt-5">
          <button
            onClick={() => setShowSettings(true)}
            className="rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm font-semibold text-white/80 transition-colors hover:bg-white/10 hover:text-white"
          >
            Settings
          </button>
        </div>
      </div>

      {/* Game cards */}
      <div className="relative z-10 grid w-full max-w-5xl grid-cols-1 gap-3 sm:grid-cols-2">
        {GAMES.map((g, index) => (
          <button
            key={g.id}
            onClick={() => setCurrent(g.id)}
            className={`game-card bg-gradient-to-r ${g.color} rounded-3xl p-4 text-left shadow-lg sm:p-5`}
            style={{
              boxShadow: `0 4px 20px ${g.glow}, 0 1px 3px rgba(0,0,0,0.5)`,
            }}
            aria-label={`${g.title} を開始`}
          >
            <div className="flex items-start gap-3">
              <div className="flex flex-col items-center gap-2 pt-1">
                <span className="text-3xl leading-none">{g.emoji}</span>
                <span className="rounded-full border border-white/20 bg-black/15 px-2 py-0.5 text-[10px] font-bold tracking-[0.2em] text-white/75">
                  {String(index + 1).padStart(2, '0')}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="text-white font-black text-base leading-tight sm:text-lg">{g.title}</span>
                  <span
                    className="text-white/50 font-bold text-[10px] tracking-widest uppercase"
                    style={{ letterSpacing: '0.15em' }}
                  >
                    {g.tagline}
                  </span>
                </div>
                <div className="mt-1 text-white/70 text-xs leading-relaxed sm:text-sm">{g.desc}</div>
                <div className="mt-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/55">
                  Best {formatPersonalBest(g.id, getPersonalBest(g.id))}
                </div>
                <div className="mt-3 inline-flex items-center gap-2 text-[11px] font-semibold text-white/80">
                  <span className="rounded-full bg-black/18 px-2.5 py-1">Play Now</span>
                  <span className="text-white/55">{g.tagline}</span>
                </div>
              </div>
              <span className="text-white/40 text-lg flex-shrink-0 pt-1">›</span>
            </div>
          </button>
        ))}
      </div>

      {/* フッター */}
      <div className="mt-4 text-center">
        <div className="mb-3 text-[11px] tracking-[0.16em] uppercase text-white/35">
          Built For Fast Retry, Weird Rules, And Weekly Score Chasing
        </div>
        <a
          href="/privacy.html"
          className="text-gray-600 hover:text-gray-400 text-xs transition-colors"
          target="_blank"
          rel="noopener noreferrer"
        >
          プライバシーポリシー
        </a>
      </div>

      {showSettings && (
        <SettingsModal
          preferences={preferences}
          onClose={() => setShowSettings(false)}
          onToggle={updatePreference}
        />
      )}
    </div>
  )
}
