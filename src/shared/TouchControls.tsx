import type { CSSProperties, ReactNode } from 'react'

interface Props {
  onLeft: () => void
  onRight: () => void
  onSoftDropStart: () => void
  onSoftDropEnd: () => void
  onRotate: () => void
  onHardDrop: () => void
  onHold?: () => void
}

/** Responsive button size: shrink on small screens */
function getBtnSize(): number {
  if (typeof window === 'undefined') return 56
  const vw = window.innerWidth
  if (vw < 360) return 44
  if (vw < 420) return 50
  return 56
}

interface BtnProps {
  onPress: () => void
  onRelease?: () => void
  children: ReactNode
  style?: CSSProperties
  label?: string
}

function Btn({ onPress, onRelease, children, style }: BtnProps) {
  const size = getBtnSize()
  return (
    <button
      className="touch-btn"
      style={{
        width: size,
        height: size,
        borderRadius: 12,
        background: 'rgba(255,255,255,0.1)',
        border: '2px solid rgba(255,255,255,0.2)',
        color: '#ffffff',
        fontSize: size < 50 ? 20 : 24,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        userSelect: 'none',
        touchAction: 'manipulation',
        WebkitTapHighlightColor: 'transparent',
        cursor: 'pointer',
        boxShadow: '0 4px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.15)',
        ...style,
      }}
      onPointerDown={e => { e.preventDefault(); onPress() }}
      onPointerUp={e => { e.preventDefault(); onRelease?.() }}
      onPointerLeave={e => { e.preventDefault(); onRelease?.() }}
    >
      {children}
    </button>
  )
}

/** Invisible spacer to keep D-pad grid aligned */
function Spacer() {
  const size = getBtnSize()
  return <div style={{ width: size, height: size }} />
}

export default function TouchControls({
  onLeft,
  onRight,
  onSoftDropStart,
  onSoftDropEnd,
  onRotate,
  onHardDrop,
  onHold,
}: Props) {
  const size = getBtnSize()
  const gap = size < 50 ? 4 : 6

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        marginTop: 8,
        padding: '0 4px',
      }}
    >
      {/* Left side: D-pad cross */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(3, ${size}px)`, gridTemplateRows: `repeat(2, ${size}px)`, gap }}>
        <Spacer />
        <Btn
          onPress={onHardDrop}
          label="Hard Drop"
          style={{
            background: 'rgba(99,102,241,0.35)',
            border: '2px solid rgba(99,102,241,0.7)',
            boxShadow: '0 4px 12px rgba(99,102,241,0.4), inset 0 1px 0 rgba(255,255,255,0.15)',
          }}
        >
          ⬆
        </Btn>
        <Spacer />

        <Btn
          onPress={onLeft}
          label="Move Left"
          style={{
            background: 'rgba(255,255,255,0.12)',
            border: '2px solid rgba(255,255,255,0.25)',
          }}
        >
          ◀
        </Btn>
        <Btn
          onPress={onSoftDropStart}
          onRelease={onSoftDropEnd}
          label="Soft Drop"
          style={{
            background: 'rgba(255,255,255,0.08)',
            border: '2px solid rgba(255,255,255,0.18)',
          }}
        >
          ▼
        </Btn>
        <Btn
          onPress={onRight}
          label="Move Right"
          style={{
            background: 'rgba(255,255,255,0.12)',
            border: '2px solid rgba(255,255,255,0.25)',
          }}
        >
          ▶
        </Btn>
      </div>

      {/* Right side: hold + rotate */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
        {onHold && (
          <Btn
            onPress={onHold}
            label="Hold"
            style={{
              width: size - 8,
              height: size - 8,
              borderRadius: 10,
              background: 'rgba(148,163,184,0.15)',
              border: '2px solid rgba(148,163,184,0.4)',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.05em',
            }}
          >
            HOLD
          </Btn>
        )}
        <Btn
          onPress={onRotate}
          label="Rotate"
          style={{
            width: size + 8,
            height: size + 8,
            borderRadius: '50%',
            background: 'rgba(251,191,36,0.3)',
            border: '2px solid rgba(251,191,36,0.65)',
            boxShadow: '0 4px 14px rgba(251,191,36,0.35), inset 0 1px 0 rgba(255,255,255,0.2)',
            fontSize: size < 50 ? 24 : 28,
          }}
        >
          ↻
        </Btn>
      </div>
    </div>
  )
}
