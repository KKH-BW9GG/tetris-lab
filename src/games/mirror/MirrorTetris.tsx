import { useState, useEffect, useRef } from 'react'
import { useMirrorTetris } from './useMirrorTetris'
import { useDAS } from '../../shared/useDAS'
import { BOARD_COLS, BOARD_ROWS } from '../../shared/tetrominos'
import { useCellSize } from '../../shared/useCellSize'
import type { Board, Piece } from '../../shared/types'
import TouchControls from '../../shared/TouchControls'
import LeaderboardModal, { WeeklyTable } from '../../shared/LeaderboardModal'
import { getWeeklyScores } from '../../shared/leaderboard'
import { startBGM, stopBGM } from '../../shared/sound'

interface Props {
  onBack: () => void
}

interface BoardViewProps {
  board: Board
  piece: Piece | null
  mirrorPiece: Piece | null
  ghostPiece: Piece | null
  flashingRows?: number[]
  cellSize: number
}

/** メインピースとミラーピースの水平距離（センター列距離）を返す */
function getPieceCenterDistance(piece: Piece, mirrorPiece: Piece): number {
  const mainCenter = piece.x + piece.shape[0].length / 2
  const mirrorCenter = mirrorPiece.x + mirrorPiece.shape[0].length / 2
  return Math.abs(mainCenter - mirrorCenter)
}

