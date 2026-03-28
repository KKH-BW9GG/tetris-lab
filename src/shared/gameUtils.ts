import type { Board, Cell, Piece } from './types'
import { BOARD_COLS, BOARD_ROWS } from './tetrominos'

export function createEmptyBoard(): Board {
  return Array.from({ length: BOARD_ROWS }, () =>
    Array.from({ length: BOARD_COLS }, (): Cell => ({ kind: 'empty', color: '' }))
  )
}

export function rotateCW(shape: number[][]): number[][] {
  const rows = shape.length
  const cols = shape[0].length
  return Array.from({ length: cols }, (_, c) =>
    Array.from({ length: rows }, (_, r) => shape[rows - 1 - r][c])
  )
}

export function rotateCCW(shape: number[][]): number[][] {
  const rows = shape.length
  const cols = shape[0].length
  return Array.from({ length: cols }, (_, c) =>
    Array.from({ length: rows }, (_, r) => shape[r][cols - 1 - c])
  )
}

export function isColliding(board: Board, piece: Piece): boolean {
  for (let r = 0; r < piece.shape.length; r++) {
    for (let c = 0; c < piece.shape[r].length; c++) {
      if (!piece.shape[r][c]) continue
      const boardR = piece.y + r
      const boardC = piece.x + c
      if (boardC < 0 || boardC >= BOARD_COLS) return true
      if (boardR < 0 || boardR >= BOARD_ROWS) return true
      if (board[boardR][boardC].kind !== 'empty') return true
    }
  }
  return false
}

export function mergePieceToBoard(board: Board, piece: Piece, kind: Cell['kind'] = 'block'): Board {
  const next = board.map(row => row.map(cell => ({ ...cell })))
  for (let r = 0; r < piece.shape.length; r++) {
    for (let c = 0; c < piece.shape[r].length; c++) {
      if (!piece.shape[r][c]) continue
      const boardR = piece.y + r
      const boardC = piece.x + c
      if (boardR >= 0 && boardR < BOARD_ROWS && boardC >= 0 && boardC < BOARD_COLS) {
        next[boardR][boardC] = { kind, color: piece.color }
      }
    }
  }
  return next
}

/** ラインが揃っている行のインデックスを返す */
export function getFullLines(board: Board): number[] {
  return board.reduce<number[]>((acc, row, i) => {
    if (row.every(cell => cell.kind !== 'empty')) acc.push(i)
    return acc
  }, [])
}

/** 指定した行を消去して上から空行を補充する */
export function clearLines(board: Board, lines: number[]): Board {
  const lineSet = new Set(lines)
  const remaining = board.filter((_, i) => !lineSet.has(i))
  const empty = Array.from({ length: lines.length }, () =>
    Array.from({ length: BOARD_COLS }, (): Cell => ({ kind: 'empty', color: '' }))
  )
  return [...empty, ...remaining]
}

export function spawnX(shape: number[][]): number {
  return Math.floor((BOARD_COLS - shape[0].length) / 2)
}
