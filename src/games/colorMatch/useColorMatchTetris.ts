import { useState, useEffect, useCallback, useRef } from 'react'
import type { Board, Cell, Piece } from '../../shared/types'
import {
  BOARD_COLS,
  BOARD_ROWS,
  randomTetromino,
} from '../../shared/tetrominos'
import {
  createEmptyBoard,
  isColliding,
  getFullLines,
  spawnX,
} from '../../shared/gameUtils'
import {
  soundRotate,
  soundClear1, soundClearMulti, soundTetris,
  soundGameOver, soundChain,
} from '../../shared/sound'
import { isTopScore } from '../../shared/leaderboard'

// ---------------------------------------------------------------
// 各セルがバラバラな色を持つピース型
// ---------------------------------------------------------------

export interface ColorPiece extends Piece {
  colors: string[][]  // shape と同じ次元、各セルの色
}

const MATCH_COLORS = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#C77DFF', '#80ED99', '#FF9F43', '#45B7D1']

function randomMatchColor(): string {
  return MATCH_COLORS[Math.floor(Math.random() * MATCH_COLORS.length)]
}

// ---------------------------------------------------------------
// ヘルパー
// ---------------------------------------------------------------

/** ColorPiece を Piece として扱うためのキャスト（衝突判定用） */
function asPiece(cp: ColorPiece): Piece {
  return { shape: cp.shape, color: cp.color, x: cp.x, y: cp.y }
}

/** shape と同じ形状で各セルをランダム色で塗った colors[][] を生成 */
function randomColors(shape: number[][]): string[][] {
  return shape.map(row => row.map(() => randomMatchColor()))
}

/** colors[][] を時計回りに90度回転 */
function rotateColorsCW(colors: string[][]): string[][] {
  const rows = colors.length
  const cols = colors[0].length
  return Array.from({ length: cols }, (_, c) =>
    Array.from({ length: rows }, (_, r) => colors[rows - 1 - r][c])
  )
}

/** shape を時計回り回転（gameUtils の rotateCW と同ロジック） */
function rotateCW(shape: number[][]): number[][] {
  const rows = shape.length
  const cols = shape[0].length
  return Array.from({ length: cols }, (_, c) =>
    Array.from({ length: rows }, (_, r) => shape[rows - 1 - r][c])
  )
}

/** ColorPiece をボードにマージ（セルごとの色を使用） */
function mergeColorPieceToBoard(board: Board, piece: ColorPiece): Board {
  const next = board.map(row => row.map(cell => ({ ...cell })))
  for (let r = 0; r < piece.shape.length; r++) {
    for (let c = 0; c < piece.shape[r].length; c++) {
      if (!piece.shape[r][c]) continue
      const boardR = piece.y + r
      const boardC = piece.x + c
      if (boardR >= 0 && boardR < BOARD_ROWS && boardC >= 0 && boardC < BOARD_COLS) {
        next[boardR][boardC] = { kind: 'block', color: piece.colors[r][c] }
      }
    }
  }
  return next
}

/** ColorPiece を生成 */
function createColorPiece(): ColorPiece {
  const tmpl = randomTetromino()
  return {
    shape: tmpl.shape,
    colors: randomColors(tmpl.shape),
    color: tmpl.color,  // ghost piece 表示用フォールバック
    x: spawnX(tmpl.shape),
    y: 0,
  }
}

// ---------------------------------------------------------------
// 色マッチ（BFS で同色連結成分を検出）
// ---------------------------------------------------------------

function getColorMatchCells(board: Board): Set<string> {
  const visited = new Set<string>()
  const toRemove = new Set<string>()

  for (let r = 0; r < BOARD_ROWS; r++) {
    for (let c = 0; c < BOARD_COLS; c++) {
      const key = `${r},${c}`
      if (visited.has(key)) continue
      const cell = board[r][c]
      if (cell.kind === 'empty') {
        visited.add(key)
        continue
      }
      const color = cell.color
      const component: string[] = []
      const queue: [number, number][] = [[r, c]]
      visited.add(key)

      while (queue.length > 0) {
        const [cr, cc] = queue.shift()!
        component.push(`${cr},${cc}`)
        const neighbors: [number, number][] = [
          [cr - 1, cc], [cr + 1, cc], [cr, cc - 1], [cr, cc + 1],
        ]
        for (const [nr, nc] of neighbors) {
          if (nr < 0 || nr >= BOARD_ROWS || nc < 0 || nc >= BOARD_COLS) continue
          const nKey = `${nr},${nc}`
          if (visited.has(nKey)) continue
          const nCell = board[nr][nc]
          if (nCell.kind !== 'empty' && nCell.color === color) {
            visited.add(nKey)
            queue.push([nr, nc])
          }
        }
      }

      if (component.length >= 4) {
        component.forEach(k => toRemove.add(k))
      }
    }
  }

  return toRemove
}

