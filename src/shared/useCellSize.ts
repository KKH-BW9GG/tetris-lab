import { useState, useEffect } from 'react'
import { BOARD_COLS, BOARD_ROWS } from './tetrominos'

/**
 * Responsive cell size that fits the board + touch controls on any screen.
 * Reserves space for header (~56px), sidebar info on mobile (~120px), touch controls (~160px), and padding.
 */
export function useCellSize(): number {
  const [cellSize, setCellSize] = useState(() => calcCellSize())
  useEffect(() => {
    const onResize = () => setCellSize(calcCellSize())
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return cellSize
}

function calcCellSize(): number {
  const vw = window.innerWidth
  const vh = window.innerHeight

  // Horizontal: board needs BOARD_COLS cells + some padding (32px total)
  const maxByWidth = Math.floor((vw - 32) / BOARD_COLS)

  // Vertical: header(52) + board + touch controls(160) + gaps/padding(60)
  const reservedHeight = 52 + 160 + 60
  const maxByHeight = Math.floor((vh - reservedHeight) / BOARD_ROWS)

  // Clamp between 14px (tiny phone) and 30px (desktop)
  return Math.max(14, Math.min(30, maxByWidth, maxByHeight))
}
