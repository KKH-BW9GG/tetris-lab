import { useCallback, useEffect, useRef, useState } from 'react'
import type { Board, Piece } from '../../shared/types'
import { randomTetromino } from '../../shared/tetrominos'
import {
  createEmptyBoard,
  rotateCW,
  isColliding,
  mergePieceToBoard,
  getFullLines,
  clearLines,
  spawnX,
} from '../../shared/gameUtils'
import {
  soundMove,
  soundRotate,
  soundLand,
  soundClear1,
  soundClearMulti,
  soundTetris,
  soundGameOver,
  soundSprintComplete,
} from '../../shared/sound'

export const TARGET_LINES = 40
const DROP_MS = 400
const SOFT_MS = 50

export interface SprintTetrisState {
  board: Board
  piece: Piece | null
  nextPiece: Piece
  lines: number
  elapsedMs: number
  finished: boolean
  gameOver: boolean
  waiting: boolean  // true = キー入力待ち（タイマー未開始）
  paused: boolean
  flashingRows: number[]
}

function createPiece(): Piece {
  const tmpl = randomTetromino()
  return { shape: tmpl.shape, color: tmpl.color, x: spawnX(tmpl.shape), y: 0 }
}

function createInitialState(): SprintTetrisState {
  return {
    board: createEmptyBoard(),
    piece: createPiece(),
    nextPiece: createPiece(),
    lines: 0,
    elapsedMs: 0,
    finished: false,
    gameOver: false,
    waiting: true,
    paused: false,
    flashingRows: [],
  }
}