function removeCells(board: Board, cellKeys: Set<string>): Board {
  const next = board.map(row => row.map(cell => ({ ...cell })))
  for (const key of cellKeys) {
    const [r, c] = key.split(',').map(Number)
    next[r][c] = { kind: 'empty', color: '' }
  }
  return next
}

function applyGravity(board: Board): Board {
  const next: Board = createEmptyBoard()
  for (let c = 0; c < BOARD_COLS; c++) {
    let writeRow = BOARD_ROWS - 1
    for (let r = BOARD_ROWS - 1; r >= 0; r--) {
      if (board[r][c].kind !== 'empty') {
        next[writeRow][c] = { ...board[r][c] }
        writeRow--
      }
    }
  }
  return next
}

// ---------------------------------------------------------------
// スコア計算
// ---------------------------------------------------------------

const LINE_SCORES: Record<number, number> = { 1: 100, 2: 300, 3: 600, 4: 1000 }

function calcScore(lineCount: number, colorCellCount: number, chain: number): number {
  return (LINE_SCORES[lineCount] ?? 0) + colorCellCount * 20 + (chain > 0 ? chain * 50 : 0)
}

// ---------------------------------------------------------------
// 状態型
// ---------------------------------------------------------------

export interface ColorMatchState {
  board: Board
  currentPiece: ColorPiece | null
  nextPiece: ColorPiece
  score: number
  chain: number
  gameOver: boolean
  flashCells: Set<string>
  isClearing: boolean
  isTopScore: boolean
  paused: boolean
}

const FALL_INTERVAL = 500

// ---------------------------------------------------------------
// フック本体
// ---------------------------------------------------------------

