export interface TetrominoTemplate {
  shape: number[][]
  color: string
}

export const TETROMINOES: TetrominoTemplate[] = [
  // I
  { shape: [[1, 1, 1, 1]], color: '#4ECDC4' },
  // O
  { shape: [[1, 1], [1, 1]], color: '#FFE66D' },
  // T
  { shape: [[0, 1, 0], [1, 1, 1]], color: '#C77DFF' },
  // S
  { shape: [[0, 1, 1], [1, 1, 0]], color: '#80ED99' },
  // Z
  { shape: [[1, 1, 0], [0, 1, 1]], color: '#FF6B6B' },
  // L
  { shape: [[1, 0], [1, 0], [1, 1]], color: '#FF9F43' },
  // J
  { shape: [[0, 1], [0, 1], [1, 1]], color: '#45B7D1' },
]

export const BOARD_COLS = 10
export const BOARD_ROWS = 20
export const CELL_SIZE = 30

export function randomTetromino(): TetrominoTemplate {
  return TETROMINOES[Math.floor(Math.random() * TETROMINOES.length)]
}
