import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { getPreferences } from './preferences'

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
function getBtnSize(vw: number): number {
  if (vw < 360) return 42
  if (vw < 430) return 48
  if (vw < 768) return 52
  return 58
}

interface BtnProps {
  onPress: () => void
  onRelease?: () => void
  children: ReactNode
  style?: CSSProperties
  label?: string
  repeat?: boolean
}

function Btn({ onPress, onRelease, children, style, label, repeat = false }: BtnProps) {
  const [vw, setVw] = useState(() => (typeof window === 'undefined' ? 390 : window.innerWidth))
  const timersRef = useRef<{ delay: ReturnType<typeof setTimeout> | null; repeat: ReturnType<typeof setInterval> | null }>({
    delay: null,
    repeat: null,
  })

  useEffect(() => {
    const onResize = () => setVw(window.innerWidth)
    window.addEventListener('resize', onResize)
    window.addEventListener('orientationchange', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      window.removeEventListener('orientationchange', onResize)
    }
  }, [])

  const clearTimers = useCallback(() => {
    if (timersRef.current.delay) {
      clearTimeout(timersRef.current.delay)
      timersRef.current.delay = null
    }
    if (timersRef.current.repeat) {
      clearInterval(timersRef.current.repeat)
      timersRef.current.repeat = null
    }
  }, [])

  useEffect(() => clearTimers, [clearTimers])

  const size = getBtnSize(vw)

  const handlePress = useCallback(() => {
    clearTimers()
    onPress()
    if (!repeat) return
    timersRef.current.delay = setTimeout(() => {
      timersRef.current.repeat = setInterval(onPress, 40)
    }, 140)
  }, [clearTimers, onPress, repeat])

  const handleRelease = useCallback(() => {
    clearTimers()
    onRelease?.()
  }, [clearTimers, onRelease])

  return (
    <button
      aria-label={label}
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
      onPointerDown={e => { e.preventDefault(); handlePress() }}
      onPointerUp={e => { e.preventDefault(); handleRelease() }}
      onPointerLeave={e => { e.preventDefault(); handleRelease() }}
      onPointerCancel={e => { e.preventDefault(); handleRelease() }}
    >
      {children}
    </button>
  )
}

/** Invisible spacer to keep D-pad grid aligned */
function Spacer({ size }: { size: number }) {
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
  const [vw, setVw] = useState(() => (typeof window === 'undefined' ? 390 : window.innerWidth))
  const [leftHanded, setLeftHanded] = useState(() => getPreferences().leftHandedControls)

  useEffect(() => {
    const onResize = () => setVw(window.innerWidth)
    const onPreferencesChanged = () => setLeftHanded(getPreferences().leftHandedControls)
    window.addEventListener('resize', onResize)
    window.addEventListener('orientationchange', onResize)
    window.addEventListener('tetris-preferences-changed', onPreferencesChanged)
    return () => {
      window.removeEventListener('resize', onResize)
      window.removeEventListener('orientationchange', onResize)
      window.removeEventListener('tetris-preferences-changed', onPreferencesChanged)
    }
  }, [])

  const size = getBtnSize(vw)
  const gap = size < 50 ? 4 : 6
  const compact = vw < 520
  const wrapControls = vw < 680

  return (
    <div
      style={{
        position: 'sticky',
        bottom: 'max(10px, env(safe-area-inset-bottom))',
        zIndex: 30,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginTop: 12,
        padding: compact ? '0 6px 10px' : '0 4px 10px',
        width: '100%',
      }}
    >
      <div
        style={{
          width: 'min(100%, 560px)',
          borderRadius: 22,
          border: '1px solid rgba(255,255,255,0.08)',
          background: 'linear-gradient(180deg, rgba(17,24,39,0.88), rgba(3,7,18,0.94))',
          boxShadow: '0 14px 34px rgba(0,0,0,0.35)',
          backdropFilter: 'blur(14px)',
          padding: compact ? '10px 10px 12px' : '12px 14px 14px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.16em', color: 'rgba(255,255,255,0.72)', textTransform: 'uppercase' }}>
            Touch Controls
          </div>
          <div style={{ fontSize: 11, color: 'rgba(148,163,184,0.9)' }}>
            Hold ◀ ▶ ▼ for repeat
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: compact ? 'column' : leftHanded ? 'row-reverse' : 'row',
            flexWrap: wrapControls ? 'wrap' : 'nowrap',
            alignItems: 'center',
            justifyContent: 'center',
            gap: compact ? 10 : 16,
          }}
        >
          {/* Left side: D-pad cross */}
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(3, ${size}px)`, gridTemplateRows: `repeat(2, ${size}px)`, gap }}>
            <Spacer size={size} />
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
            <Spacer size={size} />

            <Btn
              onPress={onLeft}
              label="Move Left"
              repeat
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
              repeat
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
              repeat
              style={{
                background: 'rgba(255,255,255,0.12)',
                border: '2px solid rgba(255,255,255,0.25)',
              }}
            >
              ▶
            </Btn>
          </div>

          {/* Right side: hold + rotate */}
          <div style={{ display: 'flex', flexDirection: compact ? 'row' : 'column', alignItems: 'center', gap: 6 }}>
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
      </div>
    </div>
  )
}
