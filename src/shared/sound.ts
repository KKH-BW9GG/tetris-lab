/**
 * Web Audio API を使ったサウンドエフェクト
 * 外部ファイル不要、オシレーターベースで生成
 */

let ctx: AudioContext | null = null

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext()
  // モバイルで suspend されていたら resume
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

function playTone(
  frequency: number,
  duration: number,
  type: OscillatorType = 'square',
  gainValue = 0.15,
  delay = 0,
) {
  try {
    const ac = getCtx()
    const osc = ac.createOscillator()
    const gain = ac.createGain()

    osc.connect(gain)
    gain.connect(ac.destination)

    osc.type = type
    osc.frequency.setValueAtTime(frequency, ac.currentTime + delay)

    gain.gain.setValueAtTime(0, ac.currentTime + delay)
    gain.gain.linearRampToValueAtTime(gainValue, ac.currentTime + delay + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + delay + duration)

    osc.start(ac.currentTime + delay)
    osc.stop(ac.currentTime + delay + duration + 0.05)
  } catch {
    // サウンド失敗は無視
  }
}

/**
 * ローパスフィルター付きノイズバースト — インパクト感に使う
 */
function noiseBurst(duration: number, gainValue: number, cutoff = 200, delay = 0) {
  try {
    const ac = getCtx()
    const bufferSize = Math.ceil(ac.sampleRate * duration)
    const buffer = ac.createBuffer(1, bufferSize, ac.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1
    const source = ac.createBufferSource()
    source.buffer = buffer
    const filter = ac.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = cutoff
    const gain = ac.createGain()
    gain.gain.setValueAtTime(gainValue, ac.currentTime + delay)
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + delay + duration)
    source.connect(filter)
    filter.connect(gain)
    gain.connect(ac.destination)
    source.start(ac.currentTime + delay)
  } catch {
    // サウンド失敗は無視
  }
}

/**
 * ピッチベンド付きトーン — 音を鳴らしながら周波数を変化させる
 */
function playBend(
  freqStart: number,
  freqEnd: number,
  duration: number,
  type: OscillatorType = 'square',
  gainValue = 0.12,
  delay = 0,
) {
  try {
    const ac = getCtx()
    const osc = ac.createOscillator()
    const gain = ac.createGain()
    osc.connect(gain)
    gain.connect(ac.destination)
    osc.type = type
    osc.frequency.setValueAtTime(freqStart, ac.currentTime + delay)
    osc.frequency.exponentialRampToValueAtTime(freqEnd, ac.currentTime + delay + duration)
    gain.gain.setValueAtTime(0, ac.currentTime + delay)
    gain.gain.linearRampToValueAtTime(gainValue, ac.currentTime + delay + 0.008)
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + delay + duration)
    osc.start(ac.currentTime + delay)
    osc.stop(ac.currentTime + delay + duration + 0.05)
  } catch {
    // サウンド失敗は無視
  }
}

/** ピース移動 */
export function soundMove() {
  // 少し高めにして軽快感を出す
  playTone(250, 0.05, 'square', 0.07)
}

/** ピース回転 */
export function soundRotate() {
  // ピッチを上方向にベンドしてスナッピーな回転感を演出
  playBend(300, 420, 0.07, 'square', 0.1)
}

/** ピース着地 */
export function soundLand() {
  // 低音トーン + ノイズバーストで「ドスン」感
  playTone(110, 0.12, 'square', 0.12)
  playTone(75, 0.18, 'square', 0.08, 0.03)
  noiseBurst(0.08, 0.15, 180, 0.0)
}

/** 1ライン消去 */
export function soundClear1() {
  // 3音アルペジオで上昇する満足感のある消去音
  playTone(440, 0.10, 'square', 0.14)
  playTone(554, 0.10, 'square', 0.13, 0.07)
  playTone(659, 0.14, 'square', 0.15, 0.14)
}

/** 複数ライン or カラーマッチ消去 */
export function soundClearMulti(count: number) {
  // 2ライン: 明るいアルペジオ
  // 3ライン: さらに速く高く
  // 4ライン(Tetris): soundTetris() 相当の派手な和音も鳴る
  const base = 330
  const steps = Math.min(count + 1, 5)
  const stepDelay = count >= 3 ? 0.055 : 0.07
  for (let i = 0; i < steps; i++) {
    playTone(base * Math.pow(1.25, i), 0.12, 'square', 0.15, i * stepDelay)
  }
  // 3ライン以上: 倍音を重ねて華やかに
  if (count >= 3) {
    for (let i = 0; i < steps; i++) {
      playTone(base * Math.pow(1.25, i) * 2, 0.1, 'triangle', 0.06, i * stepDelay + 0.01)
    }
  }
}

