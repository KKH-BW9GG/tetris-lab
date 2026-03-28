import { useState, useEffect, useRef } from 'react'
import { useColorMatchTetris } from './useColorMatchTetris'
import { useDAS } from '../../shared/useDAS'
import { BOARD_COLS, BOARD_ROWS, CELL_SIZE } from '../../shared/tetrominos'
import type { Cell } from '../../shared/types'
import TouchControls from '../../shared/TouchControls'
import LeaderboardModal, { WeeklyTable } from '../../shared/LeaderboardModal'
import { getWeeklyScores } from '../../shared/leaderboard'
import { startBGM, stopBGM } from '../../shared/sound'

interface Props {
  onBack: () => void
}

// ---------------------------------------------------------------
// ネクストピースプレビュー
// ---------------------------------------------------------------

interface NextPiecePreviewProps {
  shape: number[][]
  colors: string[][]
}

function NextPiecePreview({ shape, colors }: NextPiecePreviewProps) {
  const rows = shape.length
  const cols = shape[0].length
  const previewSize = 20

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, ${previewSize}px)`,
        gridTemplateRows: `repeat(${rows}, ${previewSize}px)`,
        gap: '1px',
      }}
    >
      {shape.map((row, r) =>
        row.map((cell, c) => (
          <div
            key={`${r}-${c}`}
            style={{
              width: previewSize,
              height: previewSize,
              backgroundColor: cell ? colors[r][c] : 'transparent',
              borderRadius: cell ? 2 : 0,
              boxShadow: cell ? `inset 0 1px 2px rgba(255,255,255,0.3)` : 'none',
            }}
          />
        ))
      )}
    </div>
  )
}

// ---------------------------------------------------------------
// メインコンポーネント
// ---------------------------------------------------------------

export default function ColorMatchTetris({ onBack }: Props) {
  const {
    displayBoard,
    nextPiece,
    score,
    chain,
    gameOver,
    isClearing,
    isTopScore,
    paused,
    restart,
    moveLeft,
    moveRight,
    rotate,
    hardDrop,
    softDropStart,
    softDropEnd,
    togglePause,
  } = useColorMatchTetris()
  useDAS(moveLeft, moveRight)

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
    startBGM('colorMatch')
    return () => stopBGM()
  }, [])

  useEffect(() => {
    if (gameOver) stopBGM()
  }, [gameOver])

  const boardWidth = BOARD_COLS * CELL_SIZE
  const boardHeight = BOARD_ROWS * CELL_SIZE

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4">
      {/* ヘッダー */}
      <div className="flex items-center gap-4 mb-4">
        <button
          onClick={onBack}
          className="text-gray-400 hover:text-white transition-colors text-sm px-3 py-1 border border-gray-700 rounded"
        >
          ← Back
        </button>
        <h1 className="text-2xl font-bold text-orange-400 tracking-wider">
          Color Match Tetris
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
        {/* ボード */}
        <div
          className="border-2 border-orange-500 relative"
          style={{
            width: boardWidth,
            height: boardHeight,
          }}
        >
          {/* グリッド */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${BOARD_COLS}, ${CELL_SIZE}px)`,
              gridTemplateRows: `repeat(${BOARD_ROWS}, ${CELL_SIZE}px)`,
            }}
          >
            {displayBoard.map((row, r) =>
              row.map((cell, c) => (
                <BoardCell key={`${r}-${c}`} cell={cell} isClearing={isClearing} />
              ))
            )}
          </div>

          {/* ポーズオーバーレイ */}
          {paused && !gameOver && (
            <div
              className="absolute inset-0 flex flex-col items-center justify-center gap-2"
              style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(2px)' }}
            >
              <span
                className="font-black text-white tracking-widest"
                style={{ fontSize: '40px', textShadow: '0 0 30px rgba(249,115,22,0.9)', letterSpacing: '0.15em' }}
              >
                PAUSED
              </span>
              <span className="text-gray-400 text-xs">P key to resume</span>
            </div>
          )}

          {/* ゲームオーバーオーバーレイ */}
          {gameOver && (!isTopScore || showLeaderboard) && (
            <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-4 p-4">
              <p className="text-3xl font-bold game-over-text">GAME OVER</p>
              <p className="text-xl text-white">Score: {score}</p>
              <WeeklyTable entries={getWeeklyScores('colorMatch')} />
              <button
                onClick={restart}
                className="px-6 py-2 bg-orange-500 hover:bg-orange-400 text-black font-bold rounded transition-colors"
              >
                Restart
              </button>
              <button
                onClick={onBack}
                className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm font-medium rounded transition-colors"
              >
                Back to Menu
              </button>
            </div>
          )}
        </div>

        {/* サイドパネル */}
        <div className="flex flex-col gap-4 min-w-[120px]">
          {/* スコア */}
          <div className="bg-gray-900 border border-gray-700 rounded p-3">
            <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Score</p>
            <p
              className={`text-xl font-bold tabular-nums transition-colors duration-150 ${scoreHighlight ? 'text-white' : 'text-yellow-400'}`}
              style={scoreHighlight ? { textShadow: '0 0 12px rgba(255,255,255,0.9)' } : undefined}
            >
              {score.toLocaleString()}
            </p>
          </div>

          {/* 連鎖 */}
          {chain > 0 && (
            <div className="bg-orange-900/50 border border-orange-500 rounded p-3 animate-pulse">
              <p className="text-orange-300 text-xs uppercase tracking-wider mb-1">Chain</p>
              <p className="text-orange-400 text-xl font-bold">x{chain}</p>
            </div>
          )}

          {/* ネクストピース */}
          <div className="bg-gray-900 border border-gray-700 rounded p-3">
            <p className="text-gray-400 text-xs uppercase tracking-wider mb-2">Next</p>
            <div className="flex items-center justify-center min-h-[60px]">
              <NextPiecePreview shape={nextPiece.shape} colors={nextPiece.colors} />
            </div>
          </div>

          {/* 操作説明 */}
          <div className="bg-gray-900 border border-gray-700 rounded p-3 text-xs text-gray-500 space-y-1">
            <p className="text-gray-400 font-semibold mb-2">Controls</p>
            <p>← → Move</p>
            <p>Space Rotate</p>
            <p>↓ Soft Drop</p>
            <p>↑ Hard Drop</p>
            <p>P Pause</p>
          </div>

          {/* ルール説明 */}
          <div className="bg-gray-900 border border-gray-700 rounded p-3 text-xs text-gray-500 space-y-1">
            <p className="text-gray-400 font-semibold mb-2">Rules</p>
            <p>Line clear: row</p>
            <p>Color match:</p>
            <p className="pl-2">4+ same color</p>
            <p className="pl-2">connected</p>
            <p className="mt-1">Chain bonus!</p>
          </div>
        </div>
      </div>
      {/* リーダーボードモーダル */}
      {gameOver && isTopScore && !showLeaderboard && (
        <LeaderboardModal
          gameId="colorMatch"
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

// ---------------------------------------------------------------
// セル単体コンポーネント
// ---------------------------------------------------------------

interface BoardCellProps {
  cell: Cell & { flash?: boolean; ghost?: boolean }
  isClearing: boolean
}

function BoardCell({ cell, isClearing }: BoardCellProps) {
  const isEmpty = cell.kind === 'empty'
  const isFlash = cell.flash && isClearing
  const isGhost = (cell as Cell & { ghost?: boolean }).ghost === true

  let bgColor: string
  let boxShadow = 'none'
  let opacity = 1
  let borderRight = '1px solid #374151' // gray-700
  let borderBottom = '1px solid #374151'

  if (isFlash) {
    bgColor = '#ffffff'
    boxShadow = '0 0 8px #ffffff'
  } else if (isEmpty) {
    bgColor = '#1f2937' // gray-800
  } else if (isGhost) {
    bgColor = 'transparent'
    borderRight = `1px solid ${cell.color}`
    borderBottom = `1px solid ${cell.color}`
    opacity = 0.4
  } else {
    bgColor = cell.color
    boxShadow = `inset 0 1px 2px rgba(255,255,255,0.35), inset 0 -1px 2px rgba(0,0,0,0.35)`
  }

  return (
    <div
      style={{
        width: CELL_SIZE,
        height: CELL_SIZE,
        backgroundColor: bgColor,
        boxShadow,
        opacity,
        borderRight,
        borderBottom,
        boxSizing: 'border-box',
        transition: isFlash ? 'none' : 'background-color 0.05s',
      }}
    />
  )
}
