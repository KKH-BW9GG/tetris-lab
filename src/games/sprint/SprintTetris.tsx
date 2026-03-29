import { useState, useEffect } from 'react'
import { useSprintTetris, TARGET_LINES, formatElapsed } from './useSprintTetris'
import { useDAS } from '../../shared/useDAS'
import { CELL_SIZE, BOARD_COLS, BOARD_ROWS } from '../../shared/tetrominos'
import type { Board, Piece } from '../../shared/types'
import TouchControls from '../../shared/TouchControls'
import LeaderboardModal from '../../shared/LeaderboardModal'
import { isTopTime } from '../../shared/leaderboard'
import { startBGM, stopBGM } from '../../shared/sound'

interface Props {
  onBack: () => void
}

// -------------------------------------------------------
// BoardView
// -------------------------------------------------------
interface BoardViewProps {
  board: Board
  piece: Piece | null
  ghostPiece: Piece | null
  flashingRows?: number[]
}

function BoardView({ board, piece, ghostPiece, flashingRows = [] }: BoardViewProps) {
  const boardWidth = CELL_SIZE * BOARD_COLS
  const boardHeight = CELL_SIZE * BOARD_ROWS

  return (
    <div
      className="relative border-2 border-cyan-500"
      style={{ width: boardWidth, height: boardHeight, touchAction: 'none' }}
    >
      {/* グリッド */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${BOARD_COLS}, ${CELL_SIZE}px)`,
          gridTemplateRows: `repeat(${BOARD_ROWS}, ${CELL_SIZE}px)`,
        }}
      >
        {board.map((row, r) =>
          row.map((cell, c) => (
            <div
              key={`${r}-${c}`}
              className={cell.kind === 'empty' ? 'bg-gray-800 border-r border-b border-gray-700' : ''}
              style={{
                width: CELL_SIZE,
                height: CELL_SIZE,
                backgroundColor: cell.kind !== 'empty' ? cell.color : undefined,
                boxSizing: 'border-box',
              }}
            />
          ))
        )}
      </div>

      {/* ゴーストピース */}
      {ghostPiece &&
        ghostPiece.shape.map((row, r) =>
          row.map((cell, c) => {
            if (!cell) return null
            const left = (ghostPiece.x + c) * CELL_SIZE
            const top = (ghostPiece.y + r) * CELL_SIZE
            return (
              <div
                key={`ghost-${r}-${c}`}
                className="absolute"
                style={{
                  left,
                  top,
                  width: CELL_SIZE,
                  height: CELL_SIZE,
                  border: '2px solid rgba(6,182,212,0.5)',
                  backgroundColor: 'rgba(6,182,212,0.12)',
                  boxSizing: 'border-box',
                }}
              />
            )
          })
        )}

      {/* アクティブピース */}
      {piece &&
        piece.shape.map((row, r) =>
          row.map((cell, c) => {
            if (!cell) return null
            const left = (piece.x + c) * CELL_SIZE
            const top = (piece.y + r) * CELL_SIZE
            return (
              <div
                key={`piece-${r}-${c}`}
                className="absolute"
                style={{
                  left,
                  top,
                  width: CELL_SIZE,
                  height: CELL_SIZE,
                  backgroundColor: piece.color,
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
    </div>
  )
}

// -------------------------------------------------------
// NextPiecePreview
// -------------------------------------------------------
function NextPiecePreview({ piece }: { piece: Piece }) {
  const previewSize = 20
  const cols = piece.shape[0].length
  const rows = piece.shape.length
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, ${previewSize}px)`,
        gridTemplateRows: `repeat(${rows}, ${previewSize}px)`,
      }}
    >
      {piece.shape.map((row, r) =>
        row.map((cell, c) => (
          <div
            key={`next-${r}-${c}`}
            style={{
              width: previewSize,
              height: previewSize,
              backgroundColor: cell ? piece.color : 'transparent',
              border: cell ? '1px solid rgba(0,0,0,0.3)' : 'none',
              boxSizing: 'border-box',
            }}
          />
        ))
      )}
    </div>
  )
}

