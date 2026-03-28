import { useState, useEffect, useRef, type CSSProperties } from 'react'
import { BOARD_COLS, BOARD_ROWS, CELL_SIZE } from '../../shared/tetrominos'
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

export default function SlimeTetris({ onBack }: Props) {
  const { state, ghostPiece, restart, moveLeft, moveRight, rotate, hardDrop, softDropStart, softDropEnd, togglePause } = useSlimeTetris()
  useDAS(moveLeft, moveRight)
  const { board, gameOver, score, lines, isCurrentSlime, isSlimeFalling, isTopScore, paused, flashingRows } = state
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
    startBGM('default')
    return () => stopBGM()
  }, [])

  useEffect(() => {
    if (gameOver) stopBGM()
  }, [gameOver])

  const boardWidth = BOARD_COLS * CELL_SIZE
  const boardHeight = BOARD_ROWS * CELL_SIZE

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4 select-none">
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

      <div className="flex gap-6 items-start">
        {/* Board */}
        <div className="relative border-2 border-emerald-500"
          style={{ width: boardWidth, height: boardHeight }}
        >
          {/* Grid cells */}
          {board.map((row, r) =>
            row.map((cell, c) => (
              <div
                key={`${r}-${c}`}
                className={getCellClass(cell, isCurrentSlime && cell.kind === 'slime')}
                style={{
                  position: 'absolute',
                  left: c * CELL_SIZE,
                  top: r * CELL_SIZE,
                  width: CELL_SIZE,
                  height: CELL_SIZE,
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
              const left = (ghostPiece.x + c) * CELL_SIZE
              const top = (ghostPiece.y + r) * CELL_SIZE
              return (
                <div
                  key={`ghost-${r}-${c}`}
                  style={{
                    position: 'absolute',
                    left,
                    top,
                    width: CELL_SIZE,
                    height: CELL_SIZE,
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
              style={{ top: r * CELL_SIZE, height: CELL_SIZE }}
            />
          ))}

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
            </div>
          )}
        </div>

        {/* Side panel */}
        <div className="flex flex-col gap-4 min-w-[120px]">
          {/* Score */}
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-3">
            <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Score</p>
            <p
              className={`text-2xl font-bold tabular-nums transition-colors duration-150 ${scoreHighlight ? 'text-white' : 'text-yellow-400'}`}
              style={scoreHighlight ? { textShadow: '0 0 12px rgba(255,255,255,0.9)' } : undefined}
            >
              {score.toLocaleString()}
            </p>
          </div>

          {/* Lines */}
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-3">
            <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Lines</p>
            <p className="text-green-400 text-xl font-bold tabular-nums">{lines}</p>
          </div>

          {/* Current piece kind badge */}
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-3">
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
            <div className="bg-emerald-900/40 border border-emerald-600/50 rounded-lg p-3">
              <p className="text-emerald-400 text-xs font-semibold animate-pulse">
                Slime falling...
              </p>
            </div>
          )}

          {/* Controls help */}
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 text-xs text-gray-500 space-y-1">
            <p className="text-gray-400 font-semibold mb-2">Controls</p>
            <p>← → Move</p>
            <p>Space Rotate</p>
            <p>↓ Soft drop</p>
            <p>↑ Hard drop</p>
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
      {!gameOver && !paused && (
        <TouchControls
          onLeft={moveLeft}
          onRight={moveRight}
          onSoftDropStart={softDropStart}
          onSoftDropEnd={softDropEnd}
          onRotate={rotate}
          onHardDrop={hardDrop}
        />
      )}
    </div>
  )
}
