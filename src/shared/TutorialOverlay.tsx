interface Props {
  accentClassName: string
  title: string
  subtitle: string
  bullets: string[]
  controls: string[]
  actionLabel: string
  onAction: () => void
  onClose: () => void
}

export default function TutorialOverlay({
  accentClassName,
  title,
  subtitle,
  bullets,
  controls,
  actionLabel,
  onAction,
  onClose,
}: Props) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 px-4 py-6 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-[28px] border border-white/10 bg-slate-950/95 p-5 text-white shadow-2xl sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className={`text-xs font-black uppercase tracking-[0.28em] ${accentClassName}`}>
              Quick Guide
            </div>
            <h2 className="mt-2 text-2xl font-black">{title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-white/70">{subtitle}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          >
            ×
          </button>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
            <div className="text-xs font-bold uppercase tracking-[0.18em] text-white/50">Rules</div>
            <div className="mt-3 space-y-2 text-sm text-white/80">
              {bullets.map((bullet) => (
                <div key={bullet}>{bullet}</div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
            <div className="text-xs font-bold uppercase tracking-[0.18em] text-white/50">Controls</div>
            <div className="mt-3 space-y-2 text-sm text-white/80">
              {controls.map((control) => (
                <div key={control}>{control}</div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            onClick={onAction}
            className={`rounded-2xl px-4 py-2 text-sm font-bold text-slate-950 transition-transform hover:-translate-y-0.5 ${accentClassName === 'text-cyan-300' ? 'bg-cyan-300' : accentClassName === 'text-indigo-300' ? 'bg-indigo-300' : accentClassName === 'text-orange-300' ? 'bg-orange-300' : accentClassName === 'text-emerald-300' ? 'bg-emerald-300' : 'bg-purple-300'}`}
          >
            {actionLabel}
          </button>
          <button
            onClick={onClose}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  )
}
