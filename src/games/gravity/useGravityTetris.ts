import { useCallback, useEffect, useRef, useState } from "react";
import type { Board, Piece } from "../../shared/types";
import {
  BOARD_COLS,
  BOARD_ROWS,
  randomTetromino,
} from "../../shared/tetrominos";
import {
  createEmptyBoard,
  rotateCW,
  isColliding,
  mergePieceToBoard,
  getFullLines,
  spawnX,
} from "../../shared/gameUtils";
import {
  soundRotate,
  soundLand,
  soundClear1,
  soundClearMulti,
  soundTetris,
  soundGameOver,
  soundFlip,
  soundLevelUp,
} from "../../shared/sound";
import { isTopScore } from "../../shared/leaderboard";

export const FLIP_INTERVAL_MS = 30_000;
export const FLIP_ANIM_MS = 700;
const FLIP_MID_MS = Math.floor(FLIP_ANIM_MS / 2);
const SOFT_MS = 50;

/** レベルに応じた落下速度 */
function dropInterval(level: number): number {
  return Math.max(80, 500 - (level - 1) * 40);
}

const SCORE_TABLE: Record<number, number> = { 1: 100, 2: 300, 3: 600, 4: 1000 };

type Gravity = "down" | "up";
export type FlipDirection = "toUp" | "toDown";

function clearLinesGravity(
  board: Board,
  lines: number[],
  gravity: Gravity,
): Board {
  const lineSet = new Set(lines);
  const remaining = board.filter((_, i) => !lineSet.has(i));
  const empty = Array.from({ length: lines.length }, () =>
    Array.from({ length: BOARD_COLS }, () => ({
      kind: "empty" as const,
      color: "",
    })),
  );
  return gravity === "down"
    ? [...empty, ...remaining]
    : [...remaining, ...empty];
}

/**
 * 重力方向に詰める。並び順は変わらず、空行だけ反対側に移動する。
 * gravity='down': 空行を上に、ブロック行を下に
 * gravity='up':   ブロック行を上に、空行を下に
 */
function compactBoard(board: Board, gravity: Gravity): Board {
  const emptyRows = board.filter((row) => row.every((c) => c.kind === "empty"));
  const filledRows = board.filter((row) => row.some((c) => c.kind !== "empty"));
  return gravity === "down"
    ? [...emptyRows, ...filledRows]
    : [...filledRows, ...emptyRows];
}

/**
 * ブロックが「天井」（重力と反対側の端）に達したかチェック。
 * gravity='down': 天井 = row 0（上端）
 * gravity='up':   天井 = row BOARD_ROWS-1（下端）
 */
function isCeilingReached(board: Board, gravity: Gravity): boolean {
  const ceilingRow = gravity === "down" ? 0 : BOARD_ROWS - 1;
  return board[ceilingRow].some((c) => c.kind !== "empty");
}

function spawnY(shape: number[][], gravity: Gravity): number {
  return gravity === "down" ? 0 : BOARD_ROWS - shape.length;
}

function createPiece(gravity: Gravity): Piece {
  const tmpl = randomTetromino();
  return {
    shape: tmpl.shape,
    color: tmpl.color,
    x: spawnX(tmpl.shape),
    y: spawnY(tmpl.shape, gravity),
  };
}

export interface GravityTetrisState {
  board: Board;
  piece: Piece | null;
  nextPiece: Piece;
  score: number;
  gameOver: boolean;
  gravity: Gravity;
  flipCountdown: number;
  lines: number;
  level: number;
  isFlipping: boolean;
  flipDirection: FlipDirection;
  isTopScore: boolean; // ゲームオーバー時にリーダーボード表示するか
  paused: boolean;
  flashingRows: number[];
  levelUpFlash: boolean;
  waiting: boolean;
  heldPiece: Piece | null;
  canHold: boolean;
}