/** テトリス（4ライン）*/
export function soundTetris() {
  // 上昇アルペジオ + 最後に和音でトライアンフ感
  const notes = [523, 659, 784, 1047]
  notes.forEach((freq, i) => playTone(freq, 0.15, 'square', 0.18, i * 0.08))
  // 頂点でルートと5度の和音を重ねる
  playTone(1047, 0.25, 'triangle', 0.12, notes.length * 0.08)
  playTone(784, 0.25, 'triangle', 0.10, notes.length * 0.08)
  playTone(523, 0.25, 'triangle', 0.08, notes.length * 0.08)
}

/** 重力反転 */
export function soundFlip() {
  // 低→高 ピッチベンドで「引っ張られる」感
  const notes = [165, 220, 330, 440, 660]
  notes.forEach((freq, i) => playBend(freq, freq * 1.05, 0.1, 'sawtooth', 0.11, i * 0.055))
}

/** ゲームオーバー */
export function soundGameOver() {
  const notes = [440, 370, 330, 220, 165]
  notes.forEach((freq, i) => playTone(freq, 0.2, 'sawtooth', 0.18, i * 0.15))
}

/** ハイスコア（ランクイン） */
export function soundHighScore() {
  const notes = [523, 659, 784, 1047, 1319]
  notes.forEach((freq, i) => playTone(freq, 0.15, 'triangle', 0.2, i * 0.1))
}

/** スプリント完了 — 上昇アルペジオ→フルコード */
export function soundSprintComplete() {
  // 上昇アルペジオ (C4→G5)
  const arpNotes = [261, 330, 392, 523, 659, 784]
  arpNotes.forEach((freq, i) =>
    playTone(freq, 0.15, 'square', 0.16, i * 0.07)
  )
  // 最後に C-E-G の和音でフィニッシュ
  const finishDelay = arpNotes.length * 0.07 + 0.05
  playTone(523, 0.4, 'triangle', 0.18, finishDelay)
  playTone(659, 0.4, 'triangle', 0.14, finishDelay)
  playTone(784, 0.4, 'triangle', 0.12, finishDelay)
  // さらに1オクターブ上でキラキラ感
  playTone(1047, 0.3, 'sine', 0.08, finishDelay + 0.05)
}

/** チェーン（連鎖） */
export function soundChain(chain: number) {
  const freq = 330 * Math.pow(1.3, Math.min(chain, 5))
  playTone(freq, 0.15, 'square', 0.18)
}

/** レベルアップ */
export function soundLevelUp() {
  [523, 659, 784, 1047].forEach((freq, i) =>
    playTone(freq, 0.12, 'triangle', 0.2, i * 0.06)
  )
}

/** スライム着地（ぬるっとした音） */
export function soundSlimeLand() {
  // ゆっくりピッチが落ちるベンドでぬるっと感を演出
  playBend(160, 110, 0.25, 'sine', 0.12)
  playBend(130, 90, 0.30, 'sine', 0.08, 0.08)
}

// ---------------------------------------------------------------------------
// BGM (Background Music)
// ---------------------------------------------------------------------------

type BgmId = 'default' | 'sprint' | 'gravity' | 'colorMatch'

/** BGM用のノードをまとめて管理 */
interface BgmState {
  gainNode: GainNode
  oscillators: OscillatorNode[]
  lfos: OscillatorNode[]
  timeouts: ReturnType<typeof setTimeout>[]
  stopped: boolean
}

let bgmState: BgmState | null = null

// -- Music patterns (frequencies in Hz, durations in beats) ----------------

/** ノート名 → 周波数 変換用テーブル */
const NOTE: Record<string, number> = {
  C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196.0,
  A3: 220.0,  B3: 246.94,
  C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.0,
  A4: 440.0,  B4: 493.88,
  C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99,
  A5: 880.0,  B5: 987.77,
  C6: 1046.5,
  Bb3: 233.08, Eb4: 311.13, Ab4: 415.30, Bb4: 466.16,
  Eb5: 622.25, Ab5: 830.61, Bb5: 932.33,
  // gravity / colorMatch BGM 用 追加音
  Db4: 277.18, Db5: 554.37, Bb2: 116.54,
  Fs4: 369.99, Cs5: 554.37, Fs5: 739.99,
}

