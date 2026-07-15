import { Minus, Plus, Shuffle, Trophy } from 'lucide-react'

interface TeamSetupProps {
  teamCount: number
  onTeamCountChange: (n: number) => void
  playerCount: number
  onBalance: () => void
  canBalance: boolean
}

export function TeamSetup({
  teamCount,
  onTeamCountChange,
  playerCount,
  onBalance,
  canBalance,
}: TeamSetupProps) {
  function setCount(n: number) {
    onTeamCountChange(Math.max(1, Math.floor(n) || 1))
  }

  return (
    <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0 flex-1 space-y-2">
        <p className="text-xs font-medium tracking-wide text-ow-mist/70">
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

        <p className="text-xs leading-relaxed text-ow-mist/50">
          {teamCount >= 2
            ? `${teamCount}팀 토너먼트 브래킷이 함께 생성됩니다. 대규모 내전도 OK.`
            : '1팀은 연습/내부 분배용입니다.'}
          {playerCount > 0 && teamCount > 0 && (
            <span className="mt-0.5 block text-ow-mist/40 sm:mt-0 sm:ml-1 sm:inline">
              · 팀당 약 {(playerCount / teamCount).toFixed(1)}명
            </span>
          )}
        </p>
      </div>

      <button
        type="button"
        className="btn-primary w-full shrink-0 lg:w-auto"
        disabled={!canBalance}
        onClick={onBalance}
      >
        {teamCount >= 2 ? <Trophy size={18} /> : <Shuffle size={18} />}
        <span className="truncate">티어 맞춰 팀짜기</span>
        {playerCount > 0 && <span className="opacity-70">({playerCount}명)</span>}
      </button>
    </div>
  )
}
