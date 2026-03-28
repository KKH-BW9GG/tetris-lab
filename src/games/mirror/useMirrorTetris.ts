import { useCallback, useEffect, useRef, useState } from 'react'
import type { Board, Piece } from '../../shared/types'
import { BOARD_COLS, randomTetromino } from '../../shared/tetrominos'
import {
  createEmptyBoard,
  rotateCW,
  isColliding,
  mergePieceToBoard,
  getFullLines,
  clearLines,
  spawnX,
} from '../../shared/gameUtils'
import {
  soundMove,
  soundRotate,
  soundLand,
  soundClear1,
  soundClearMulti,
  soundTetris,
  soundGameOver,
} from '../../shared/sound'
import { isTopScore as checkTopScore } from '../../shared/leaderboard'

export interface MirrorTetrisState {
  board: Board
  piece: Piece | null
  mirrorPiece: Piece | null
  nextPiece: Piece
  score: number
  lines: number
  level: number
  gameOver: boolean
  isTopScore: boolean
  paused: boolean
  flashingRows: number[]
}

const SCORE_TABLE: Record<number, number> = { 1: 100, 2: 300, 3: 600, 4: 1000 }

/** shape を水平反転する */
function mirrorShape(shape: number[][]): number[][] {
  return shape.map(row => [...row].reverse())
}

/** ミラーピースの x 座標を計算する */
function calcMirrorX(mainX: number, shape: number[][]): number {
  return BOARD_COLS - mainX - shape[0].length
}

/** メインピースからミラーピースを生成する */
function buildMirrorPiece(piece: Piece): Piece {
  const mShape = mirrorShape(piece.shape)
  const mX = calcMirrorX(piece.x, piece.shape)
  return {
    shape: mShape,
    color: piece.color,
    x: mX,
    y: piece.y,
  }
}

function createPiece(): Piece {
  const tmpl = randomTetromino()
  return {
    shape: tmpl.shape,
    color: tmpl.color,
    x: spawnX(tmpl.shape),
    y: 0,
  }
}

function dropIntervalMs(level: number): number {
  return Math.max(100, 500 - (level - 1) * 40)
}

function calcLevel(lines: number): number {
  return Math.floor(lines / 10) + 1
}

/**
 * メインピース・ミラーピースの両方が衝突しないかチェック
 * 両方が通れる場合のみ true を返す（移動許可）
 */
function canMove(board: Board, next: Piece, nextMirror: Piece): boolean {
  return !isColliding(board, next) && !isColliding(board, nextMirror)
}

/**
 * 回転時のウォールキック: 両ピースが通れる位置を探す
 * dx オフセットを試みて最初に通る組み合わせを返す
 */
function tryRotateWithKick(
  board: Board,
  rotatedPiece: Piece,
  rotatedMirror: Piece,
): { piece: Piece; mirror: Piece } | null {
  const kicks = [0, 1, -1, 2, -2]
  for (const dx of kicks) {
    const p = { ...rotatedPiece, x: rotatedPiece.x + dx }
    const m = { ...rotatedMirror, x: rotatedMirror.x - dx }
    if (canMove(board, p, m)) return { piece: p, mirror: m }
  }
  return null
}

/**
 * メインピースをボードにマージしたあと、ミラーピースもマージする
 * 衝突している側は無視せず両方書き込む（union）
 */
function mergeBoth(board: Board, piece: Piece, mirrorPiece: Piece): Board {
  const after1 = mergePieceToBoard(board, piece, 'block')
  return mergePieceToBoard(after1, mirrorPiece, 'block')
}

function initState(): MirrorTetrisState {
  const piece = createPiece()
  const mirrorPiece = buildMirrorPiece(piece)
  const nextPiece = createPiece()
  return {
    board: createEmptyBoard(),
    piece,
    mirrorPiece,
    nextPiece,
    score: 0,
    lines: 0,
    level: 1,
    gameOver: false,
    isTopScore: false,
    paused: false,
    flashingRows: [],
  }
}

