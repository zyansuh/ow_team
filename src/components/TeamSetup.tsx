import { Shuffle, Trophy } from 'lucide-react'

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
  return (
    <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-2">
        <p className="font-display text-xs uppercase tracking-widest text-ow-mist/70">
          팀 수
        </p>
        <div className="flex gap-2">
          {[1, 2, 3, 4].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => onTeamCountChange(n)}
              className={`font-display min-w-14 px-3 py-2 text-lg font-bold transition clip-btn ${
                teamCount === n
                  ? 'bg-ow-orange text-ow-slate'
                  : 'border border-white/15 bg-ow-slate/50 text-ow-mist hover:border-ow-orange/50'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
        <p className="text-xs text-ow-mist/50">
          {teamCount >= 2
            ? `${teamCount}팀 토너먼트 브래킷이 함께 생성됩니다.`
            : '1팀은 연습/내부 분배용입니다.'}
        </p>
      </div>

      <button
        type="button"
        className="btn-primary"
        disabled={!canBalance}
        onClick={onBalance}
      >
        {teamCount >= 2 ? <Trophy size={18} /> : <Shuffle size={18} />}
        티어 맞춰 팀짜기
        {playerCount > 0 && (
          <span className="opacity-70">({playerCount}명)</span>
        )}
      </button>
    </div>
  )
}