type BgmPattern = {
  bpm: number
  /** melody: [noteKey | null, beatDuration][] */
  melody: ([string, number] | [null, number])[]
  /** bass: [noteKey | null, beatDuration][] */
  bass: ([string, number] | [null, number])[]
}

const BGM_PATTERNS: Record<BgmId, BgmPattern> = {
  default: {
    bpm: 144,
    melody: [
      ['E5', 0.5], ['E5', 0.5], ['E5', 1],
      ['C5', 0.5], ['E5', 0.5], ['G5', 1], [null, 1],
      ['G4', 1], [null, 1], [null, 2],
      ['C5', 1.5], ['G4', 0.5], [null, 1], ['E4', 1],
      ['A4', 1], ['B4', 1], ['Bb4', 0.5], ['A4', 0.5],
      ['G4', 0.67], ['E5', 0.67], ['G5', 0.67], ['A5', 1],
      ['F5', 0.5], ['G5', 0.5], [null, 0.5], ['E5', 0.5], ['C5', 0.5], ['D5', 0.5], ['B4', 1],
    ],
    bass: [
      ['C3', 0.5], [null, 0.5], ['G3', 0.5], [null, 0.5], ['C3', 0.5], [null, 0.5], ['G3', 0.5], [null, 0.5],
      ['C3', 0.5], [null, 0.5], ['G3', 0.5], [null, 0.5], ['E3', 0.5], [null, 0.5], ['G3', 0.5], [null, 0.5],
      ['F3', 0.5], [null, 0.5], ['A3', 0.5], [null, 0.5], ['F3', 0.5], [null, 0.5], ['A3', 0.5], [null, 0.5],
      ['G3', 0.5], [null, 0.5], ['D3', 0.5], [null, 0.5], ['G3', 0.5], [null, 0.5], ['D3', 0.5], [null, 0.5],
    ],
  },
  sprint: {
    bpm: 200,
    melody: [
      ['C5', 0.5], ['E5', 0.5], ['G5', 0.5], ['E5', 0.5],
      ['D5', 0.5], ['F5', 0.5], ['A5', 0.5], ['F5', 0.5],
      ['E5', 0.5], ['G5', 0.5], ['B5', 0.5], ['G5', 0.5],
      ['C5', 0.5], ['E5', 0.5], ['G5', 1], [null, 0.5],
      ['G5', 0.25], ['A5', 0.25], ['G5', 0.25], ['F5', 0.25], ['E5', 0.5], ['D5', 0.5],
      ['C5', 0.5], ['B4', 0.5], ['A4', 0.5], ['G4', 0.5],
      ['F4', 0.5], ['G4', 0.5], ['A4', 0.5], ['C5', 0.5],
      ['G4', 0.5], [null, 0.5], ['G4', 0.5], [null, 0.5],
    ],
    bass: [
      ['C3', 0.5], ['G3', 0.5], ['C3', 0.5], ['G3', 0.5],
      ['D3', 0.5], ['A3', 0.5], ['D3', 0.5], ['A3', 0.5],
      ['E3', 0.5], ['B3', 0.5], ['E3', 0.5], ['B3', 0.5],
      ['F3', 0.5], ['C4', 0.5], ['G3', 0.5], ['D4', 0.5],
      ['C3', 0.5], ['G3', 0.5], ['C3', 0.5], ['G3', 0.5],
      ['A3', 0.5], ['E3', 0.5], ['A3', 0.5], ['E3', 0.5],
      ['F3', 0.5], ['C3', 0.5], ['F3', 0.5], ['C3', 0.5],
      ['G3', 0.5], ['D3', 0.5], ['G3', 0.5], ['D3', 0.5],
    ],
  },
  // 緊迫感を増したgravity BGM: 速めのテンポ + 半音階下降 + 短調
  gravity: {
    bpm: 148,
    melody: [
      // フレーズA: 強烈な半音下降
      ['A4', 0.5], ['Ab4', 0.5], ['G4', 0.5], ['Fs4', 0.5],
      ['F4', 0.5], ['E4', 0.5], ['Eb4', 0.5], ['D4', 0.5],
      // フレーズB: 上昇してから落下
      ['A4', 0.5], [null, 0.5], ['C5', 0.5], [null, 0.5], ['Eb5', 0.5], [null, 0.5], ['D5', 0.5], [null, 0.5],
      // フレーズC: 不安定なリズム
      ['C5', 0.25], ['Bb4', 0.25], ['Ab4', 0.5], ['G4', 0.25], ['F4', 0.25], ['Eb4', 0.5],
      ['D4', 0.25], ['Eb4', 0.25], ['F4', 0.5], ['G4', 0.5],
      // フレーズD: 緊張の頂点
      ['Ab4', 0.5], ['G4', 0.5], ['F4', 0.5], ['Eb4', 0.5],
      ['D4', 0.5], ['Eb4', 0.5], ['F4', 0.5], ['G4', 0.5],
    ],
    bass: [
      // 刻みビート: 短い音符で緊張感
      ['A3', 0.5], [null, 0.25], ['A3', 0.25], ['E3', 0.5], [null, 0.25], ['E3', 0.25],
      ['A3', 0.5], [null, 0.25], ['A3', 0.25], ['E3', 0.5], [null, 0.25], ['E3', 0.25],
      ['D3', 0.5], [null, 0.25], ['D3', 0.25], ['A3', 0.5], [null, 0.25], ['A3', 0.25],
      ['E3', 0.5], [null, 0.25], ['E3', 0.25], ['G3', 0.5], [null, 0.25], ['G3', 0.25],
      ['Ab3', 0.5], [null, 0.25], ['Ab3', 0.25], ['Eb3', 0.5], [null, 0.25], ['Eb3', 0.25],
      ['G3', 0.5], [null, 0.25], ['G3', 0.25], ['D3', 0.5], [null, 0.25], ['D3', 0.25],
      ['F3', 0.5], [null, 0.25], ['F3', 0.25], ['C3', 0.5], [null, 0.25], ['C3', 0.25],
      ['G3', 0.5], [null, 0.25], ['G3', 0.25], ['D3', 0.5], [null, 0.25], ['D3', 0.25],
    ],
  },
  // colorMatch 専用BGM: 明るくポップなジャズ/ファンク調
  colorMatch: {
    bpm: 132,
    melody: [
      // 弾むシャッフル感
      ['C5', 0.5], [null, 0.25], ['E5', 0.25], ['G5', 0.5], [null, 0.5],
      ['A5', 0.5], ['G5', 0.5], ['E5', 0.5], [null, 0.5],
      ['F5', 0.5], [null, 0.25], ['A5', 0.25], ['C6', 0.5], [null, 0.5],
      ['B4', 0.5], ['A5', 0.5], ['G5', 0.5], [null, 0.5],
      // ブリッジ: 色とりどりな感じ
      ['D5', 0.5], ['Fs4', 0.5], ['A4', 0.5], ['Cs5', 0.5],
      ['E5', 0.5], ['Fs5', 0.5], ['G5', 0.5], [null, 0.5],
      ['C5', 0.5], ['E5', 0.5], ['G5', 0.5], ['B4', 0.5],
      ['A4', 0.5], [null, 0.5], ['G4', 0.5], [null, 0.5],
    ],
    bass: [
      ['C3', 0.5], ['G3', 0.5], ['E3', 0.5], ['G3', 0.5],
      ['A3', 0.5], ['E3', 0.5], ['A3', 0.5], ['E3', 0.5],
      ['F3', 0.5], ['C3', 0.5], ['F3', 0.5], ['A3', 0.5],
      ['G3', 0.5], ['D3', 0.5], ['G3', 0.5], ['D3', 0.5],
      ['D3', 0.5], ['A3', 0.5], ['D3', 0.5], ['Fs4', 0.5],
      ['E3', 0.5], ['B3', 0.5], ['E3', 0.5], ['G3', 0.5],
      ['C3', 0.5], ['G3', 0.5], ['C3', 0.5], ['E3', 0.5],
      ['A3', 0.5], ['E3', 0.5], ['A3', 0.5], ['E3', 0.5],
    ],
  },
}

