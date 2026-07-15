import { compositionSummary, modeDisplayName, rosterSize } from '../lib/balance'
import type { GameMode } from '../types'

interface ModeSelectProps {
  gameMode: GameMode
  onChange: (mode: GameMode) => void
}

export function ModeSelect({ gameMode, onChange }: ModeSelectProps) {
  return (
    <section className="section-panel animate-rise p-4 clip-angle sm:p-5">
      <p className="mb-3 text-xs font-medium tracking-wide text-ow-mist/70">
        모드 선택
      </p>
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        {([
          { id: '5v5' as const, detail: '탱커 1 · 딜러 2 · 힐러 2' },
          { id: '6v6' as const, detail: '탱커 2 · 딜러 2 · 힐러 2' },
        ]).map((opt) => {
          const on = gameMode === opt.id
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onChange(opt.id)}
              className={`clip-btn px-3 py-3.5 text-left transition sm:px-4 sm:py-4 ${
                on
                  ? 'bg-ow-orange text-ow-slate'
                  : 'border border-white/15 bg-ow-slate/50 text-ow-mist hover:border-ow-orange/50'
              }`}
            >
              <span className="block font-display text-xl font-bold tracking-wide sm:text-2xl">
                {modeDisplayName(opt.id)}
              </span>
              <span
                className={`mt-1 block text-xs sm:text-sm ${
                  on ? 'opacity-80' : 'text-ow-mist/50'
                }`}
              >
                {opt.detail}
              </span>
              <span
                className={`mt-0.5 block text-[11px] ${
                  on ? 'opacity-70' : 'text-ow-mist/35'
                }`}
              >
                팀당 {rosterSize(opt.id)}인
              </span>
            </button>
          )
        })}
      </div>
      <p className="mt-3 text-xs text-ow-mist/45">
        현재: {modeDisplayName(gameMode)} · {compositionSummary(gameMode)}
      </p>
    </section>
  )
}
