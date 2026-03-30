import { useState, useEffect } from "react";
import { BOARD_COLS, BOARD_ROWS } from "./tetrominos";

/**
 * Responsive cell size that fits the board + touch controls on any screen.
 * Reserves space for header (~56px), sidebar info on mobile (~120px), touch controls (~160px), and padding.
 */
export function useCellSize(): number {
  const [cellSize, setCellSize] = useState(() => calcCellSize());
  useEffect(() => {
    const onResize = () => setCellSize(calcCellSize());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return cellSize;
}

function calcCellSize(): number {
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  // Horizontal: board needs BOARD_COLS cells + outer margin (48px total for breathing room)
  const maxByWidth = Math.floor((vw - 48) / BOARD_COLS);

  // Vertical budget: header(48) + board + sidebar(compact ~100) + touch controls(140) + gaps(40)
  // On small screens, sidebar wraps below board so we must account for it
  const isMobile = vw < 768;
  const reservedHeight = isMobile
    ? 48 + 100 + 140 + 40 // header + sidebar + touch + gaps
    : 48 + 60; // header + padding only (sidebar is beside board)
  const maxByHeight = Math.floor((vh - reservedHeight) / BOARD_ROWS);

  // Clamp between 12px (tiny phone) and 30px (desktop)
  return Math.max(12, Math.min(30, maxByWidth, maxByHeight));
}