export function useGravityTetris() {
  const [state, setState] = useState<GravityTetrisState>(() => {
    const gravity: Gravity = "down";
    const piece = createPiece(gravity);
    const nextPiece = createPiece(gravity);
    return {
      board: createEmptyBoard(),
      piece,
      nextPiece,
      score: 0,
      gameOver: false,
      gravity,
      flipCountdown: FLIP_INTERVAL_MS / 1000,
      lines: 0,
      level: 1,
      isFlipping: false,
      flipDirection: "toUp",
      isTopScore: false,
      paused: false,
      flashingRows: [],
      levelUpFlash: false,
      waiting: true,
      heldPiece: null,
      canHold: true,
    };
  });

  const pausedRef = useRef(false);
  const waitingRef = useRef(true);

  const [softDrop, setSoftDrop] = useState(false);

  const gameOverRef = useRef(false);
  const isFlippingRef = useRef(false);
  const flipGenRef = useRef(0);
  const holdRef = useRef<() => void>(() => {});

  // -------------------------------------------------------
  // dropTick
  // -------------------------------------------------------
  const dropTick = useCallback(() => {
    if (gameOverRef.current || isFlippingRef.current) return;
    setState((prev) => {
      if (!prev.piece || prev.gameOver || prev.isFlipping) return prev;
      const dy = prev.gravity === "down" ? 1 : -1;
      const moved: Piece = { ...prev.piece, y: prev.piece.y + dy };
      if (!isColliding(prev.board, moved)) return { ...prev, piece: moved };

      // ピース固定
      soundLand();
      const merged = mergePieceToBoard(prev.board, prev.piece, "block");
      const fullLines = getFullLines(merged);
      const cleared = fullLines.length
        ? clearLinesGravity(merged, fullLines, prev.gravity)
        : merged;
      const newScore = prev.score + (SCORE_TABLE[fullLines.length] ?? 0);
      const newLines = prev.lines + fullLines.length;
      const newLevel = Math.floor(newLines / 10) + 1;
      const leveledUp = newLevel > prev.level;

      // サウンド
      if (fullLines.length === 4) soundTetris();
      else if (fullLines.length > 1) soundClearMulti(fullLines.length);
      else if (fullLines.length === 1) soundClear1();
      if (leveledUp) setTimeout(soundLevelUp, 100);

      // 次ピースがスポーン可能かチェック（天井に触れても次が置ければ続行）
      const nextPiece = prev.nextPiece;
      const newNextPiece = createPiece(prev.gravity);
      if (!isColliding(cleared, nextPiece)) {
        return {
          ...prev,
          board: cleared,
          piece: nextPiece,
          nextPiece: newNextPiece,
          score: newScore,
          lines: newLines,
          level: newLevel,
          flashingRows: fullLines,
          levelUpFlash: leveledUp,
          canHold: true,
        };
      }
      soundGameOver();
      gameOverRef.current = true;
      return {
        ...prev,
        board: cleared,
        piece: null,
        score: newScore,
        lines: newLines,
        level: newLevel,
        gameOver: true,
        isTopScore: isTopScore("gravity", newScore),
        flashingRows: fullLines,
        levelUpFlash: false,
      };
    });
  }, []);

  // -------------------------------------------------------
  // hold
  // -------------------------------------------------------
  const hold = useCallback(() => {
    setState((prev) => {
      if (
        !prev.piece ||
        !prev.canHold ||
        prev.gameOver ||
        prev.paused ||
        prev.waiting
      )
        return prev;
      const currentPiece = prev.piece;
      const incoming = prev.heldPiece
        ? {
            ...prev.heldPiece,
            x: spawnX(prev.heldPiece.shape),
            y: spawnY(prev.heldPiece.shape, prev.gravity),
          }
        : {
            ...prev.nextPiece,
            x: spawnX(prev.nextPiece.shape),
            y: spawnY(prev.nextPiece.shape, prev.gravity),
          };
      const newNextPiece = prev.heldPiece
        ? prev.nextPiece
        : createPiece(prev.gravity);
      if (isColliding(prev.board, incoming)) return prev;
      return {
        ...prev,
        piece: incoming,
        heldPiece: { ...currentPiece, x: 0, y: 0 },
        nextPiece: prev.heldPiece ? prev.nextPiece : newNextPiece,
        canHold: false,
      };
    });
  }, []);
  holdRef.current = hold;

  // -------------------------------------------------------
  // flipGravity
  // -------------------------------------------------------
  const flipGravity = useCallback(() => {
    if (gameOverRef.current || isFlippingRef.current) return;

    setSoftDrop(false);
    soundFlip();
    isFlippingRef.current = true;
    const myGen = ++flipGenRef.current;

    setState((prev) => ({
      ...prev,
      isFlipping: true,
      flipCountdown: FLIP_INTERVAL_MS / 1000,
      flipDirection: prev.gravity === "down" ? "toUp" : "toDown",
      piece: null,
    }));

    // 中間点: ボード状態を反転
    setTimeout(() => {
      if (flipGenRef.current !== myGen) return;
      if (gameOverRef.current) {
        isFlippingRef.current = false;
        setState((prev) => ({ ...prev, isFlipping: false }));
        return;
      }
      setState((prev) => {
        if (prev.gameOver) return { ...prev, isFlipping: false };
        const newGravity: Gravity = prev.gravity === "down" ? "up" : "down";
        const compacted = compactBoard(prev.board, newGravity);
        return { ...prev, board: compacted, gravity: newGravity };
      });
    }, FLIP_MID_MS);

    // アニメーション終了: 新重力でスポーン
    setTimeout(() => {
      if (flipGenRef.current !== myGen) return;
      isFlippingRef.current = false;
      setState((prev) => {
        if (prev.gameOver) return { ...prev, isFlipping: false };
        // スポーン前に天井チェック
        if (isCeilingReached(prev.board, prev.gravity)) {
          gameOverRef.current = true;
          return { ...prev, piece: null, isFlipping: false, gameOver: true };
        }
        const spawnPiece = prev.nextPiece;
        const newNextPiece = createPiece(prev.gravity);
        if (!isColliding(prev.board, spawnPiece)) {
          return {
            ...prev,
            piece: spawnPiece,
            nextPiece: newNextPiece,
            isFlipping: false,
          };
        }
        gameOverRef.current = true;
        return { ...prev, piece: null, isFlipping: false, gameOver: true };
      });
    }, FLIP_ANIM_MS);
  }, []);

  // -------------------------------------------------------
  // Effects
  // -------------------------------------------------------
  useEffect(() => {
    if (state.gameOver || state.isFlipping || state.paused || state.waiting)
      return;
    const id = setInterval(
      dropTick,
      softDrop ? SOFT_MS : dropInterval(state.level),
    );
    return () => clearInterval(id);
  }, [
    state.gameOver,
    state.isFlipping,
    state.paused,
    state.waiting,
    softDrop,
    state.level,
    dropTick,
  ]);

  // カウントダウンが 0 になったら flip（単一インターバルで同期）
  useEffect(() => {
    if (state.gameOver || state.paused || state.waiting) return;
    const id = setInterval(() => {
      setState((prev) => {
        if (prev.gameOver || prev.isFlipping || prev.paused || prev.waiting)
          return prev;
        return { ...prev, flipCountdown: Math.max(0, prev.flipCountdown - 1) };
      });
    }, 1000);
    return () => clearInterval(id);
  }, [state.gameOver, state.paused, state.waiting]);

  useEffect(() => {
    if (
      state.flipCountdown === 0 &&
      !state.isFlipping &&
      !state.gameOver &&
      !state.paused &&
      !state.waiting
    ) {
      flipGravity();
    }
  }, [
    state.flipCountdown,
    state.isFlipping,
    state.gameOver,
    state.paused,
    state.waiting,
    flipGravity,
  ]);

  // フラッシュを 180ms 後にクリア
  useEffect(() => {
    if (state.flashingRows.length === 0 && !state.levelUpFlash) return;
    const id = setTimeout(() => {
      setState((prev) => ({ ...prev, flashingRows: [], levelUpFlash: false }));
    }, 180);
    return () => clearTimeout(id);
  }, [state.flashingRows, state.levelUpFlash]);

  // -------------------------------------------------------
  // キー操作
  // -------------------------------------------------------
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // P toggles pause at any time (except game over)
      if (e.key === "p" || e.key === "P") {
        if (!gameOverRef.current) {
          pausedRef.current = !pausedRef.current;
          setState((prev) => ({ ...prev, paused: !prev.paused }));
        }
        return;
      }
      if (waitingRef.current) {
        waitingRef.current = false;
        setState((prev) => ({ ...prev, waiting: false }));
        return;
      }
      if (gameOverRef.current || isFlippingRef.current || pausedRef.current)
        return;
      if (
        [
          " ",
          "ArrowUp",
          "ArrowDown",
          "ArrowLeft",
          "ArrowRight",
          "Shift",
        ].includes(e.key)
      ) {
        e.preventDefault();
      }

      if (e.key === "ArrowDown") {
        setSoftDrop(true);
        return;
      }

      if (e.key === "Shift") {
        holdRef.current();
        return;
      }

      setState((prev) => {
        if (!prev.piece || prev.gameOver || prev.isFlipping) return prev;
        switch (e.key) {
          case " ": {
            const r = { ...prev.piece, shape: rotateCW(prev.piece.shape) };
            if (isColliding(prev.board, r)) return prev;
            soundRotate();
            return { ...prev, piece: r };
          }
          case "ArrowUp": {
            const dy = prev.gravity === "down" ? 1 : -1;
            let dropped = { ...prev.piece };
            while (
              !isColliding(prev.board, { ...dropped, y: dropped.y + dy })
            ) {
              dropped = { ...dropped, y: dropped.y + dy };
            }
            soundLand();
            const merged = mergePieceToBoard(prev.board, dropped, "block");
            const fullLines = getFullLines(merged);
            const cleared = fullLines.length
              ? clearLinesGravity(merged, fullLines, prev.gravity)
              : merged;
            const newScore = prev.score + (SCORE_TABLE[fullLines.length] ?? 0);
            const newLines = prev.lines + fullLines.length;
            const newLevel = Math.floor(newLines / 10) + 1;
            if (fullLines.length === 4) soundTetris();
            else if (fullLines.length > 1) soundClearMulti(fullLines.length);
            else if (fullLines.length === 1) soundClear1();
            const nextPiece = prev.nextPiece;
            const newNextPiece = createPiece(prev.gravity);
            if (!isColliding(cleared, nextPiece)) {
              return {
                ...prev,
                board: cleared,
                piece: nextPiece,
                nextPiece: newNextPiece,
                score: newScore,
                lines: newLines,
                level: newLevel,
                canHold: true,
              };
            }
            soundGameOver();
            gameOverRef.current = true;
            return {
              ...prev,
              board: cleared,
              piece: null,
              score: newScore,
              lines: newLines,
              level: newLevel,
              gameOver: true,
              isTopScore: isTopScore("gravity", newScore),
            };
          }
        }
        return prev;
      });
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") setSoftDrop(false);
    };

    const onBlur = () => setSoftDrop(false);

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  }, []);

  // Keep pausedRef in sync
  useEffect(() => {
    pausedRef.current = state.paused;
  }, [state.paused]);

  // Keep waitingRef in sync
  useEffect(() => {
    waitingRef.current = state.waiting;
  }, [state.waiting]);

  // -------------------------------------------------------
  // リスタート
  // -------------------------------------------------------
  const start = useCallback(() => {
    flipGenRef.current++;
    gameOverRef.current = false;
    isFlippingRef.current = false;
    pausedRef.current = false;
    waitingRef.current = true;
    setSoftDrop(false);
    const gravity: Gravity = "down";
    setState({
      board: createEmptyBoard(),
      piece: createPiece(gravity),
      nextPiece: createPiece(gravity),
      score: 0,
      gameOver: false,
      gravity,
      flipCountdown: FLIP_INTERVAL_MS / 1000,
      lines: 0,
      level: 1,
      isFlipping: false,
      flipDirection: "toUp",
      isTopScore: false,
      paused: false,
      flashingRows: [],
      levelUpFlash: false,
      waiting: true,
      heldPiece: null,
      canHold: true,
    });
  }, []);

  const togglePause = useCallback(() => {
    if (gameOverRef.current) return;
    pausedRef.current = !pausedRef.current;
    setState((prev) => ({ ...prev, paused: !prev.paused }));
  }, []);

  // -------------------------------------------------------
  // タッチ操作用アクション
  // -------------------------------------------------------
  const moveLeft = useCallback(() => {
    if (gameOverRef.current || isFlippingRef.current) return;
    setState((prev) => {
      if (!prev.piece || prev.gameOver || prev.isFlipping) return prev;
      const m = { ...prev.piece, x: prev.piece.x - 1 };
      return isColliding(prev.board, m) ? prev : { ...prev, piece: m };
    });
  }, []);

  const moveRight = useCallback(() => {
    if (gameOverRef.current || isFlippingRef.current) return;
    setState((prev) => {
      if (!prev.piece || prev.gameOver || prev.isFlipping) return prev;
      const m = { ...prev.piece, x: prev.piece.x + 1 };
      return isColliding(prev.board, m) ? prev : { ...prev, piece: m };
    });
  }, []);

  const rotate = useCallback(() => {
    if (gameOverRef.current || isFlippingRef.current) return;
    setState((prev) => {
      if (!prev.piece || prev.gameOver || prev.isFlipping) return prev;
      const r = { ...prev.piece, shape: rotateCW(prev.piece.shape) };
      return isColliding(prev.board, r) ? prev : { ...prev, piece: r };
    });
  }, []);

  const hardDrop = useCallback(() => {
    if (gameOverRef.current || isFlippingRef.current) return;
    setState((prev) => {
      if (!prev.piece || prev.gameOver || prev.isFlipping) return prev;
      const dy = prev.gravity === "down" ? 1 : -1;
      let dropped = { ...prev.piece };
      while (!isColliding(prev.board, { ...dropped, y: dropped.y + dy })) {
        dropped = { ...dropped, y: dropped.y + dy };
      }
      soundLand();
      const merged = mergePieceToBoard(prev.board, dropped, "block");
      const fullLines = getFullLines(merged);
      const cleared = fullLines.length
        ? clearLinesGravity(merged, fullLines, prev.gravity)
        : merged;
      const newScore = prev.score + (SCORE_TABLE[fullLines.length] ?? 0);
      const newLines = prev.lines + fullLines.length;
      const newLevel = Math.floor(newLines / 10) + 1;
      const leveledUp = newLevel > prev.level;
      if (fullLines.length === 4) soundTetris();
      else if (fullLines.length > 1) soundClearMulti(fullLines.length);
      else if (fullLines.length === 1) soundClear1();
      if (leveledUp) setTimeout(soundLevelUp, 100);
      const nextPiece = prev.nextPiece;
      const newNextPiece = createPiece(prev.gravity);
      if (!isColliding(cleared, nextPiece)) {
        return {
          ...prev,
          board: cleared,
          piece: nextPiece,
          nextPiece: newNextPiece,
          score: newScore,
          lines: newLines,
          level: newLevel,
          flashingRows: fullLines,
          levelUpFlash: leveledUp,
          canHold: true,
        };
      }
      soundGameOver();
      gameOverRef.current = true;
      return {
        ...prev,
        board: cleared,
        piece: null,
        score: newScore,
        lines: newLines,
        level: newLevel,
        gameOver: true,
        isTopScore: isTopScore("gravity", newScore),
        flashingRows: fullLines,
        levelUpFlash: false,
      };
    });
  }, []);

  const softDropStart = useCallback(() => setSoftDrop(true), []);
  const softDropEnd = useCallback(() => setSoftDrop(false), []);

  // ゴーストピース計算（重力方向対応）
  function getGhostPiece(board: Board, piece: Piece, gravity: Gravity): Piece {
    const dy = gravity === "down" ? 1 : -1;
    let ghost = { ...piece };
    while (!isColliding(board, { ...ghost, y: ghost.y + dy })) {
      ghost = { ...ghost, y: ghost.y + dy };
    }
    return ghost;
  }

  const ghostPiece =
    state.piece && !state.isFlipping
      ? getGhostPiece(state.board, state.piece, state.gravity)
      : null;

  return {
    state,
    ghostPiece,
    start,
    moveLeft,
    moveRight,
    rotate,
    hardDrop,
    softDropStart,
    softDropEnd,
    togglePause,
    hold,
  };
}