/**
 * 音符シーケンスを Web Audio API で再生する
 * 各音符は scheduledTime にスケジュールされ、パターン全体のループを setTimeout で管理する
 */
function scheduleBgmSequence(
  state: BgmState,
  pattern: BgmPattern,
  startTime: number,
) {
  if (state.stopped) return

  const ac = getCtx()
  const beatDuration = 60 / pattern.bpm

  // --- melody ---
  let t = startTime
  let totalBeats = 0
  for (const [noteKey, beats] of pattern.melody) {
    if (noteKey !== null) {
      const freq = NOTE[noteKey]
      if (freq) {
        const osc = ac.createOscillator()
        const noteGain = ac.createGain()
        osc.connect(noteGain)
        noteGain.connect(state.gainNode)
        osc.type = 'square'
        osc.frequency.setValueAtTime(freq, t)
        const dur = beats * beatDuration * 0.85
        noteGain.gain.setValueAtTime(0, t)
        noteGain.gain.linearRampToValueAtTime(0.6, t + 0.01)
        noteGain.gain.exponentialRampToValueAtTime(0.001, t + dur)
        osc.start(t)
        osc.stop(t + dur + 0.02)
        state.oscillators.push(osc)
      }
    }
    t += beats * beatDuration
    totalBeats += beats
  }

  // --- bass ---
  let tb = startTime
  for (const [noteKey, beats] of pattern.bass) {
    if (noteKey !== null) {
      const freq = NOTE[noteKey]
      if (freq) {
        const osc = ac.createOscillator()
        const noteGain = ac.createGain()
        osc.connect(noteGain)
        noteGain.connect(state.gainNode)
        osc.type = 'triangle'
        osc.frequency.setValueAtTime(freq, tb)
        const dur = beats * beatDuration * 0.75
        noteGain.gain.setValueAtTime(0, tb)
        noteGain.gain.linearRampToValueAtTime(0.5, tb + 0.01)
        noteGain.gain.exponentialRampToValueAtTime(0.001, tb + dur)
        osc.start(tb)
        osc.stop(tb + dur + 0.02)
        state.oscillators.push(osc)
      }
    }
    tb += beats * beatDuration
  }

  // Calculate total duration of this pass (use whichever track is longer)
  let bassBeats = 0
  for (const [, beats] of pattern.bass) bassBeats += beats
  const loopBeats = Math.max(totalBeats, bassBeats)
  const loopDuration = loopBeats * beatDuration

  // Schedule the next loop just before this one ends
  const msUntilNextLoop = (loopDuration - 0.1) * 1000
  const nextStart = startTime + loopDuration
  const tid = setTimeout(() => {
    if (!state.stopped) {
      scheduleBgmSequence(state, pattern, nextStart)
    }
  }, Math.max(msUntilNextLoop, 0))
  state.timeouts.push(tid)
}

