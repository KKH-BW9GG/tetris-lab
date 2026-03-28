import type { CSSProperties, ReactNode } from 'react'

interface Props {
  onLeft: () => void
  onRight: () => void
  onSoftDropStart: () => void
  onSoftDropEnd: () => void
  onRotate: () => void
  onHardDrop: () => void
}

interface BtnProps {
  onPress: () => void
  onRelease?: () => void
  children: ReactNode
  style?: CSSProperties
  label?: string
}

function Btn({ onPress, onRelease, children, style, label }: BtnProps) {
  return (
    <button
      aria-label={label}
      className="touch-btn"
      style={{
        width: 64,
        height: 64,
        borderRadius: 14,
        background: 'rgba(255,255,255,0.1)',
        border: '2px solid rgba(255,255,255,0.2)',
        color: '#ffffff',
        fontSize: 26,
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
  return <div style={{ width: 64, height: 64 }} />
}

export default function TouchControls({
  onLeft,
  onRight,
  onSoftDropStart,
  onSoftDropEnd,
  onRotate,
  onHardDrop,
}: Props) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 24,
        marginTop: 16,
        padding: '0 8px',
      }}
    >
      {/* Left side: D-pad cross (left / down / right in a row, up in center top) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 64px)', gridTemplateRows: 'repeat(2, 64px)', gap: 6 }}>
        {/* Row 1: empty | hard-drop | empty */}
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

        {/* Row 2: left | soft-drop | right */}
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

      {/* Right side: rotate button (large, prominent) */}
      <Btn
        onPress={onRotate}
        label="Rotate"
        style={{
          width: 72,
          height: 72,
          borderRadius: '50%',
          background: 'rgba(251,191,36,0.3)',
          border: '2px solid rgba(251,191,36,0.65)',
          boxShadow: '0 4px 14px rgba(251,191,36,0.35), inset 0 1px 0 rgba(255,255,255,0.2)',
          fontSize: 30,
        }}
      >
        ↻
      </Btn>
    </div>
  )
}
