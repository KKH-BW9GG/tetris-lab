import { useState, useEffect, useRef, type CSSProperties } from 'react'
import { BOARD_COLS, BOARD_ROWS } from '../../shared/tetrominos'
import { useCellSize } from '../../shared/useCellSize'
import type { Cell } from '../../shared/types'
import { useSlimeTetris } from './useSlimeTetris'
import { useDAS } from '../../shared/useDAS'
import TouchControls from '../../shared/TouchControls'
import LeaderboardModal, { WeeklyTable } from '../../shared/LeaderboardModal'
import { getWeeklyScores } from '../../shared/leaderboard'
import { startBGM, stopBGM } from '../../shared/sound'

interface Props {
  onBack: () => void
}

function getCellClass(cell: Cell, isActive: boolean): string {
  if (cell.kind === 'empty') {
    return 'bg-gray-800 border-r border-b border-gray-700'
  }
  if (cell.kind === 'slime') {
    return [
      'rounded-md',
      'border border-white/20',
      isActive ? 'animate-pulse' : '',
    ]
      .filter(Boolean)
      .join(' ')
  }
  // block
  return 'border border-black/20'
}

function getCellStyle(cell: Cell): CSSProperties {
  if (cell.kind === 'empty') return {}
  if (cell.kind === 'slime') {
    return {
      backgroundColor: cell.color,
      opacity: 0.85,
    }
  }
  // block
  return { backgroundColor: cell.color }
}

function NextPiecePreview({ piece }: { piece: { shape: number[][], color: string } }) {
  const previewSize = 20
  const cols = piece.shape[0].length
  const rows = piece.shape.length
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `repeat(${cols}, ${previewSize}px)`,
      gridTemplateRows: `repeat(${rows}, ${previewSize}px)`,
    }}>
      {piece.shape.map((row, r) =>
        row.map((cell, c) => (
          <div key={`next-${r}-${c}`} style={{
            width: previewSize,
            height: previewSize,
            backgroundColor: cell ? piece.color : 'transparent',
            border: cell ? '1px solid rgba(0,0,0,0.3)' : 'none',
            boxSizing: 'border-box',
          }} />
        ))
      )}
    </div>
  )
}

function HoldPiecePreview({ piece }: { piece: { shape: number[][], color: string } }) {
  const previewSize = 20
  const cols = piece.shape[0].length
  const rows = piece.shape.length
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `repeat(${cols}, ${previewSize}px)`,
      gridTemplateRows: `repeat(${rows}, ${previewSize}px)`,
    }}>
      {piece.shape.map((row, r) =>
        row.map((cell, c) => (
          <div key={`hold-${r}-${c}`} style={{
            width: previewSize,
            height: previewSize,
            backgroundColor: cell ? piece.color : 'transparent',
            border: cell ? '1px solid rgba(0,0,0,0.3)' : 'none',
            boxSizing: 'border-box',
          }} />
        ))
      )}
    </div>
  )
}

