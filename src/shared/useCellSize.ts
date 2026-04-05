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
    window.addEventListener("orientationchange", onResize);
    window.visualViewport?.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
      window.visualViewport?.removeEventListener("resize", onResize);
    };
  }, []);
  return cellSize;
}

function calcCellSize(): number {
  const vw = window.visualViewport?.width ?? window.innerWidth;
  const vh = window.visualViewport?.height ?? window.innerHeight;
  const shortestSide = Math.min(vw, vh);
  const isMobile = vw < 768;
  const isPortrait = vh >= vw;
  const isTablet = shortestSide >= 700;

  const horizontalPadding = isMobile ? 24 : 56;
  const maxByWidth = Math.floor((vw - horizontalPadding) / BOARD_COLS);

  const reservedHeight = isMobile
    ? (isPortrait ? 280 : 180)
    : (isTablet ? 120 : 100);
  const maxByHeight = Math.floor((vh - reservedHeight) / BOARD_ROWS);

  return Math.max(12, Math.min(isTablet ? 34 : 30, maxByWidth, maxByHeight));
}
