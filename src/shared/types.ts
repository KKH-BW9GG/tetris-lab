export type CellKind = 'empty' | 'block' | 'slime'

export interface Cell {
  kind: CellKind
  color: string
}

export type Board = Cell[][]

export interface Piece {
  shape: number[][]
  color: string
  x: number
  y: number
}

export interface Position {
  x: number
  y: number
}