export default function SlimeTetris({ onBack }: Props) {
  const { state, ghostPiece, restart, moveLeft, moveRight, rotate, hardDrop, softDropStart, softDropEnd, togglePause, hold } = useSlimeTetris()
  useDAS(moveLeft, moveRight)
  const cellSize = useCellSize()
  const { board, gameOver, score, lines, isCurrentSlime, isSlimeFalling, isTopScore, paused, flashingRows, nextPiece, waiting, heldPiece, canHold } = state
  const [showLeaderboard, setShowLeaderboard] = useState(false)
  const [scoreHighlight, setScoreHighlight] = useState(false)
  const prevScoreRef = useRef(score)

  useEffect(() => {
    if (score !== prevScoreRef.current) {
      prevScoreRef.current = score
      setScoreHighlight(true)
      const t = setTimeout(() => setScoreHighlight(false), 300)
      return () => clearTimeout(t)
    }
  }, [score])

  useEffect(() => {
    startBGM('slime')
    return () => stopBGM()
  }, [])

  useEffect(() => {
    if (gameOver) stopBGM()
  }, [gameOver])

  const boardWidth = BOARD_COLS * cellSize
  const boardHeight = BOARD_ROWS * cellSize

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-start p-4 overflow-y-auto select-none">
      {/* Header */}
      <div className="flex items-center gap-4 mb-4">
        <button
          onClick={onBack}
          className="text-gray-400 hover:text-white transition-colors text-sm"
        >
          ← Back
        </button>
        <h1 className="text-2xl font-bold text-emerald-400">
          Slime &times; Block Tetris
        </h1>
        {!gameOver && (
          <button
            onClick={togglePause}
            className="text-gray-400 hover:text-white transition-colors text-sm px-3 py-1 border border-gray-700 rounded"
          >
            {paused ? '▶ Resume' : '⏸ Pause'}
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-4 justify-center items-start">
        {/* Board */}
        <div className="relative border-2 border-emerald-500"
          style={{ width: boardWidth, height: boardHeight, touchAction: 'none' }}
        >
          {/* Grid cells */}
          {board.map((row, r) =>
            row.map((cell, c) => (
              <div
                key={`${r}-${c}`}
                className={getCellClass(cell, isCurrentSlime && cell.kind === 'slime')}
                style={{
                  position: 'absolute',
                  left: c * cellSize,
                  top: r * cellSize,
                  width: cellSize,
                  height: cellSize,
                  boxSizing: 'border-box',
                  ...getCellStyle(cell),
                }}
              />
            ))
          )}

          {/* Ghost piece */}
          {ghostPiece && ghostPiece.shape.map((row, r) =>
            row.map((cell, c) => {
              if (!cell) return null
              const left = (ghostPiece.x + c) * cellSize
              const top = (ghostPiece.y + r) * cellSize
              return (
                <div
                  key={`ghost-${r}-${c}`}
                  style={{
                    position: 'absolute',
                    left,
                    top,
                    width: cellSize,
                    height: cellSize,
                    border: `2px solid ${ghostPiece.color}`,
                    backgroundColor: `${ghostPiece.color}22`,
                    boxSizing: 'border-box',
                  }}
                />
              )
            })
          )}

          {/* ライン消去フラッシュ */}
          {flashingRows.map(r => (
            <div
              key={`flash-${r}`}
              className="flash-row"
              style={{ top: r * cellSize, height: cellSize }}
            />
          ))}

          {/* READY overlay */}
          {waiting && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3"
              style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(2px)' }} onPointerDown={() => window.dispatchEvent(new KeyboardEvent("keydown", { key: " " }))}>
              <span className="text-5xl font-black text-emerald-300 animate-pulse tracking-widest">READY</span>
              <span className="text-gray-400 text-sm">Tap to start</span>
            </div>
          )}

          {/* Pause overlay */}
          {paused && !gameOver && (
            <div
              className="absolute inset-0 flex flex-col items-center justify-center gap-2"
              style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(2px)', zIndex: 10 }}
            >
              <span
                className="font-black text-white tracking-widest"
                style={{ fontSize: '40px', textShadow: '0 0 30px rgba(16,185,129,0.9)', letterSpacing: '0.15em' }}
              >
                PAUSED
              </span>
              <span className="text-gray-400 text-xs">P key to resume</span>
            </div>
          )}

          {/* Game Over overlay */}
          {gameOver && (!isTopScore || showLeaderboard) && (
            <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-4 p-4">
              <p className="text-2xl font-bold game-over-text">GAME OVER</p>
              <p className="text-white text-lg">Score: {score}</p>
              <p className="text-gray-400 text-sm">Lines: {lines}</p>
              <WeeklyTable entries={getWeeklyScores('slime')} />
              <button
                onClick={restart}
                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold transition-colors"
              >
                Restart
              </button>
              <button
                onClick={onBack}
                className="px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm text-gray-300 transition-colors w-full"
              >
                Back to Menu
              </button>
            </div>
          )}
        </div>

        {/* Side panel */}
        <div className="flex flex-row flex-wrap gap-1 justify-center lg:flex-col lg:gap-4 lg:min-w-[140px]">
          {/* Score */}
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 min-w-[70px]">
            <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Score</p>
            <p
              className={`text-lg font-bold tabular-nums transition-colors duration-150 ${scoreHighlight ? 'text-white' : 'text-yellow-400'}`}
              style={scoreHighlight ? { textShadow: '0 0 12px rgba(255,255,255,0.9)' } : undefined}
            >
              {score.toLocaleString()}
            </p>
          </div>

          {/* Lines */}
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 min-w-[70px]">
            <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Lines</p>
            <p className="text-green-400 text-xl font-bold tabular-nums">{lines}</p>
          </div>

          {/* Hold */}
          <div className={`bg-gray-900 border rounded p-3 min-w-[70px] ${!canHold ? 'border-gray-800 opacity-50' : 'border-emerald-500'}`}>
            <p className="text-gray-400 text-xs uppercase tracking-wider mb-2">Hold</p>
            <div className="flex items-center justify-center min-h-[50px]">
              {heldPiece ? (
                <HoldPiecePreview piece={heldPiece} />
              ) : (
                <span className="text-gray-600 text-xs">—</span>
              )}
            </div>
          </div>

          {/* Next piece preview */}
          <div className="bg-gray-900 border border-gray-700 rounded p-3 min-w-[70px]">
            <p className="text-gray-400 text-xs uppercase tracking-wider mb-2">Next</p>
            <div className="flex items-center justify-center min-h-[60px]">
              <NextPiecePreview piece={nextPiece} />
            </div>
          </div>

          {/* Current piece kind badge */}
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 min-w-[70px]">
            <p className="text-gray-400 text-xs uppercase tracking-wider mb-2">Current</p>
            {isCurrentSlime ? (
              <span className="inline-block px-2 py-1 bg-emerald-700/60 text-emerald-300 text-xs font-bold rounded-full border border-emerald-500/50 animate-pulse">
                SLIME
              </span>
            ) : (
              <span className="inline-block px-2 py-1 bg-gray-700 text-gray-300 text-xs font-bold rounded border border-gray-600">
                BLOCK
              </span>
            )}
          </div>

          {/* Status */}
          {isSlimeFalling && (
            <div className="bg-emerald-900/40 border border-emerald-600/50 rounded-lg p-3 min-w-[70px]">
              <p className="text-emerald-400 text-xs font-semibold animate-pulse">
                Slime falling...
              </p>
            </div>
          )}

          {/* Controls help */}
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 hidden lg:block min-w-[120px] text-xs text-gray-500 space-y-1">
            <p className="text-gray-400 font-semibold mb-2">Controls</p>
            <p>← → Move</p>
            <p>Space Rotate</p>
            <p>↓ Soft drop</p>
            <p>↑ Hard drop</p>
            <p>Shift Hold</p>
            <p>P Pause</p>
          </div>

          {/* Restart button (always visible) */}
          {!gameOver && (
            <button
              onClick={restart}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm transition-colors border border-gray-600"
            >
              Restart
            </button>
          )}
        </div>
      </div>
      {/* リーダーボードモーダル */}
      {gameOver && isTopScore && !showLeaderboard && (
        <LeaderboardModal
          gameId="slime"
          score={score}
          onClose={() => setShowLeaderboard(true)}
        />
      )}

      {/* タッチコントロール */}
      {!gameOver && !paused && !waiting && (
        <TouchControls
          onLeft={moveLeft}
          onRight={moveRight}
          onSoftDropStart={softDropStart}
          onSoftDropEnd={softDropEnd}
          onRotate={rotate}
          onHardDrop={hardDrop}
          onHold={hold}
        />
      )}
    </div>
  )
}
