import type { Preferences } from './preferences'

interface Props {
  preferences: Preferences
  onClose: () => void
  onToggle: <K extends keyof Preferences>(key: K, value: Preferences[K]) => void
}

interface ToggleRowProps {
  title: string
  description: string
  checked: boolean
  onChange: (next: boolean) => void
}

function ToggleRow({ title, description, checked, onChange }: ToggleRowProps) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 rounded-2xl border border-white/8 bg-white/5 p-4">
      <div>
        <div className="text-sm font-semibold text-white">{title}</div>
        <div className="mt-1 text-xs leading-relaxed text-white/60">{description}</div>
      </div>
      <div className="relative mt-0.5">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only"
        />
        <div
          className={`h-7 w-12 rounded-full transition-colors ${checked ? 'bg-cyan-400/90' : 'bg-white/15'}`}
        >
          <div
            className={`mt-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
              checked ? 'translate-x-5' : 'translate-x-0.5'
            }`}
          />
        </div>
      </div>
    </label>
  )
}

export default function SettingsModal({ preferences, onClose, onToggle }: Props) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 px-4 py-6 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-[28px] border border-white/10 bg-slate-950/95 p-5 text-white shadow-2xl sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.28em] text-cyan-300">
              Settings
            </div>
            <h2 className="mt-2 text-2xl font-black">プレイ設定</h2>
            <p className="mt-2 text-sm leading-relaxed text-white/65">
              音、チュートリアル、タッチ操作の向きを調整できます。
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          >
            ×
          </button>
        </div>

        <div className="mt-5 space-y-3">
          <ToggleRow
            title="BGM"
            description="ゲーム中のバックグラウンドミュージックを再生します。"
            checked={preferences.musicEnabled}
            onChange={(next) => onToggle('musicEnabled', next)}
          />
          <ToggleRow
            title="効果音"
            description="移動、回転、ライン消去などのサウンドを再生します。"
            checked={preferences.sfxEnabled}
            onChange={(next) => onToggle('sfxEnabled', next)}
          />
          <ToggleRow
            title="初回チュートリアル"
            description="各モード初回プレイ時に簡単なルール説明を表示します。"
            checked={preferences.showTutorials}
            onChange={(next) => onToggle('showTutorials', next)}
          />
          <ToggleRow
            title="左利き向けタッチ配置"
            description="スマホ・タブレットで操作パッドの左右配置を反転します。"
            checked={preferences.leftHandedControls}
            onChange={(next) => onToggle('leftHandedControls', next)}
          />
        </div>

        <div className="mt-5 text-xs leading-relaxed text-white/45">
          左利き向け配置は次にゲーム画面を開いたときから反映されます。
        </div>
      </div>
    </div>
  )
}