// -------------------------------------------------------
// HoldPiecePreview
// -------------------------------------------------------
function HoldPiecePreview({ piece }: { piece: Piece }) {
  const previewSize = 20
  const cols = piece.shape[0].length
  const rows = piece.shape.length
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, ${previewSize}px)`,
        gridTemplateRows: `repeat(${rows}, ${previewSize}px)`,
      }}
    >
      {piece.shape.map((row, r) =>
        row.map((cell, c) => (
          <div
            key={`hold-${r}-${c}`}
            style={{
              width: previewSize,
              height: previewSize,
              backgroundColor: cell ? piece.color : 'transparent',
              border: cell ? '1px solid rgba(0,0,0,0.3)' : 'none',
              boxSizing: 'border-box',
            }}
          />
        ))
      )}
    </div>
  )
}

// -------------------------------------------------------
// プログレスバー
// -------------------------------------------------------
function ProgressBar({ lines }: { lines: number }) {
  const pct = Math.min((lines / TARGET_LINES) * 100, 100)
  const remaining = TARGET_LINES - lines

  let barColor: string
  if (pct >= 100) {
    barColor = 'linear-gradient(90deg, #06b6d4, #10b981)'
  } else if (remaining < 5) {
    barColor = 'linear-gradient(90deg, #dc2626, #ef4444)'
  } else if (remaining < 10) {
    barColor = 'linear-gradient(90deg, #d97706, #f59e0b)'
  } else if (remaining < 20) {
    barColor = 'linear-gradient(90deg, #16a34a, #22c55e)'
  } else {
    barColor = 'linear-gradient(90deg, #0891b2, #06b6d4)'
  }

  return (
    <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
      <div
        className="h-3 rounded-full transition-all duration-200"
        style={{ width: `${pct}%`, background: barColor }}
      />
    </div>
  )
}

// -------------------------------------------------------
// SprintTetris
// -------------------------------------------------------
export default function SprintTetris({ onBack }: Props) {
  const { state, getGhostPiece, start, moveLeft, moveRight, rotate, hardDrop, hold, softDropStart, softDropEnd, togglePause } =
    useSprintTetris()
  useDAS(moveLeft, moveRight)

  const [showLeaderboard, setShowLeaderboard] = useState(false)
  const [leaderboardShown, setLeaderboardShown] = useState(false)

  useEffect(() => {
    startBGM('sprint')
    return () => stopBGM()
  }, [])

  useEffect(() => {
    if (state.gameOver || state.finished) stopBGM()
  }, [state.gameOver, state.finished])

  const ghostPiece = state.piece ? getGhostPiece(state.board, state.piece) : null

  // 達成時にリーダーボード判定（一度だけ）
  if (state.finished && !leaderboardShown && !showLeaderboard) {
    if (isTopTime('sprint', state.elapsedMs)) {
      setShowLeaderboard(true)
    }
    setLeaderboardShown(true)
  }

  const handleRestart = () => {
    setShowLeaderboard(false)
    setLeaderboardShown(false)
    start()
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center gap-6 py-8">
      {/* ヘッダー */}
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="px-3 py-1 rounded bg-gray-700 hover:bg-gray-600 text-sm transition-colors"
        >
          ← 戻る
        </button>
        <h1 className="text-2xl font-bold text-cyan-400">スプリントテトリス - 40 Lines</h1>
        {!state.gameOver && !state.finished && !state.waiting && (
          <button
            onClick={togglePause}
            className="px-3 py-1 rounded bg-gray-700 hover:bg-gray-600 text-sm transition-colors"
          >
            {state.paused ? '▶ 再開' : '⏸ 停止'}
          </button>
        )}
      </div>

      {/* メインレイアウト */}
      <div className="flex flex-wrap gap-4 justify-center items-start">
        {/* ボードエリア */}
        <div className="relative">
          <BoardView board={state.board} piece={state.piece} ghostPiece={ghostPiece} flashingRows={state.flashingRows} />

          {/* ポーズオーバーレイ */}
          {state.paused && !state.gameOver && !state.finished && (
            <div
              className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded"
              style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(2px)' }}
            >
              <span
                className="font-black text-white tracking-widest select-none"
                style={{ fontSize: '48px', textShadow: '0 0 30px rgba(6,182,212,0.9)', letterSpacing: '0.15em' }}
              >
                PAUSED
              </span>
              <span className="text-gray-400 text-sm">P キーで再開</span>
            </div>
          )}

          {/* READY オーバーレイ（キー入力待ち） */}
          {state.waiting && (
            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-2 rounded">
              <div className="text-4xl font-black text-cyan-300 animate-pulse">READY</div>
              <div className="text-sm text-gray-400">Press any key to start</div>
            </div>
          )}

          {/* 達成オーバーレイ */}
          {state.finished && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded"
              style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(3px)' }}>
              <div className="text-4xl font-black" style={{
                color: '#67e8f9',
                textShadow: '0 0 30px rgba(103,232,249,0.9), 0 0 60px rgba(103,232,249,0.4)',
                letterSpacing: '0.1em',
              }}>⚡ CLEAR!</div>
              <div className="text-5xl font-black text-white tabular-nums"
                style={{ textShadow: '0 0 20px rgba(255,255,255,0.5)' }}>
                {formatElapsed(state.elapsedMs)}
              </div>
              <div className="text-xs text-cyan-400 tracking-widest uppercase">40 Lines Complete</div>
            </div>
          )}

          {/* ゲームオーバーオーバーレイ */}
          {state.gameOver && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded"
              style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(3px)' }}>
              <div className="text-3xl font-black game-over-text">GAME OVER</div>
              <div className="text-sm text-gray-400">
                {state.lines} / {TARGET_LINES} Lines
              </div>
            </div>
          )}
        </div>

        {/* サイドパネル */}
        <div className="flex flex-row flex-wrap gap-2 justify-center lg:flex-col lg:gap-4 min-w-[280px] lg:min-w-[140px]">
          {/* HOLD */}
          <div className={`bg-gray-900 rounded-lg p-3 border text-center min-w-[100px] ${!state.canHold ? 'border-gray-800 opacity-50' : 'border-cyan-500'}`}>
            <div className="text-xs text-gray-400 mb-2">HOLD</div>
            <div className="flex justify-center items-center min-h-[48px]">
              {state.heldPiece ? (
                <HoldPiecePreview piece={state.heldPiece} />
              ) : (
                <span className="text-gray-600 text-xs">—</span>
              )}
            </div>
          </div>

          {/* タイマー */}
          <div className="bg-gray-900 rounded-lg p-3 border border-cyan-500 text-center min-w-[100px]">
            <div className="text-xs text-gray-400 mb-1">タイム</div>
            <div className="text-4xl font-black tabular-nums text-cyan-300 leading-tight">
              {formatElapsed(state.elapsedMs)}
            </div>
          </div>

          {/* ライン進捗 */}
          <div className="bg-gray-900 rounded-lg p-3 border border-teal-600 text-center min-w-[100px]">
            <div className="text-xs text-gray-400 mb-1">Lines</div>
            <div className="text-3xl font-black tabular-nums text-teal-300">
              {state.lines}
              <span className="text-lg font-normal text-gray-500"> / {TARGET_LINES}</span>
            </div>
            <div className="mt-2">
              <ProgressBar lines={state.lines} />
            </div>
            {/* 残りライン */}
            <div className="mt-2">
              {(() => {
                const remaining = TARGET_LINES - state.lines
                const colorClass =
                  remaining < 5 ? 'text-red-400' :
                  remaining < 10 ? 'text-yellow-400' :
                  remaining < 20 ? 'text-green-400' :
                  'text-gray-400'
                return (
                  <span className={`text-xs font-semibold ${colorClass}`}>
                    残り {Math.max(0, remaining)} ライン
                  </span>
                )
              })()}
            </div>
          </div>

          {/* ネクストピース */}
          <div className="bg-gray-900 rounded-lg p-3 border border-gray-700 text-center min-w-[100px]">
            <div className="text-xs text-gray-400 mb-2">NEXT</div>
            <div className="flex justify-center">
              <NextPiecePreview piece={state.nextPiece} />
            </div>
          </div>

          {/* 操作説明 */}
          <div className="bg-gray-900 rounded-lg p-3 border border-gray-700 text-xs text-gray-400 space-y-1 min-w-[180px]">
            <div className="font-semibold text-gray-300 mb-1">操作</div>
            <div>← → 移動</div>
            <div>Space 回転</div>
            <div>↑ ハードドロップ</div>
            <div>↓ ソフトドロップ</div>
            <div>Shift ホールド</div>
            <div>P ポーズ</div>
          </div>

          {/* リスタートボタン（ゲームオーバー / クリア時） */}
          {(state.gameOver || state.finished) && (
            <button
              onClick={handleRestart}
              className="px-4 py-2 bg-cyan-700 hover:bg-cyan-600 rounded-lg font-semibold text-white text-sm transition-colors"
            >
              リスタート
            </button>
          )}

          {(state.gameOver || state.finished) && (
            <button
              onClick={onBack}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm text-gray-300 transition-colors"
            >
              メニューへ
            </button>
          )}
        </div>
      </div>

      {/* タッチコントロール */}
      {!state.gameOver && !state.finished && !state.paused && (
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

      {/* リーダーボードモーダル */}
      {showLeaderboard && (
        <LeaderboardModal
          gameId="sprint"
          score={state.elapsedMs}
          isTime={true}
          onClose={() => setShowLeaderboard(false)}
        />
      )}
    </div>
  )
}