function BoardView({ board, piece, mirrorPiece, ghostPiece, flashingRows = [], cellSize }: BoardViewProps) {
  const boardWidth = cellSize * BOARD_COLS
  const boardHeight = cellSize * BOARD_ROWS

  const showDanger =
    piece !== null &&
    mirrorPiece !== null &&
    getPieceCenterDistance(piece, mirrorPiece) <= 3

  return (
    <div
      className="relative border-2 border-purple-500"
      style={{ width: boardWidth, height: boardHeight }}
    >
      {/* ボード背景グリッド */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${BOARD_COLS}, ${cellSize}px)`,
          gridTemplateRows: `repeat(${BOARD_ROWS}, ${cellSize}px)`,
        }}
      >
        {board.map((row, r) =>
          row.map((cell, c) => (
            <div
              key={`${r}-${c}`}
              className={cell.kind === 'empty' ? 'bg-gray-800 border-r border-b border-gray-700' : ''}
              style={{
                width: cellSize,
                height: cellSize,
                backgroundColor: cell.kind !== 'empty' ? cell.color : undefined,
                boxSizing: 'border-box',
              }}
            />
          ))
        )}
      </div>

      {/* ミラーピース（半透明・紫がかった色合い） */}
      {mirrorPiece &&
        mirrorPiece.shape.map((row, r) =>
          row.map((cell, c) => {
            if (!cell) return null
            const left = (mirrorPiece.x + c) * cellSize
            const top = (mirrorPiece.y + r) * cellSize
            return (
              <div
                key={`mirror-${r}-${c}`}
                className="absolute"
                style={{
                  left,
                  top,
                  width: cellSize,
                  height: cellSize,
                  backgroundColor: mirrorPiece.color,
                  opacity: 0.6,
                  filter: 'hue-rotate(160deg) saturate(1.4)',
                  boxSizing: 'border-box',
                  border: '1px solid rgba(192,132,252,0.5)',
                }}
              />
            )
          })
        )}

      {/* ゴーストピース */}
      {ghostPiece &&
        ghostPiece.shape.map((row, r) =>
          row.map((cell, c) => {
            if (!cell) return null
            const left = (ghostPiece.x + c) * cellSize
            const top = (ghostPiece.y + r) * cellSize
            return (
              <div
                key={`ghost-${r}-${c}`}
                className="absolute"
                style={{
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

      {/* メインピース */}
      {piece &&
        piece.shape.map((row, r) =>
          row.map((cell, c) => {
            if (!cell) return null
            const left = (piece.x + c) * cellSize
            const top = (piece.y + r) * cellSize
            return (
              <div
                key={`piece-${r}-${c}`}
                className="absolute"
                style={{
                  left,
                  top,
                  width: cellSize,
                  height: cellSize,
                  backgroundColor: piece.color,
                  boxSizing: 'border-box',
                  border: '1px solid rgba(255,255,255,0.3)',
                }}
              />
            )
          })
        )}

      {/* DANGER 表示 */}
      {showDanger && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span
            className="font-black text-red-400 select-none animate-pulse"
            style={{
              fontSize: '48px',
              lineHeight: 1,
              opacity: 0.85,
              textShadow: '0 0 20px rgba(248,113,113,0.9)',
              letterSpacing: '0.05em',
            }}
          >
            DANGER
          </span>
        </div>
      )}

      {/* ライン消去フラッシュ */}
      {flashingRows.map(r => (
        <div
          key={`flash-${r}`}
          className="flash-row"
          style={{ top: r * cellSize, height: cellSize }}
        />
      ))}
    </div>
  )
}

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

export default function MirrorTetris({ onBack }: Props) {
  const { state, ghostPiece, start, moveLeft, moveRight, rotate, hardDrop, softDropStart, softDropEnd, togglePause } =
    useMirrorTetris()
  useDAS(moveLeft, moveRight)
  const cellSize = useCellSize()
  const [showLeaderboard, setShowLeaderboard] = useState(false)
  const [scoreHighlight, setScoreHighlight] = useState(false)
  const prevScoreRef = useRef(state.score)

  useEffect(() => {
    startBGM('mirror')
    return () => stopBGM()
  }, [])

  useEffect(() => {
    if (state.gameOver) stopBGM()
  }, [state.gameOver])

  useEffect(() => {
    if (state.score !== prevScoreRef.current) {
      prevScoreRef.current = state.score
      setScoreHighlight(true)
      const t = setTimeout(() => setScoreHighlight(false), 300)
      return () => clearTimeout(t)
    }
  }, [state.score])

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-start gap-2 py-4 overflow-y-auto">
      {/* ヘッダー */}
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="px-3 py-1 rounded bg-gray-700 hover:bg-gray-600 text-sm transition-colors"
        >
          ← 戻る
        </button>
        <h1 className="text-2xl font-bold text-purple-400">ミラーテトリス</h1>
        {!state.gameOver && (
          <button
            onClick={togglePause}
            className="px-3 py-1 rounded bg-gray-700 hover:bg-gray-600 text-sm transition-colors"
          >
            {state.paused ? '▶ 再開' : '⏸ 停止'}
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-4 justify-center items-start">
        {/* ボード */}
        <div style={{ position: 'relative', touchAction: 'none' }}>
        <BoardView
          board={state.board}
          piece={state.piece}
          mirrorPiece={state.mirrorPiece}
          ghostPiece={ghostPiece}
          flashingRows={state.flashingRows}
          cellSize={cellSize}
        />
        {/* READY オーバーレイ */}
        {state.waiting && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3"
            style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(2px)' }} onPointerDown={() => window.dispatchEvent(new KeyboardEvent("keydown", { key: " " }))}>
            <span className="text-5xl font-black text-purple-300 animate-pulse tracking-widest">READY</span>
            <span className="text-gray-400 text-sm">Tap to start</span>
          </div>
        )}
        {/* ポーズオーバーレイ */}
        {state.paused && !state.gameOver && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center gap-2"
            style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(2px)' }}
          >
            <span
              className="font-black text-white tracking-widest select-none"
              style={{ fontSize: '48px', textShadow: '0 0 30px rgba(139,92,246,0.9)', letterSpacing: '0.15em' }}
            >
              PAUSED
            </span>
            <span className="text-gray-400 text-sm">P キーで再開</span>
          </div>
        )}
        </div>

        {/* サイドバー */}
        <div className="flex flex-row flex-wrap gap-1 justify-center lg:flex-col lg:gap-4 lg:min-w-[140px]">
          <div className="bg-gray-900 rounded-lg p-1.5 border border-purple-500 text-center min-w-[70px]">
            <div className="text-xs text-gray-400 mb-1">スコア</div>
            <div
              className={`text-lg font-bold tabular-nums transition-colors duration-150 ${
                scoreHighlight ? 'text-white' : 'text-yellow-400'
              }`}
              style={scoreHighlight ? { textShadow: '0 0 12px rgba(255,255,255,0.9)' } : undefined}
            >
              {state.score.toLocaleString()}
            </div>
          </div>

          {/* NEXT ピースプレビュー */}
          <div className="bg-gray-900 rounded-lg p-1.5 border border-gray-700 text-center min-w-[70px]">
            <div className="text-xs text-gray-400 mb-2">NEXT</div>
            <div className="flex justify-center items-center min-h-[36px]">
              <NextPiecePreview piece={state.nextPiece} />
            </div>
          </div>

          <div className="bg-gray-900 rounded-lg p-1.5 border border-gray-700 text-center min-w-[70px]">
            <div className="text-xs text-gray-400 mb-1">ライン</div>
            <div className="text-xl font-bold tabular-nums text-green-400">
              {state.lines}
            </div>
          </div>

          <div className="bg-gray-900 rounded-lg p-1.5 border border-gray-700 text-center min-w-[70px]">
            <div className="text-xs text-gray-400 mb-1">レベル</div>
            <div className="text-xl font-bold tabular-nums text-purple-300">
              {state.level}
            </div>
          </div>

          {/* 凡例 */}
          <div className="bg-gray-900 rounded-lg p-1.5 border border-gray-700 text-xs space-y-2 min-w-[70px]">
            <div className="font-semibold text-gray-300 mb-1">ピース</div>
            <div className="flex items-center gap-2">
              <div
                className="rounded-sm flex-shrink-0"
                style={{
                  width: 14,
                  height: 14,
                  backgroundColor: '#C77DFF',
                  border: '1px solid rgba(255,255,255,0.3)',
                }}
              />
              <span className="text-gray-400">メイン</span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="rounded-sm flex-shrink-0"
                style={{
                  width: 14,
                  height: 14,
                  backgroundColor: '#C77DFF',
                  opacity: 0.6,
                  filter: 'hue-rotate(160deg) saturate(1.4)',
                  border: '1px solid rgba(192,132,252,0.5)',
                }}
              />
              <span className="text-gray-400">ミラー</span>
            </div>
          </div>

          {/* 操作説明 */}
          <div className="bg-gray-900 rounded-lg p-1.5 border border-gray-700 text-xs text-gray-400 space-y-1 hidden lg:block min-w-[120px]">
            <div className="font-semibold text-gray-300 mb-1">操作</div>
            <div>← → 移動</div>
            <div>Space 回転</div>
            <div>↓ ソフトドロップ</div>
            <div>↑ ハードドロップ</div>
            <div>P ポーズ</div>
          </div>
        </div>
      </div>

      {/* レベルアップバースト */}
      {state.levelUpFlash && (
        <div className="level-up-burst" />
      )}

      {/* タッチコントロール */}
      {!state.gameOver && !state.paused && !state.waiting && (
        <TouchControls
          onLeft={moveLeft}
          onRight={moveRight}
          onSoftDropStart={softDropStart}
          onSoftDropEnd={softDropEnd}
          onRotate={rotate}
          onHardDrop={hardDrop}
        />
      )}

      {/* リーダーボードモーダル */}
      {state.gameOver && state.isTopScore && !showLeaderboard && (
        <LeaderboardModal
          gameId="mirror"
          score={state.score}
          onClose={() => setShowLeaderboard(true)}
        />
      )}

      {/* ゲームオーバーオーバーレイ */}
      {state.gameOver && (!state.isTopScore || showLeaderboard) && (
        <div className="fixed inset-0 bg-black/70 flex flex-col items-center justify-center gap-6 z-50">
          <div className="bg-gray-900 border-2 border-purple-500 rounded-2xl p-8 flex flex-col items-center gap-4 shadow-2xl max-w-xs w-full mx-4">
            <h2 className="text-3xl font-bold game-over-text">GAME OVER</h2>
            <div className="text-lg text-gray-300">
              スコア:{' '}
              <span className="text-yellow-400 font-bold">
                {state.score.toLocaleString()}
              </span>
            </div>
            <div className="text-sm text-gray-400">ライン消去: {state.lines} / レベル: {state.level}</div>
            <WeeklyTable entries={getWeeklyScores('mirror')} />
            <button
              onClick={start}
              className="mt-2 px-6 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg font-semibold text-white transition-colors w-full"
            >
              リスタート
            </button>
            <button
              onClick={onBack}
              className="px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm text-gray-300 transition-colors w-full"
            >
              メニューへ戻る
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
