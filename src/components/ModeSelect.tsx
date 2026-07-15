import { compositionSummary, modeDisplayName, rosterSize } from '../lib/balance'
import type { GameMode } from '../types'

interface ModeSelectProps {
  gameMode: GameMode
  onChange: (mode: GameMode) => void
}

export function ModeSelect({ gameMode, onChange }: ModeSelectProps) {
  return (
    <section className="section-panel animate-rise p-4 clip-angle sm:p-6">
      <p className="mb-3 text-xs font-medium tracking-wide text-ow-mist">모드 선택</p>
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
        {(
          [
            { id: '5v5' as const, detail: '탱커 1 · 딜러 2 · 힐러 2' },
            { id: '6v6' as const, detail: '탱커 2 · 딜러 2 · 힐러 2' },
          ] as const
        ).map((opt) => {
          const on = gameMode === opt.id
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onChange(opt.id)}
              className={`mode-btn px-3 py-4 text-left sm:px-5 sm:py-5 ${
                on ? 'mode-btn-active' : 'text-ow-cream'
              }`}
            >
              <span className="block font-display text-xl font-bold tracking-tight sm:text-2xl">
                {modeDisplayName(opt.id)}
              </span>
              <span
                className={`mt-1.5 block text-xs sm:text-sm ${
                  on ? 'text-white/85' : 'text-ow-mist'
                }`}
              >
                {opt.detail}
              </span>
              <span
                className={`mt-0.5 block text-[11px] ${
                  on ? 'text-white/70' : 'text-ow-mist/80'
                }`}
              >
                팀당 {rosterSize(opt.id)}인
              </span>
            </button>
          )
        })}
      </div>
      <p className="mt-3.5 text-xs text-ow-mist">
        현재: {modeDisplayName(gameMode)} · {compositionSummary(gameMode)}
      </p>
    </section>
  )
}
