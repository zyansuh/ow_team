import {
  POSITION_COLORS,
  POSITION_LABELS,
  RANK_COLORS,
  formatTier,
  tierToMmr,
} from '../constants'
import { averageMmr, roleAverageMmr } from '../lib/balance'
import type { Position, Team } from '../types'

const TEAM_ACCENTS = ['#f99e1a', '#38bdf8', '#34d399', '#f472b6']
const ROLE_ORDER: Position[] = ['tank', 'healer', 'dealer', 'random']

interface TeamResultsProps {
  teams: Team[]
}

export function TeamResults({ teams }: TeamResultsProps) {
  if (teams.length === 0 || teams.every((t) => t.players.length === 0)) {
    return null
  }

  const avgList = teams.map((t) => averageMmr(t))
  const maxAvg = Math.max(...avgList, 1)

  return (
    <section className="space-y-5 animate-rise-delay-2">
      <header>
        <h2 className="font-display text-2xl font-bold uppercase tracking-wide text-ow-cream sm:text-3xl">
          팀 편성 결과
        </h2>
        <p className="mt-1 text-sm text-ow-mist/65">
          탱커·힐러·딜러를 각각 티어가 비슷하도록 나눴습니다. 포지션별 평균이 가까울수록 대등한 매치입니다.
        </p>
      </header>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {teams.map((team, ti) => {
          const accent = TEAM_ACCENTS[ti % TEAM_ACCENTS.length]
          const avg = averageMmr(team)
          const barWidth = `${(avg / maxAvg) * 100}%`
          const sortedPlayers = [...team.players].sort(
            (a, b) => ROLE_ORDER.indexOf(a.position) - ROLE_ORDER.indexOf(b.position),
          )

          return (
            <article
              key={team.id}
              className="section-panel overflow-hidden clip-angle"
              style={{ borderTop: `3px solid ${accent}` }}
            >
              <div className="border-b border-white/8 px-4 py-3">
                <div className="flex items-baseline justify-between gap-2">
                  <h3
                    className="font-display text-xl font-bold uppercase tracking-wider"
                    style={{ color: accent }}
                  >
                    {team.name}
                  </h3>
                  <span className="text-xs text-ow-mist/50">{team.players.length}명</span>
                </div>
                <div className="mt-2 space-y-1">
                  <div className="flex justify-between text-[11px] text-ow-mist/55">
                    <span>평균 MMR</span>
                    <span className="font-display text-sm font-semibold text-ow-cream">
                      {avg.toFixed(1)}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden bg-ow-slate/80">
                    <div
                      className="h-full transition-all duration-700"
                      style={{ width: barWidth, background: accent }}
                    />
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 pt-1">
                    {(['tank', 'healer', 'dealer'] as const).map((role) => {
                      const count = team.players.filter((p) => p.position === role).length
                      if (count === 0) return null
                      const roleAvg = roleAverageMmr(team, role)
                      return (
                        <span
                          key={role}
                          className="text-[11px]"
                          style={{ color: POSITION_COLORS[role] }}
                        >
                          {POSITION_LABELS[role]} {roleAvg.toFixed(1)}
                          <span className="text-ow-mist/35"> ({count})</span>
                        </span>
                      )
                    })}
                  </div>
                </div>
              </div>

              <ul className="divide-y divide-white/5">
                {sortedPlayers.length === 0 && (
                  <li className="px-4 py-6 text-center text-sm text-ow-mist/40">비어 있음</li>
                )}
                {sortedPlayers.map((player) => (
                  <li key={player.id} className="flex items-center gap-2.5 px-4 py-2.5">
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ background: POSITION_COLORS[player.position] }}
                      title={POSITION_LABELS[player.position]}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{player.nickname}</p>
                      <p className="text-[11px] text-ow-mist/50">
                        {POSITION_LABELS[player.position]}
                      </p>
                    </div>
                    <span
                      className="tier-chip shrink-0"
                      style={{
                        borderColor: RANK_COLORS[player.tier.rank],
                        color: RANK_COLORS[player.tier.rank],
                      }}
                    >
                      {formatTier(player.tier)}
                    </span>
                    <span className="w-6 text-right text-[10px] text-ow-mist/35">
                      {tierToMmr(player.tier)}
                    </span>
                  </li>
                ))}
              </ul>
            </article>
          )
        })}
      </div>
    </section>
  )
}
