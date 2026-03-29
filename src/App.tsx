import { useState } from 'react'
import GravityTetris from './games/gravity/GravityTetris'
import ColorMatchTetris from './games/colorMatch/ColorMatchTetris'
import SlimeTetris from './games/slimeBlock/SlimeTetris'
import MirrorTetris from './games/mirror/MirrorTetris'
import SprintTetris from './games/sprint/SprintTetris'

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

  if (current === 'gravity') return <><VersionBadge /><GravityTetris onBack={() => setCurrent(null)} /></>
  if (current === 'colorMatch') return <><VersionBadge /><ColorMatchTetris onBack={() => setCurrent(null)} /></>
  if (current === 'slime') return <><VersionBadge /><SlimeTetris onBack={() => setCurrent(null)} /></>
  if (current === 'mirror') return <><VersionBadge /><MirrorTetris onBack={() => setCurrent(null)} /></>
  if (current === 'sprint') return <><VersionBadge /><SprintTetris onBack={() => setCurrent(null)} /></>

  return (
    <div className="menu-bg scanlines min-h-screen flex flex-col items-center justify-center gap-6 p-6" style={{ position: 'relative' }}>
      <VersionBadge />

      {/* Title block */}
      <div className="relative z-10 text-center">
        <h1
          className="text-5xl font-black tracking-widest text-white"
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
      </div>

      {/* Game cards */}
      <div className="relative z-10 flex flex-col gap-3 w-full max-w-sm">
        {GAMES.map(g => (
          <button
            key={g.id}
            onClick={() => setCurrent(g.id)}
            className={`game-card bg-gradient-to-r ${g.color} rounded-2xl p-4 text-left shadow-lg`}
            style={{
              boxShadow: `0 4px 20px ${g.glow}, 0 1px 3px rgba(0,0,0,0.5)`,
            }}
          >
            <div className="flex items-center gap-3">
              <span className="text-3xl leading-none">{g.emoji}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-white font-black text-base leading-tight">{g.title}</span>
                  <span
                    className="text-white/50 font-bold text-[10px] tracking-widest uppercase"
                    style={{ letterSpacing: '0.15em' }}
                  >
                    {g.tagline}
                  </span>
                </div>
                <div className="text-white/65 text-xs mt-0.5 leading-relaxed">{g.desc}</div>
              </div>
              <span className="text-white/40 text-lg flex-shrink-0">›</span>
            </div>
          </button>
        ))}
      </div>

      {/* フッター */}
      <div className="mt-8 text-center">
        <a
          href="/privacy.html"
          className="text-gray-600 hover:text-gray-400 text-xs transition-colors"
          target="_blank"
          rel="noopener noreferrer"
        >
          プライバシーポリシー
        </a>
      </div>
    </div>
  )
}
