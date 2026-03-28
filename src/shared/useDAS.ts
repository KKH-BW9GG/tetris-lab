import { useCallback, useEffect, useRef } from 'react'

// Delayed Auto Shift: 初回移動後 DAS_MS 待って ARR_MS ごとに連射
const DAS_MS = 133
const ARR_MS = 33

export function useDAS(onLeft: () => void, onRight: () => void) {
  const dirRef = useRef<'left' | 'right' | null>(null)
  const dasTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const arrTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const clearTimers = useCallback(() => {
    if (dasTimerRef.current !== null) { clearTimeout(dasTimerRef.current); dasTimerRef.current = null }
    if (arrTimerRef.current !== null) { clearInterval(arrTimerRef.current); arrTimerRef.current = null }
  }, [])

  const startDAS = useCallback((dir: 'left' | 'right') => {
    clearTimers()
    dirRef.current = dir
    const move = dir === 'left' ? onLeft : onRight
    move() // 即時1回
    dasTimerRef.current = setTimeout(() => {
      arrTimerRef.current = setInterval(() => {
        if (dirRef.current === dir) move()
      }, ARR_MS)
    }, DAS_MS)
  }, [onLeft, onRight, clearTimers])

  const stopDAS = useCallback(() => {
    dirRef.current = null
    clearTimers()
  }, [clearTimers])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return
      if (e.key === 'ArrowLeft') startDAS('left')
      else if (e.key === 'ArrowRight') startDAS('right')
    }
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') stopDAS()
    }
    const onBlur = () => stopDAS()
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', onBlur)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', onBlur)
      clearTimers()
    }
  }, [startDAS, stopDAS, clearTimers])

  return { startDAS, stopDAS }
}
