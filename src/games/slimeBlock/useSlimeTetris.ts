import { useState, useEffect, useCallback, useRef } from 'react'
import type { Board, Cell, Piece } from '../../shared/types'
import {
  BOARD_COLS,
  BOARD_ROWS,
  randomTetromino,
} from '../../shared/tetrominos'
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
  soundRotate, soundLand, soundSlimeLand,
  soundClear1, soundClearMulti, soundGameOver,
} from '../../shared/sound'
import { isTopScore as checkTopScore } from '../../shared/leaderboard'

type PieceKind = 'block' | 'slime'

interface SlimePiece extends Piece {
  kind: PieceKind
}

export interface SlimeTetrisState {
  board: Board
  currentPiece: SlimePiece | null
  score: number
  lines: number
  gameOver: boolean
  isSlimeFalling: boolean
  isCurrentSlime: boolean
  isTopScore: boolean
  paused: boolean
  flashingRows: number[]
}

const SCORE_TABLE: Record<number, number> = {
  1: 100,
  2: 300,
  3: 600,
  4: 1000,
}

const FALL_INTERVAL = 500
const SLIME_FALL_INTERVAL = 50

function spawnPiece(): SlimePiece {
  const tmpl = randomTetromino()
  const kind: PieceKind = Math.random() < 0.5 ? 'slime' : 'block'
  return {
    shape: tmpl.shape,
    color: tmpl.color,
    x: spawnX(tmpl.shape),
    y: 0,
    kind,
  }
}

/**
 * スライムセルを1マスずつ重力落下させる。
 * 1ステップで全スライムセルを1マス落下させる（ぷよぷよ的）。
 * 落下できたか否かを返す。
 */
function stepSlimeFall(board: Board): { next: Board; moved: boolean } {
  // 下から処理することで連鎖的な積み上げを防ぐ
  const next = board.map(row => row.map(cell => ({ ...cell })))
  let moved = false

  // 下から上へ走査
  for (let r = BOARD_ROWS - 2; r >= 0; r--) {
    for (let c = 0; c < BOARD_COLS; c++) {
      if (next[r][c].kind !== 'slime') continue
      if (next[r + 1][c].kind === 'empty') {
        // 1マス落下
        next[r + 1][c] = { ...next[r][c] }
        next[r][c] = { kind: 'empty', color: '' }
        moved = true
      }
    }
  }

  return { next, moved }
}