/** BGM を開始する。既に再生中の場合は停止してから開始する */
export function startBGM(gameId: string) {
  stopBGM()

  // colorMatch は専用パターンを使用、それ以外は従来マッピング
  let id: BgmId
  if (gameId === 'sprint') id = 'sprint'
  else if (gameId === 'gravity') id = 'gravity'
  else if (gameId === 'colorMatch') id = 'colorMatch'
  else id = 'default'

  const pattern = BGM_PATTERNS[id]

  try {
    const ac = getCtx()
    const gainNode = ac.createGain()
    gainNode.gain.setValueAtTime(0.08, ac.currentTime)
    gainNode.connect(ac.destination)

    // LFO for subtle vibrato on the gain (chiptune feel)
    const lfo = ac.createOscillator()
    const lfoGain = ac.createGain()
    lfo.type = 'sine'
    // gravity は速めのパルスで緊張感、colorMatch はゆったりした揺れ
    const lfoFreq = id === 'gravity' ? 5.5 : id === 'colorMatch' ? 3.5 : 5
    lfo.frequency.setValueAtTime(lfoFreq, ac.currentTime)
    lfoGain.gain.setValueAtTime(0.003, ac.currentTime)
    lfo.connect(lfoGain)
    lfoGain.connect(gainNode.gain)
    lfo.start()

    const state: BgmState = {
      gainNode,
      oscillators: [],
      lfos: [lfo],
      timeouts: [],
      stopped: false,
    }
    bgmState = state

    // Start sequence slightly in the future to allow AudioContext to warm up
    scheduleBgmSequence(state, pattern, ac.currentTime + 0.05)
  } catch {
    // サウンド失敗は無視
  }
}

/** BGM を停止する */
export function stopBGM() {
  if (!bgmState) return

  bgmState.stopped = true

  // Clear all pending loop timeouts
  for (const tid of bgmState.timeouts) clearTimeout(tid)

  // Stop all oscillators immediately
  const now = (() => {
    try { return getCtx().currentTime } catch { return 0 }
  })()

  for (const osc of bgmState.oscillators) {
    try { osc.stop(now) } catch { /* already stopped */ }
  }
  for (const lfo of bgmState.lfos) {
    try { lfo.stop(now) } catch { /* already stopped */ }
  }

  // Fade out gain node
  try {
    bgmState.gainNode.gain.cancelScheduledValues(now)
    bgmState.gainNode.gain.setValueAtTime(bgmState.gainNode.gain.value, now)
    bgmState.gainNode.gain.linearRampToValueAtTime(0, now + 0.1)
  } catch { /* ignore */ }

  bgmState = null
}
