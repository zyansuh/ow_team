import { Minus, Plus, RefreshCw, Shuffle, Trophy } from 'lucide-react'
import {
  compositionSummary,
  modeDisplayName,
  rosterSize,
} from '../lib/balance'
import type { GameMode } from '../types'

interface TeamSetupProps {
  gameMode: GameMode
  teamCount: number
  onTeamCountChange: (n: number) => void
  playerCount: number
  onBalance: () => void
  onRebalance: () => void
  canBalance: boolean
  hasBalanced: boolean
}

export function TeamSetup({
  gameMode,
  teamCount,
  onTeamCountChange,
  playerCount,
  onBalance,
  onRebalance,
  canBalance,
  hasBalanced,
}: TeamSetupProps) {
  function setCount(n: number) {
    onTeamCountChange(Math.max(1, Math.floor(n) || 1))
  }

  const perTeam = rosterSize(gameMode)
  const needForFull = teamCount * perTeam

  return (
    <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0 flex-1 space-y-2">
        <p className="text-xs font-medium tracking-wide text-ow-mist">
          팀 수 (무제한)
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="btn-ghost !px-3"
            aria-label="팀 수 1 감소"
            onClick={() => setCount(teamCount - 1)}
            disabled={teamCount <= 1}
          >
            <Minus size={16} />
          </button>

          <input
            type="number"
            min={1}
            inputMode="numeric"
            className="input-field clip-angle w-20 text-center text-xl font-bold sm:w-24"
            value={teamCount}
            onChange={(e) => setCount(Number(e.target.value))}
          />

          <button
            type="button"
            className="btn-ghost !px-3"
            aria-label="팀 수 1 증가"
            onClick={() => setCount(teamCount + 1)}
          >
            <Plus size={16} />
          </button>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {[+5, +10, +20].map((step) => (
            <button
              key={step}
              type="button"
              className="btn-ghost !min-h-9 !px-2.5 !py-1.5 !text-xs"
              onClick={() => setCount(teamCount + step)}
            >
              +{step}
            </button>
          ))}
          {teamCount > 2 && (
            <button
              type="button"
              className="btn-ghost !min-h-9 !px-2.5 !py-1.5 !text-xs"
              onClick={() => setCount(2)}
            >
              2로
            </button>
          )}
        </div>

        <p className="text-xs leading-relaxed text-ow-mist/90">
          {modeDisplayName(gameMode)} · {compositionSummary(gameMode)}
          {teamCount >= 2 ? ` · ${teamCount}팀 토너먼트` : ' · 1팀 연습용'}
          {playerCount > 0 && teamCount > 0 && (
            <span className="mt-0.5 block text-ow-mist/80 sm:mt-0 sm:ml-1 sm:inline">
              · 팀당 약 {(playerCount / teamCount).toFixed(1)}명
              {playerCount >= needForFull
                ? ` (${perTeam}인 완편 가능)`
                : ` · 완편까지 ${needForFull - playerCount}명 부족`}
            </span>
          )}
        </p>
      </div>

      <div className="flex w-full shrink-0 flex-col gap-2 sm:flex-row lg:w-auto lg:flex-col">
        <button
          type="button"
          className="btn-primary w-full lg:w-auto"
          disabled={!canBalance}
          onClick={onBalance}
        >
          {teamCount >= 2 ? <Trophy size={18} /> : <Shuffle size={18} />}
          <span className="truncate">티어 맞춰 팀짜기</span>
          {playerCount > 0 && <span className="opacity-70">({playerCount}명)</span>}
        </button>

        {hasBalanced && (
          <button
            type="button"
            className="btn-ghost w-full lg:w-auto"
            disabled={!canBalance}
            onClick={onRebalance}
          >
            <RefreshCw size={18} />
            <span className="truncate">팀 새로 짜기</span>
          </button>
        )}
      </div>
    </div>
  )
}