export function useColorMatchTetris() {
  const [state, setState] = useState<ColorMatchState>(() => ({
    board: createEmptyBoard(),
    currentPiece: createColorPiece(),
    nextPiece: createColorPiece(),
    score: 0,
    chain: 0,
    gameOver: false,
    flashCells: new Set(),
    isClearing: false,
    isTopScore: false,
    paused: false,
  }))

  const [softDrop, setSoftDrop] = useState(false)

  const isClearingRef = useRef(false)
  const gameOverRef = useRef(false)
  const pausedRef = useRef(false)

  useEffect(() => {
    isClearingRef.current = state.isClearing
    gameOverRef.current = state.gameOver
    pausedRef.current = state.paused
  }, [state.isClearing, state.gameOver, state.paused])

  // ---------------------------------------------------------------
  // 連鎖消去処理
  // ---------------------------------------------------------------

  const processClear = useCallback(
    (board: Board, chainCount: number): Promise<{ board: Board; score: number; chain: number }> => {
      return new Promise(resolve => {
        const fullLines = getFullLines(board)
        const colorCells = getColorMatchCells(board)

        // 消去対象: ライン + 色マッチを元のボード座標で一括マーク
        const cellsToRemove = new Set<string>([...colorCells])
        fullLines.forEach(r => {
          for (let c = 0; c < BOARD_COLS; c++) {
            cellsToRemove.add(`${r},${c}`)
          }
        })

        if (cellsToRemove.size === 0) {
          resolve({ board, score: 0, chain: chainCount })
          return
        }

        const earned = calcScore(fullLines.length, colorCells.size, chainCount)

        // サウンド
        if (chainCount > 0) soundChain(chainCount)
        else if (fullLines.length === 4) soundTetris()
        else if (fullLines.length > 1) soundClearMulti(fullLines.length)
        else if (fullLines.length === 1) soundClear1()
        else if (colorCells.size >= 4) soundClearMulti(Math.floor(colorCells.size / 4))

        setState(prev => ({ ...prev, flashCells: cellsToRemove, isClearing: true, chain: chainCount }))
        isClearingRef.current = true

        setTimeout(() => {
          // 元のボードからまとめて削除し、重力を適用
          let next = removeCells(board, cellsToRemove)
          next = applyGravity(next)

          setState(prev => ({ ...prev, board: next, flashCells: new Set() }))

          processClear(next, chainCount + 1).then(result => {
            resolve({ board: result.board, score: earned + result.score, chain: result.chain })
          })
        }, 200)
      })
    },
    []
  )

  // ---------------------------------------------------------------
  // ピース設置
  // ---------------------------------------------------------------

  const lockPiece = useCallback(
    (board: Board, piece: ColorPiece, nextPiece: ColorPiece) => {
      const merged = mergeColorPieceToBoard(board, piece)
      const newNext = createColorPiece()

      processClear(merged, 0).then(({ board: clearedBoard, score: earned }) => {
        const spawnPiece = { ...nextPiece }
        const over = isColliding(clearedBoard, asPiece(spawnPiece))

        if (over) soundGameOver()
        setState(prev => ({
          ...prev,
          board: clearedBoard,
          currentPiece: over ? null : spawnPiece,
          nextPiece: newNext,
          score: prev.score + earned,
          chain: 0,
          gameOver: over,
          isClearing: false,
          isTopScore: over ? isTopScore('colorMatch', prev.score + earned) : false,
        }))
        isClearingRef.current = false
        gameOverRef.current = over
      })
    },
    [processClear]
  )

  // ---------------------------------------------------------------
  // 自動落下
  // ---------------------------------------------------------------

  useEffect(() => {
    if (state.gameOver || state.isClearing || state.paused) return
    const interval = setInterval(() => {
      setState(prev => {
        if (prev.gameOver || prev.isClearing || prev.paused || !prev.currentPiece) return prev
        const moved: ColorPiece = { ...prev.currentPiece, y: prev.currentPiece.y + 1 }
        if (!isColliding(prev.board, asPiece(moved))) {
          return { ...prev, currentPiece: moved }
        }
        lockPiece(prev.board, prev.currentPiece, prev.nextPiece)
        return { ...prev, currentPiece: null }
      })
    }, softDrop ? 50 : FALL_INTERVAL)
    return () => clearInterval(interval)
  }, [state.gameOver, state.isClearing, state.paused, softDrop, lockPiece])

  // ---------------------------------------------------------------
  // キー操作
  // ---------------------------------------------------------------

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'p' || e.key === 'P') {
        if (!gameOverRef.current) {
          pausedRef.current = !pausedRef.current
          setState(prev => ({ ...prev, paused: !prev.paused }))
        }
        return
      }
      if (gameOverRef.current || isClearingRef.current || pausedRef.current) return

      setState(prev => {
        if (prev.gameOver || prev.isClearing || !prev.currentPiece) return prev
        const piece = prev.currentPiece

        switch (e.key) {
          case ' ': {
            e.preventDefault()
            const rotatedShape = rotateCW(piece.shape)
            const rotatedColors = rotateColorsCW(piece.colors)
            const rotated: ColorPiece = { ...piece, shape: rotatedShape, colors: rotatedColors }
            if (!isColliding(prev.board, asPiece(rotated))) { soundRotate(); return { ...prev, currentPiece: rotated } }
            for (const dx of [1, -1, 2, -2]) {
              const kicked: ColorPiece = { ...rotated, x: rotated.x + dx }
              if (!isColliding(prev.board, asPiece(kicked))) { soundRotate(); return { ...prev, currentPiece: kicked } }
            }
            break
          }
          case 'ArrowDown': {
            e.preventDefault()
            const moved: ColorPiece = { ...piece, y: piece.y + 1 }
            if (!isColliding(prev.board, asPiece(moved))) return { ...prev, currentPiece: moved }
            lockPiece(prev.board, piece, prev.nextPiece)
            return { ...prev, currentPiece: null }
          }
          case 'ArrowUp': {
            e.preventDefault()
            let dropped = { ...piece }
            while (true) {
              const next: ColorPiece = { ...dropped, y: dropped.y + 1 }
              if (isColliding(prev.board, asPiece(next))) break
              dropped = next
            }
            lockPiece(prev.board, dropped, prev.nextPiece)
            return { ...prev, currentPiece: null }
          }
        }
        return prev
      })
    }

    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [lockPiece])

  // ---------------------------------------------------------------
  // リスタート
  // ---------------------------------------------------------------

  const restart = useCallback(() => {
    isClearingRef.current = false
    gameOverRef.current = false
    pausedRef.current = false
    setState({
      board: createEmptyBoard(),
      currentPiece: createColorPiece(),
      nextPiece: createColorPiece(),
      score: 0,
      chain: 0,
      gameOver: false,
      flashCells: new Set(),
      isClearing: false,
      isTopScore: false,
      paused: false,
    })
  }, [])

  const togglePause = useCallback(() => {
    if (gameOverRef.current) return
    pausedRef.current = !pausedRef.current
    setState(prev => ({ ...prev, paused: !prev.paused }))
  }, [])

  // ---------------------------------------------------------------
  // 描画用ボード（ゴーストピース + 現在ピースをマージ）
  // ---------------------------------------------------------------

  const displayBoard: (Cell & { flash?: boolean; ghost?: boolean })[][] = state.board.map(row =>
    row.map(cell => ({ ...cell, flash: false }))
  )

  if (state.currentPiece) {
    // ゴーストピース
    let ghost = { ...state.currentPiece }
    while (true) {
      const next: ColorPiece = { ...ghost, y: ghost.y + 1 }
      if (isColliding(state.board, asPiece(next))) break
      ghost = next
    }
    for (let r = 0; r < ghost.shape.length; r++) {
      for (let c = 0; c < ghost.shape[r].length; c++) {
        if (!ghost.shape[r][c]) continue
        const br = ghost.y + r
        const bc = ghost.x + c
        if (br >= 0 && br < BOARD_ROWS && bc >= 0 && bc < BOARD_COLS) {
          if (displayBoard[br][bc].kind === 'empty') {
            const cell = { kind: 'block' as const, color: state.currentPiece.colors[r][c], flash: false, ghost: true }
            displayBoard[br][bc] = cell
          }
        }
      }
    }

    // 現在ピース（per-cell color）
    for (let r = 0; r < state.currentPiece.shape.length; r++) {
      for (let c = 0; c < state.currentPiece.shape[r].length; c++) {
        if (!state.currentPiece.shape[r][c]) continue
        const br = state.currentPiece.y + r
        const bc = state.currentPiece.x + c
        if (br >= 0 && br < BOARD_ROWS && bc >= 0 && bc < BOARD_COLS) {
          displayBoard[br][bc] = { kind: 'block', color: state.currentPiece.colors[r][c], flash: false }
        }
      }
    }
  }

  // フラッシュセル
  state.flashCells.forEach(key => {
    const [r, c] = key.split(',').map(Number)
    if (r >= 0 && r < BOARD_ROWS && c >= 0 && c < BOARD_COLS) {
      ;(displayBoard[r][c] as Cell & { flash?: boolean }).flash = true
    }
  })

  // ---------------------------------------------------------------
  // タッチ操作用アクション
  // ---------------------------------------------------------------
  const moveLeft = useCallback(() => {
    if (gameOverRef.current || isClearingRef.current) return
    setState(prev => {
      if (!prev.currentPiece || prev.gameOver || prev.isClearing) return prev
      const moved: ColorPiece = { ...prev.currentPiece, x: prev.currentPiece.x - 1 }
      return isColliding(prev.board, asPiece(moved)) ? prev : { ...prev, currentPiece: moved }
    })
  }, [])

  const moveRight = useCallback(() => {
    if (gameOverRef.current || isClearingRef.current) return
    setState(prev => {
      if (!prev.currentPiece || prev.gameOver || prev.isClearing) return prev
      const moved: ColorPiece = { ...prev.currentPiece, x: prev.currentPiece.x + 1 }
      return isColliding(prev.board, asPiece(moved)) ? prev : { ...prev, currentPiece: moved }
    })
  }, [])

  const rotate = useCallback(() => {
    if (gameOverRef.current || isClearingRef.current) return
    setState(prev => {
      if (!prev.currentPiece || prev.gameOver || prev.isClearing) return prev
      const rotatedShape = rotateCW(prev.currentPiece.shape)
      const rotatedColors = rotateColorsCW(prev.currentPiece.colors)
      const rotated: ColorPiece = { ...prev.currentPiece, shape: rotatedShape, colors: rotatedColors }
      if (!isColliding(prev.board, asPiece(rotated))) return { ...prev, currentPiece: rotated }
      for (const dx of [1, -1, 2, -2]) {
        const kicked: ColorPiece = { ...rotated, x: rotated.x + dx }
        if (!isColliding(prev.board, asPiece(kicked))) return { ...prev, currentPiece: kicked }
      }
      return prev
    })
  }, [])

  const hardDrop = useCallback(() => {
    if (gameOverRef.current || isClearingRef.current) return
    setState(prev => {
      if (!prev.currentPiece || prev.gameOver || prev.isClearing) return prev
      let dropped = { ...prev.currentPiece }
      while (true) {
        const next: ColorPiece = { ...dropped, y: dropped.y + 1 }
        if (isColliding(prev.board, asPiece(next))) break
        dropped = next
      }
      lockPiece(prev.board, dropped, prev.nextPiece)
      return { ...prev, currentPiece: null }
    })
  }, [lockPiece])

  const softDropStart = useCallback(() => setSoftDrop(true), [])
  const softDropEnd = useCallback(() => setSoftDrop(false), [])

  return {
    displayBoard: displayBoard as (Cell & { flash?: boolean; ghost?: boolean })[][],
    nextPiece: state.nextPiece,
    score: state.score,
    chain: state.chain,
    gameOver: state.gameOver,
    isClearing: state.isClearing,
    isTopScore: state.isTopScore,
    paused: state.paused,
    restart,
    moveLeft,
    moveRight,
    rotate,
    hardDrop,
    softDropStart,
    softDropEnd,
    togglePause,
  }
}
