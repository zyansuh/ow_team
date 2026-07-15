import {
  POSITION_COLORS,
  POSITION_LABELS,
  POSITION_ORDER,
  RANK_COLORS,
  formatTier,
  isFlex,
  playerRoleMmr,
} from '../constants'
import {
  averageMmr,
  compositionLabel,
  compositionSummary,
  getComposition,
  isFullRoster,
  modeDisplayName,
  roleAverageMmr,
  rolePlayerCount,
} from '../lib/balance'
import type { GameMode, SlottedRole, Team } from '../types'

const TEAM_ACCENTS = ['#f99e1a', '#38bdf8', '#34d399', '#f472b6']
const SLOT_ORDER: SlottedRole[] = ['tank', 'healer', 'dealer']

interface TeamResultsProps {
  teams: Team[]
  gameMode: GameMode
  reserves?: { id: string; nickname: string }[]
}

export function TeamResults({ teams, gameMode, reserves = [] }: TeamResultsProps) {
  if (teams.length === 0 || teams.every((t) => t.members.length === 0)) {
    return null
  }

  const avgList = teams.map((t) => averageMmr(t))
  const maxAvg = Math.max(...avgList, 1)
  const comp = getComposition(gameMode)

  return (
    <section className="animate-rise-delay-2 space-y-4 sm:space-y-5">
      <header>
        <h2 className="section-title text-2xl text-ow-cream sm:text-3xl">
          팀 편성 결과
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-ow-mist">
          <span className="text-ow-orange">{modeDisplayName(gameMode)} 모드</span>
          {' · '}
          팀당 <span className="text-ow-mist/85">{compositionSummary(gameMode)}</span> 기준.
          무작위(플렉스)는 빈 슬롯에 해당 포지션 티어로 채워집니다.
        </p>
      </header>

      {reserves.length > 0 && (
        <div className="section-panel rounded-[14px] px-4 py-3.5 sm:px-5">
          <p className="text-xs font-medium tracking-wide text-ow-mist">
            예비 명단 · {reserves.length}명
          </p>
          <p className="mt-2 flex flex-wrap gap-2">
            {reserves.map((r) => (
              <span
                key={r.id}
                className="rounded-full border border-ow-cream/10 bg-white/80 px-3 py-1 text-sm text-ow-cream"
              >
                {r.nickname}
              </span>
            ))}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
        {teams.map((team, ti) => {
          const accent = TEAM_ACCENTS[ti % TEAM_ACCENTS.length]
          const avg = averageMmr(team)
          const barWidth = `${(avg / maxAvg) * 100}%`
          const sortedMembers = [...team.members].sort(
            (a, b) =>
              SLOT_ORDER.indexOf(a.slottedRole) - SLOT_ORDER.indexOf(b.slottedRole),
          )
          const full = isFullRoster(team, gameMode)

          return (
            <article
              key={team.id}
              className="section-panel overflow-hidden clip-angle"
              style={{ borderTop: `3px solid ${accent}` }}
            >
              <div className="border-b border-ow-cream/8 px-3 py-3 sm:px-4">
                <div className="flex items-baseline justify-between gap-2">
                  <h3
                    className="text-lg font-bold tracking-wide sm:text-xl section-title"
                    style={{ color: accent }}
                  >
                    {team.name}
                  </h3>
                  <span className="shrink-0 text-xs text-ow-mist/90">
                    {team.members.length}명
                    {full ? ' · 완편' : ''}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-ow-mist/90">{compositionLabel(team)}</p>
                <div className="mt-2 space-y-1">
                  <div className="flex justify-between text-[11px] text-ow-mist">
                    <span>평균 MMR</span>
                    <span className="text-sm font-semibold text-ow-cream">{avg.toFixed(1)}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-ow-cream/8">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: barWidth, background: accent }}
                    />
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 pt-1">
                    {SLOT_ORDER.map((role) => {
                      const count = rolePlayerCount(team, role)
                      const need = comp[role]
                      if (count === 0 && need === 0) return null
                      const roleAvg = roleAverageMmr(team, role)
                      return (
                        <span
                          key={role}
                          className="text-[11px]"
                          style={{ color: POSITION_COLORS[role] }}
                        >
                          {POSITION_LABELS[role]} {count}/{need}
                          {count > 0 && (
                            <span className="text-ow-mist/75"> · {roleAvg.toFixed(1)}</span>
                          )}
                        </span>
                      )
                    })}
                  </div>
                </div>
              </div>

              <ul className="divide-y divide-ow-cream/6">
                {sortedMembers.length === 0 && (
                  <li className="px-4 py-6 text-center text-sm text-ow-mist/80">비어 있음</li>
                )}
                {sortedMembers.map((member) => {
                  const { player, slottedRole } = member
                  const flex = isFlex(player)
                  const slotTier = player.roles.find((r) => r.position === slottedRole)?.tier

                  return (
                    <li
                      key={player.id}
                      className="flex min-w-0 items-start gap-2 px-3 py-2.5 sm:gap-2.5 sm:px-4"
                    >
                      <span
                        className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                        style={{ background: POSITION_COLORS[slottedRole] }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{player.nickname}</p>
                        <div className="mt-1 flex flex-wrap gap-1">
                          <span
                            className="tier-chip !text-[10px]"
                            style={{
                              borderColor: POSITION_COLORS[slottedRole],
                              color: POSITION_COLORS[slottedRole],
                            }}
                          >
                            배정 {POSITION_LABELS[slottedRole]}
                            {slotTier && (
                              <span
                                className="ml-1"
                                style={{ color: RANK_COLORS[slotTier.rank] }}
                              >
                                {formatTier(slotTier)}
                              </span>
                            )}
                          </span>
                          {flex && (
                            <span
                              className="tier-chip !text-[10px]"
                              style={{
                                borderColor: POSITION_COLORS.random,
                                color: POSITION_COLORS.random,
                              }}
                            >
                              플렉스
                            </span>
                          )}
                          {[...player.roles]
                            .filter((r) => r.position !== 'random' && r.position !== slottedRole)
                            .sort(
                              (a, b) =>
                                POSITION_ORDER.indexOf(a.position) - POSITION_ORDER.indexOf(b.position),
                            )
                            .map((role) => (
                              <span
                                key={role.position}
                                className="tier-chip !text-[10px] opacity-60"
                                style={{
                                  borderColor: RANK_COLORS[role.tier.rank],
                                  color: POSITION_COLORS[role.position],
                                }}
                              >
                                {POSITION_LABELS[role.position]}{' '}
                                <span style={{ color: RANK_COLORS[role.tier.rank] }}>
                                  {formatTier(role.tier)}
                                </span>
                              </span>
                            ))}
                        </div>
                      </div>
                      <span className="hidden shrink-0 text-[10px] text-ow-mist/75 sm:block">
                        {playerRoleMmr(player, slottedRole)}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </article>
          )
        })}
      </div>
    </section>
  )
}