export function useMirrorTetris() {
  const [state, setState] = useState<MirrorTetrisState>(initState)
  const [softDrop, setSoftDrop] = useState(false)
  const gameOverRef = useRef(false)
  const pausedRef = useRef(false)

  // Clear flashingRows after animation completes
  useEffect(() => {
    if (state.flashingRows.length === 0) return
    const t = setTimeout(() => setState(prev => ({ ...prev, flashingRows: [] })), 180)
    return () => clearTimeout(t)
  }, [state.flashingRows])

  // -------------------------------------------------------
  // ピース固定 → ライン消去 → 次ピーム生成の共通処理
  // -------------------------------------------------------
  function lockPieces(
    prev: MirrorTetrisState,
    landedPiece: Piece,
    landedMirror: Piece,
  ): MirrorTetrisState {
    const merged = mergeBoth(prev.board, landedPiece, landedMirror)
    soundLand()

    const fullLines = getFullLines(merged)
    const count = fullLines.length

    if (count === 4) soundTetris()
    else if (count > 1) soundClearMulti(count)
    else if (count === 1) soundClear1()

    const cleared = count > 0 ? clearLines(merged, fullLines) : merged
    const newLines = prev.lines + count
    const newLevel = calcLevel(newLines)
    const newScore = prev.score + (SCORE_TABLE[count] ?? 0)

    // 次ピース生成
    const nextPiece = prev.nextPiece
    const nextMirror = buildMirrorPiece(nextPiece)
    const newNextPiece = createPiece()

    if (!isColliding(cleared, nextPiece) && !isColliding(cleared, nextMirror)) {
      return {
        ...prev,
        board: cleared,
        piece: nextPiece,
        mirrorPiece: nextMirror,
        nextPiece: newNextPiece,
        score: newScore,
        lines: newLines,
        level: newLevel,
        flashingRows: fullLines,
      }
    }

    // スポーン失敗 → ゲームオーバー
    gameOverRef.current = true
    soundGameOver()
    return {
      ...prev,
      board: cleared,
      piece: null,
      mirrorPiece: null,
      score: newScore,
      lines: newLines,
      level: newLevel,
      gameOver: true,
      isTopScore: checkTopScore('mirror', newScore),
      flashingRows: fullLines,
    }
  }

  // -------------------------------------------------------
  // dropTick
  // -------------------------------------------------------
  const dropTick = useCallback(() => {
    if (gameOverRef.current) return
    setState(prev => {
      if (!prev.piece || !prev.mirrorPiece || prev.gameOver) return prev

      const nextPiece: Piece = { ...prev.piece, y: prev.piece.y + 1 }
      const nextMirror: Piece = { ...prev.mirrorPiece, y: prev.mirrorPiece.y + 1 }

      if (canMove(prev.board, nextPiece, nextMirror)) {
        return { ...prev, piece: nextPiece, mirrorPiece: nextMirror }
      }

      // 落下不可 → 固定
      return lockPieces(prev, prev.piece, prev.mirrorPiece)
    })
  }, [])

  // Keep pausedRef in sync
  useEffect(() => {
    pausedRef.current = state.paused
  }, [state.paused])

  // -------------------------------------------------------
  // ドロップインターバル
  // -------------------------------------------------------
  useEffect(() => {
    if (state.gameOver || state.paused) return
    const ms = softDrop ? 50 : dropIntervalMs(state.level)
    const id = setInterval(dropTick, ms)
    return () => clearInterval(id)
  }, [state.gameOver, state.paused, state.level, softDrop, dropTick])

  // -------------------------------------------------------
  // キーボード操作
  // -------------------------------------------------------
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'p' || e.key === 'P') {
        if (!gameOverRef.current) {
          pausedRef.current = !pausedRef.current
          setState(prev => ({ ...prev, paused: !prev.paused }))
        }
        return
      }
      if (gameOverRef.current || pausedRef.current) return
      if ([' ', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
        e.preventDefault()
      }

      if (e.key === 'ArrowDown') {
        setSoftDrop(true)
        return
      }

      setState(prev => {
        if (!prev.piece || !prev.mirrorPiece || prev.gameOver) return prev

        switch (e.key) {
          case ' ': {
            // メインは CW 回転、ミラーは水平反転で自動的に逆回転（ウォールキック付き）
            const rotatedShape = rotateCW(prev.piece.shape)
            const nextPiece: Piece = { ...prev.piece, shape: rotatedShape }
            const nextMirror: Piece = buildMirrorPiece(nextPiece)
            const kicked = tryRotateWithKick(prev.board, nextPiece, nextMirror)
            if (!kicked) return prev
            soundRotate()
            return { ...prev, piece: kicked.piece, mirrorPiece: kicked.mirror }
          }
          case 'ArrowUp': {
            // ハードドロップ
            let dropped: Piece = { ...prev.piece }
            let droppedMirror: Piece = { ...prev.mirrorPiece }
            while (canMove(prev.board, { ...dropped, y: dropped.y + 1 }, { ...droppedMirror, y: droppedMirror.y + 1 })) {
              dropped = { ...dropped, y: dropped.y + 1 }
              droppedMirror = { ...droppedMirror, y: droppedMirror.y + 1 }
            }
            return lockPieces(prev, dropped, droppedMirror)
          }
        }
        return prev
      })
    }

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') setSoftDrop(false)
    }

    const onBlur = () => setSoftDrop(false)

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', onBlur)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', onBlur)
    }
  }, [])

  // -------------------------------------------------------
  // タッチ操作用アクション
  // -------------------------------------------------------
  const moveLeft = useCallback(() => {
    if (gameOverRef.current || pausedRef.current) return
    setState(prev => {
      if (!prev.piece || !prev.mirrorPiece || prev.gameOver) return prev
      const nextPiece: Piece = { ...prev.piece, x: prev.piece.x - 1 }
      const nextMirror: Piece = { ...prev.mirrorPiece, x: prev.mirrorPiece.x + 1 }
      if (!canMove(prev.board, nextPiece, nextMirror)) return prev
      soundMove()
      return { ...prev, piece: nextPiece, mirrorPiece: nextMirror }
    })
  }, [])

  const moveRight = useCallback(() => {
    if (gameOverRef.current || pausedRef.current) return
    setState(prev => {
      if (!prev.piece || !prev.mirrorPiece || prev.gameOver) return prev
      const nextPiece: Piece = { ...prev.piece, x: prev.piece.x + 1 }
      const nextMirror: Piece = { ...prev.mirrorPiece, x: prev.mirrorPiece.x - 1 }
      if (!canMove(prev.board, nextPiece, nextMirror)) return prev
      soundMove()
      return { ...prev, piece: nextPiece, mirrorPiece: nextMirror }
    })
  }, [])

  const rotate = useCallback(() => {
    if (gameOverRef.current || pausedRef.current) return
    setState(prev => {
      if (!prev.piece || !prev.mirrorPiece || prev.gameOver) return prev
      const rotatedShape = rotateCW(prev.piece.shape)
      const nextPiece: Piece = { ...prev.piece, shape: rotatedShape }
      const nextMirror: Piece = buildMirrorPiece(nextPiece)
      const kicked = tryRotateWithKick(prev.board, nextPiece, nextMirror)
      if (!kicked) return prev
      soundRotate()
      return { ...prev, piece: kicked.piece, mirrorPiece: kicked.mirror }
    })
  }, [])

  const hardDrop = useCallback(() => {
    if (gameOverRef.current || pausedRef.current) return
    setState(prev => {
      if (!prev.piece || !prev.mirrorPiece || prev.gameOver) return prev
      let dropped: Piece = { ...prev.piece }
      let droppedMirror: Piece = { ...prev.mirrorPiece }
      while (canMove(prev.board, { ...dropped, y: dropped.y + 1 }, { ...droppedMirror, y: droppedMirror.y + 1 })) {
        dropped = { ...dropped, y: dropped.y + 1 }
        droppedMirror = { ...droppedMirror, y: droppedMirror.y + 1 }
      }
      return lockPieces(prev, dropped, droppedMirror)
    })
  }, [])

  const softDropStart = useCallback(() => setSoftDrop(true), [])
  const softDropEnd = useCallback(() => setSoftDrop(false), [])

  // -------------------------------------------------------
  // リスタート
  // -------------------------------------------------------
  const start = useCallback(() => {
    gameOverRef.current = false
    pausedRef.current = false
    setSoftDrop(false)
    setState(initState)
  }, [])

  const togglePause = useCallback(() => {
    if (gameOverRef.current) return
    pausedRef.current = !pausedRef.current
    setState(prev => ({ ...prev, paused: !prev.paused }))
  }, [])

  // ゴーストピース（メインピースのみ）
  const ghostPiece = state.piece
    ? (() => {
        let ghost = { ...state.piece }
        while (!isColliding(state.board, { ...ghost, y: ghost.y + 1 })) {
          ghost = { ...ghost, y: ghost.y + 1 }
        }
        return ghost
      })()
    : null

  return { state, ghostPiece, start, moveLeft, moveRight, rotate, hardDrop, softDropStart, softDropEnd, togglePause }
}