export function useSprintTetris() {
  const [state, setState] = useState<SprintTetrisState>(createInitialState)
  const [softDrop, setSoftDrop] = useState(false)

  const gameOverRef = useRef(false)
  const finishedRef = useRef(false)
  const waitingRef = useRef(true)
  const pausedRef = useRef(false)

  // タイマー管理: 10msごとに更新、50msごとにstateを反映
  const elapsedMsRef = useRef(0)
  const timerStartedRef = useRef(false)
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const startTimer = useCallback(() => {
    if (timerStartedRef.current) return
    timerStartedRef.current = true
    elapsedMsRef.current = 0

    let ticksSinceUpdate = 0
    timerIntervalRef.current = setInterval(() => {
      if (gameOverRef.current || finishedRef.current || pausedRef.current) return
      elapsedMsRef.current += 10
      ticksSinceUpdate++
      if (ticksSinceUpdate >= 5) {
        ticksSinceUpdate = 0
        const ms = elapsedMsRef.current
        setState(prev => ({ ...prev, elapsedMs: ms }))
      }
    }, 10)
  }, [])

  const stopTimer = useCallback(() => {
    if (timerIntervalRef.current !== null) {
      clearInterval(timerIntervalRef.current)
      timerIntervalRef.current = null
    }
    timerStartedRef.current = false
  }, [])

  // -------------------------------------------------------
  // dropTick
  // -------------------------------------------------------
  const dropTick = useCallback(() => {
    if (gameOverRef.current || finishedRef.current || waitingRef.current || pausedRef.current) return
    setState(prev => {
      if (!prev.piece || prev.gameOver || prev.finished || prev.waiting || prev.paused) return prev

      const moved: Piece = { ...prev.piece, y: prev.piece.y + 1 }
      if (!isColliding(prev.board, moved)) {
        return { ...prev, piece: moved }
      }

      // ピース固定
      soundLand()
      const merged = mergePieceToBoard(prev.board, prev.piece, 'block')
      const fullLines = getFullLines(merged)
      const clearedCount = fullLines.length
      const cleared = clearedCount > 0 ? clearLines(merged, fullLines) : merged
      const newLines = prev.lines + clearedCount

      // サウンド
      if (clearedCount === 4) soundTetris()
      else if (clearedCount > 1) soundClearMulti(clearedCount)
      else if (clearedCount === 1) soundClear1()

      // スプリント達成チェック
      if (newLines >= TARGET_LINES) {
        finishedRef.current = true
        stopTimer()
        const finalMs = elapsedMsRef.current
        soundSprintComplete()
        return {
          ...prev,
          board: cleared,
          piece: null,
          lines: newLines,
          elapsedMs: finalMs,
          finished: true,
          flashingRows: fullLines,
        }
      }

      const nextPiece = prev.nextPiece
      const newNextPiece = createPiece()
      if (!isColliding(cleared, nextPiece)) {
        return {
          ...prev,
          board: cleared,
          piece: nextPiece,
          nextPiece: newNextPiece,
          lines: newLines,
          flashingRows: fullLines,
        }
      }
      gameOverRef.current = true
      stopTimer()
      soundGameOver()
      return {
        ...prev,
        board: cleared,
        piece: null,
        lines: newLines,
        gameOver: true,
        flashingRows: fullLines,
      }
    })
  }, [stopTimer])

  // -------------------------------------------------------
  // ゴーストピース計算
  // -------------------------------------------------------
  function getGhostPiece(board: Board, piece: Piece): Piece {
    let ghost = { ...piece }
    while (!isColliding(board, { ...ghost, y: ghost.y + 1 })) {
      ghost = { ...ghost, y: ghost.y + 1 }
    }
    return ghost
  }

  // -------------------------------------------------------
  // Effects: 自動落下
  // -------------------------------------------------------
  useEffect(() => {
    if (state.gameOver || state.finished || state.waiting || state.paused) return
    const id = setInterval(dropTick, softDrop ? SOFT_MS : DROP_MS)
    return () => clearInterval(id)
  }, [state.gameOver, state.finished, state.waiting, state.paused, softDrop, dropTick])

  // Keep pausedRef in sync
  useEffect(() => {
    pausedRef.current = state.paused
  }, [state.paused])

  // フラッシュを 180ms 後にクリア
  useEffect(() => {
    if (state.flashingRows.length === 0) return
    const id = setTimeout(() => {
      setState(prev => ({ ...prev, flashingRows: [] }))
    }, 180)
    return () => clearTimeout(id)
  }, [state.flashingRows])

  // -------------------------------------------------------
  // Effects: キーボード操作
  // -------------------------------------------------------
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // P toggles pause (except game over / finished / waiting)
      if (e.key === 'p' || e.key === 'P') {
        if (!gameOverRef.current && !finishedRef.current && !waitingRef.current) {
          pausedRef.current = !pausedRef.current
          setState(prev => ({ ...prev, paused: !prev.paused }))
        }
        return
      }
      if (gameOverRef.current || finishedRef.current || pausedRef.current) return
      if ([' ', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
        e.preventDefault()
      }

      // 初回キー入力でゲーム開始（タイマー起動）
      if (waitingRef.current) {
        waitingRef.current = false
        startTimer()
        setState(prev => ({ ...prev, waiting: false }))
      }

      if (e.key === 'ArrowDown') {
        setSoftDrop(true)
        return
      }

      setState(prev => {
        if (!prev.piece || prev.gameOver || prev.finished) return prev

        switch (e.key) {
          case ' ': {
            const r = { ...prev.piece, shape: rotateCW(prev.piece.shape) }
            if (isColliding(prev.board, r)) return prev
            soundRotate()
            return { ...prev, piece: r }
          }
          case 'ArrowUp': {
            // ハードドロップ
            let dropped = { ...prev.piece }
            while (!isColliding(prev.board, { ...dropped, y: dropped.y + 1 })) {
              dropped = { ...dropped, y: dropped.y + 1 }
            }
            soundLand()
            const merged = mergePieceToBoard(prev.board, dropped, 'block')
            const fullLines = getFullLines(merged)
            const clearedCount = fullLines.length
            const cleared = clearedCount > 0 ? clearLines(merged, fullLines) : merged
            const newLines = prev.lines + clearedCount

            if (clearedCount === 4) soundTetris()
            else if (clearedCount > 1) soundClearMulti(clearedCount)
            else if (clearedCount === 1) soundClear1()

            if (newLines >= TARGET_LINES) {
              finishedRef.current = true
              stopTimer()
              const finalMs = elapsedMsRef.current
              soundSprintComplete()
              return {
                ...prev,
                board: cleared,
                piece: null,
                lines: newLines,
                elapsedMs: finalMs,
                finished: true,
                flashingRows: fullLines,
              }
            }

            const nextPiece = prev.nextPiece
            const newNextPiece = createPiece()
            if (!isColliding(cleared, nextPiece)) {
              return {
                ...prev,
                board: cleared,
                piece: nextPiece,
                nextPiece: newNextPiece,
                lines: newLines,
                flashingRows: fullLines,
              }
            }
            gameOverRef.current = true
            stopTimer()
            soundGameOver()
            return { ...prev, board: cleared, piece: null, lines: newLines, gameOver: true, flashingRows: fullLines }
          }
        }
        return prev
      })
    }

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') setSoftDrop(false)
    }

    const onBlur = () => setSoftDrop(false)

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', onBlur)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', onBlur)
    }
  }, [stopTimer])

  // -------------------------------------------------------
  // クリーンアップ
  // -------------------------------------------------------
  useEffect(() => {
    return () => {
      stopTimer()
    }
  }, [stopTimer])

  // -------------------------------------------------------
  // リスタート
  // -------------------------------------------------------
  const start = useCallback(() => {
    stopTimer()
    gameOverRef.current = false
    finishedRef.current = false
    waitingRef.current = true
    pausedRef.current = false
    elapsedMsRef.current = 0
    setSoftDrop(false)
    setState(createInitialState())
  }, [stopTimer])

  const togglePause = useCallback(() => {
    if (gameOverRef.current || finishedRef.current || waitingRef.current) return
    pausedRef.current = !pausedRef.current
    setState(prev => ({ ...prev, paused: !prev.paused }))
  }, [])

  // -------------------------------------------------------
  // タッチ操作用アクション
  // -------------------------------------------------------
  const activateIfWaiting = useCallback(() => {
    if (waitingRef.current) {
      waitingRef.current = false
      startTimer()
      setState(prev => ({ ...prev, waiting: false }))
    }
  }, [startTimer])

  const moveLeft = useCallback(() => {
    if (gameOverRef.current || finishedRef.current) return
    activateIfWaiting()
    setState(prev => {
      if (!prev.piece || prev.gameOver || prev.finished) return prev
      const m = { ...prev.piece, x: prev.piece.x - 1 }
      if (isColliding(prev.board, m)) return prev
      soundMove()
      return { ...prev, piece: m }
    })
  }, [activateIfWaiting])

  const moveRight = useCallback(() => {
    if (gameOverRef.current || finishedRef.current) return
    activateIfWaiting()
    setState(prev => {
      if (!prev.piece || prev.gameOver || prev.finished) return prev
      const m = { ...prev.piece, x: prev.piece.x + 1 }
      if (isColliding(prev.board, m)) return prev
      soundMove()
      return { ...prev, piece: m }
    })
  }, [activateIfWaiting])

  const rotate = useCallback(() => {
    if (gameOverRef.current || finishedRef.current) return
    activateIfWaiting()
    setState(prev => {
      if (!prev.piece || prev.gameOver || prev.finished) return prev
      const r = { ...prev.piece, shape: rotateCW(prev.piece.shape) }
      if (isColliding(prev.board, r)) return prev
      soundRotate()
      return { ...prev, piece: r }
    })
  }, [activateIfWaiting])

  const hardDrop = useCallback(() => {
    if (gameOverRef.current || finishedRef.current) return
    activateIfWaiting()
    setState(prev => {
      if (!prev.piece || prev.gameOver || prev.finished) return prev

      let dropped = { ...prev.piece }
      while (!isColliding(prev.board, { ...dropped, y: dropped.y + 1 })) {
        dropped = { ...dropped, y: dropped.y + 1 }
      }
      soundLand()
      const merged = mergePieceToBoard(prev.board, dropped, 'block')
      const fullLines = getFullLines(merged)
      const clearedCount = fullLines.length
      const cleared = clearedCount > 0 ? clearLines(merged, fullLines) : merged
      const newLines = prev.lines + clearedCount

      if (clearedCount === 4) soundTetris()
      else if (clearedCount > 1) soundClearMulti(clearedCount)
      else if (clearedCount === 1) soundClear1()

      if (newLines >= TARGET_LINES) {
        finishedRef.current = true
        stopTimer()
        const finalMs = elapsedMsRef.current
        soundSprintComplete()
        return {
          ...prev,
          board: cleared,
          piece: null,
          lines: newLines,
          elapsedMs: finalMs,
          finished: true,
          flashingRows: fullLines,
        }
      }

      const nextPiece = prev.nextPiece
      const newNextPiece = createPiece()
      if (!isColliding(cleared, nextPiece)) {
        return {
          ...prev,
          board: cleared,
          piece: nextPiece,
          nextPiece: newNextPiece,
          lines: newLines,
          flashingRows: fullLines,
        }
      }
      gameOverRef.current = true
      stopTimer()
      soundGameOver()
      return { ...prev, board: cleared, piece: null, lines: newLines, gameOver: true, flashingRows: fullLines }
    })
  }, [stopTimer])

  const softDropStart = useCallback(() => setSoftDrop(true), [])
  const softDropEnd = useCallback(() => setSoftDrop(false), [])

  return {
    state,
    getGhostPiece,
    start,
    moveLeft,
    moveRight,
    rotate,
    hardDrop,
    softDropStart,
    softDropEnd,
    togglePause,
  }
}

// タイム表示フォーマット: m:ss.cc
export function formatElapsed(ms: number): string {
  const m = Math.floor(ms / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  const cs = Math.floor((ms % 1000) / 10)
  return `${m}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`
}