export function useSlimeTetris() {
  const [board, setBoard] = useState<Board>(createEmptyBoard)
  const [currentPiece, setCurrentPiece] = useState<SlimePiece | null>(null)
  const [score, setScore] = useState(0)
  const [lines, setLines] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const [isSlimeFalling, setIsSlimeFalling] = useState(false)
  const [isTopScoreState, setIsTopScoreState] = useState(false)
  const [paused, setPaused] = useState(false)
  const [flashingRows, setFlashingRows] = useState<number[]>([])

  // refs for use inside intervals/closures
  const boardRef = useRef<Board>(board)
  const currentPieceRef = useRef<SlimePiece | null>(currentPiece)
  const gameOverRef = useRef(gameOver)
  const isSlimeFallingRef = useRef(isSlimeFalling)
  const scoreRef = useRef(score)
  const pausedRef = useRef(false)

  boardRef.current = board
  currentPieceRef.current = currentPiece
  gameOverRef.current = gameOver
  isSlimeFallingRef.current = isSlimeFalling
  scoreRef.current = score

  // Clear flashingRows after animation
  useEffect(() => {
    if (flashingRows.length === 0) return
    const t = setTimeout(() => setFlashingRows([]), 180)
    return () => clearTimeout(t)
  }, [flashingRows])

  // ---- helpers ----

  const spawnNext = useCallback((currentBoard: Board) => {
    const piece = spawnPiece()
    if (isColliding(currentBoard, piece)) {
      soundGameOver()
      setGameOver(true)
      setIsTopScoreState(checkTopScore('slime', scoreRef.current))
      return
    }
    setCurrentPiece(piece)
  }, [])

  /** ピースを固定してライン消去 → スライム落下フェーズ開始 */
  const lockPiece = useCallback((b: Board, piece: SlimePiece) => {
    if (piece.kind === 'slime') soundSlimeLand()
    else soundLand()

    const merged = mergePieceToBoard(b, piece, piece.kind)
    const fullLines = getFullLines(merged)
    let afterClear = merged
    if (fullLines.length > 0) {
      afterClear = clearLines(merged, fullLines)
      const earned = SCORE_TABLE[fullLines.length] ?? 0
      setScore(prev => { scoreRef.current = prev + earned; return prev + earned })
      setLines(prev => prev + fullLines.length)
      setFlashingRows(fullLines)
      if (fullLines.length === 1) soundClear1()
      else soundClearMulti(fullLines.length)
    }
    setBoard(afterClear)
    boardRef.current = afterClear

    // スライムセルが存在するか確認
    const hasSlime = afterClear.some(row => row.some(cell => cell.kind === 'slime'))
    if (hasSlime) {
      setIsSlimeFalling(true)
      isSlimeFallingRef.current = true
    } else {
      spawnNext(afterClear)
    }
  }, [spawnNext])

  // ---- slime fall loop ----
  useEffect(() => {
    if (!isSlimeFalling) return

    const id = setInterval(() => {
      const { next, moved } = stepSlimeFall(boardRef.current)
      if (moved) {
        // 落下中はライン消去しない（落ち切ってから判定）
        setBoard(next)
        boardRef.current = next
      } else {
        // 落下完了 → ここでライン消去判定
        const fullLines = getFullLines(boardRef.current)
        let finalBoard = boardRef.current
        if (fullLines.length > 0) {
          finalBoard = clearLines(boardRef.current, fullLines)
          const earned = SCORE_TABLE[fullLines.length] ?? 0
          setScore(prev => { scoreRef.current = prev + earned; return prev + earned })
          setLines(prev => prev + fullLines.length)
          setFlashingRows(fullLines)
          if (fullLines.length === 1) soundClear1()
          else soundClearMulti(fullLines.length)
          setBoard(finalBoard)
          boardRef.current = finalBoard
        }
        clearInterval(id)
        setIsSlimeFalling(false)
        isSlimeFallingRef.current = false
        spawnNext(boardRef.current)
      }
    }, SLIME_FALL_INTERVAL)

    return () => clearInterval(id)
  }, [isSlimeFalling, spawnNext])

  // ---- auto fall ----
  useEffect(() => {
    if (gameOver || isSlimeFalling || currentPiece === null || paused) return

    const id = setInterval(() => {
      if (pausedRef.current) return
      const piece = currentPieceRef.current
      if (!piece) return
      const moved: SlimePiece = { ...piece, y: piece.y + 1 }
      if (isColliding(boardRef.current, moved)) {
        lockPiece(boardRef.current, piece)
        setCurrentPiece(null)
      } else {
        setCurrentPiece(moved)
      }
    }, FALL_INTERVAL)

    return () => clearInterval(id)
  }, [gameOver, isSlimeFalling, currentPiece, paused, lockPiece])

  // ---- initial spawn ----
  useEffect(() => {
    spawnNext(createEmptyBoard())
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ---- keyboard handling ----
  const handleKey = useCallback((e: KeyboardEvent) => {
    if (e.key === 'p' || e.key === 'P') {
      if (!gameOverRef.current) {
        pausedRef.current = !pausedRef.current
        setPaused(prev => !prev)
      }
      return
    }
    if (gameOverRef.current || isSlimeFallingRef.current || pausedRef.current) return
    const piece = currentPieceRef.current
    if (!piece) return
    const b = boardRef.current

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      const moved: SlimePiece = { ...piece, y: piece.y + 1 }
      if (isColliding(b, moved)) {
        lockPiece(b, piece)
        setCurrentPiece(null)
      } else {
        setCurrentPiece(moved)
      }
    } else if (e.key === ' ') {
      e.preventDefault()
      const rotated: SlimePiece = { ...piece, shape: rotateCW(piece.shape) }
      if (!isColliding(b, rotated)) { soundRotate(); setCurrentPiece(rotated) }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      // hard drop
      let dropped: SlimePiece = { ...piece }
      while (!isColliding(b, { ...dropped, y: dropped.y + 1 })) {
        dropped = { ...dropped, y: dropped.y + 1 }
      }
      lockPiece(b, dropped)
      setCurrentPiece(null)
    }
  }, [lockPiece])

  useEffect(() => {
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [handleKey])

  // ---- restart ----
  const restart = useCallback(() => {
    const emptyBoard = createEmptyBoard()
    setBoard(emptyBoard)
    boardRef.current = emptyBoard
    setScore(0)
    scoreRef.current = 0
    setLines(0)
    setGameOver(false)
    gameOverRef.current = false
    setIsSlimeFalling(false)
    isSlimeFallingRef.current = false
    setIsTopScoreState(false)
    setCurrentPiece(null)
    setPaused(false)
    pausedRef.current = false
    setFlashingRows([])
    // spawn will happen via useEffect on next render... trigger manually
    setTimeout(() => spawnNext(emptyBoard), 0)
  }, [spawnNext])

  const togglePause = useCallback(() => {
    if (gameOverRef.current) return
    pausedRef.current = !pausedRef.current
    setPaused(prev => !prev)
  }, [])

  // ---- compute visible board (merge active piece; ghost drawn in render) ----
  const displayBoard: Board = (() => {
    if (!currentPiece) return board
    const b = board.map(row => row.map((cell): Cell => ({ ...cell })))
    const p = currentPiece
    for (let r = 0; r < p.shape.length; r++) {
      for (let c = 0; c < p.shape[r].length; c++) {
        if (!p.shape[r][c]) continue
        const br = p.y + r
        const bc = p.x + c
        if (br >= 0 && br < BOARD_ROWS && bc >= 0 && bc < BOARD_COLS) {
          b[br][bc] = { kind: p.kind, color: p.color }
        }
      }
    }
    return b
  })()

  const state: SlimeTetrisState = {
    board: displayBoard,
    currentPiece,
    score,
    lines,
    gameOver,
    isSlimeFalling,
    isCurrentSlime: currentPiece?.kind === 'slime',
    isTopScore: isTopScoreState,
    paused,
    flashingRows,
  }

  // ---- touch action handlers ----
  const moveLeft = useCallback(() => {
    if (gameOverRef.current || isSlimeFallingRef.current) return
    const piece = currentPieceRef.current
    if (!piece) return
    const moved: SlimePiece = { ...piece, x: piece.x - 1 }
    if (!isColliding(boardRef.current, moved)) setCurrentPiece(moved)
  }, [])

  const moveRight = useCallback(() => {
    if (gameOverRef.current || isSlimeFallingRef.current) return
    const piece = currentPieceRef.current
    if (!piece) return
    const moved: SlimePiece = { ...piece, x: piece.x + 1 }
    if (!isColliding(boardRef.current, moved)) setCurrentPiece(moved)
  }, [])

  const rotate = useCallback(() => {
    if (gameOverRef.current || isSlimeFallingRef.current) return
    const piece = currentPieceRef.current
    if (!piece) return
    const rotated: SlimePiece = { ...piece, shape: rotateCW(piece.shape) }
    if (!isColliding(boardRef.current, rotated)) setCurrentPiece(rotated)
  }, [])

  const hardDrop = useCallback(() => {
    if (gameOverRef.current || isSlimeFallingRef.current) return
    const piece = currentPieceRef.current
    if (!piece) return
    let dropped: SlimePiece = { ...piece }
    while (!isColliding(boardRef.current, { ...dropped, y: dropped.y + 1 })) {
      dropped = { ...dropped, y: dropped.y + 1 }
    }
    lockPiece(boardRef.current, dropped)
    setCurrentPiece(null)
  }, [lockPiece])

  const softDropStart = useCallback(() => {
    // slime tetris uses setInterval-based auto-fall; we trigger a single step
    if (gameOverRef.current || isSlimeFallingRef.current) return
    const piece = currentPieceRef.current
    if (!piece) return
    const moved: SlimePiece = { ...piece, y: piece.y + 1 }
    if (isColliding(boardRef.current, moved)) {
      lockPiece(boardRef.current, piece)
      setCurrentPiece(null)
    } else {
      setCurrentPiece(moved)
    }
  }, [lockPiece])

  const softDropEnd = useCallback(() => {}, [])

  // ゴーストピース計算（ブロック種のみ、生ボードを使って落下先を計算）
  const ghostPiece: SlimePiece | null = (() => {
    if (!currentPiece || isSlimeFalling || currentPiece.kind !== 'block') return null
    let ghost = { ...currentPiece }
    while (!isColliding(board, { ...ghost, y: ghost.y + 1 })) {
      ghost = { ...ghost, y: ghost.y + 1 }
    }
    return ghost.y === currentPiece.y ? null : ghost
  })()

  return { state, ghostPiece, restart, moveLeft, moveRight, rotate, hardDrop, softDropStart, softDropEnd, togglePause }
}
