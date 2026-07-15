import { Crown } from 'lucide-react'
import type { Match, Team } from '../types'

interface TournamentProps {
  teams: Team[]
  matches: Match[]
  onPickWinner: (matchId: string, teamId: number) => void
}

function teamName(teams: Team[], id: number | null): string {
  if (id === null) return '대기 중'
  return teams.find((t) => t.id === id)?.name ?? '?'
}

export function Tournament({ teams, matches, onPickWinner }: TournamentProps) {
  if (matches.length === 0) return null

  const rounds = [...new Set(matches.map((m) => m.round))].sort((a, b) => a - b)
  const champion = matches.find((m) => m.id === 'final' && m.winner !== null)

  return (
    <section className="space-y-5 animate-rise-delay-3">
      <header>
        <h2 className="font-display text-2xl font-bold uppercase tracking-wide text-ow-cream sm:text-3xl">
          토너먼트
        </h2>
        <p className="mt-1 text-sm text-ow-mist/65">
          승자를 클릭하면 다음 라운드로 올라갑니다.
        </p>
      </header>

      {champion && (
        <div className="section-panel flex items-center gap-3 border-ow-orange/40 px-5 py-4 clip-angle animate-float">
          <Crown className="text-ow-orange" size={28} />
          <div>
            <p className="font-display text-xs uppercase tracking-widest text-ow-orange">
              Champion
            </p>
            <p className="font-display text-2xl font-bold text-ow-cream">
              {teamName(teams, champion.winner)}
            </p>
          </div>
        </div>
      )}

      <div
        className={`grid gap-6 ${rounds.length > 1 ? 'lg:grid-cols-2' : 'max-w-lg'}`}
      >
        {rounds.map((round) => {
          const roundMatches = matches.filter((m) => m.round === round)
          const roundLabel =
            round === Math.max(...rounds) ? '결승 라운드' : `라운드 ${round}`

          return (
            <div key={round} className="space-y-3">
              <p className="font-display text-xs uppercase tracking-widest text-ow-mist/55">
                {roundLabel}
              </p>
              {roundMatches.map((match) => (
                <MatchCard
                  key={match.id}
                  match={match}
                  teams={teams}
                  onPickWinner={onPickWinner}
                />
              ))}
            </div>
          )
        })}
      </div>
    </section>
  )
}

function MatchCard({
  match,
  teams,
  onPickWinner,
}: {
  match: Match
  teams: Team[]
  onPickWinner: (matchId: string, teamId: number) => void
}) {
  const ready = match.teamA !== null && match.teamB !== null

  return (
    <article className="section-panel overflow-hidden clip-angle">
      <div className="border-b border-white/8 px-4 py-2">
        <span className="font-display text-sm font-semibold uppercase tracking-wider text-ow-orange">
          {match.label}
        </span>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-stretch">
        <Slot
          teamId={match.teamA}
          teams={teams}
          isWinner={match.winner === match.teamA}
          disabled={!ready || match.teamA === null}
          onClick={() => match.teamA !== null && onPickWinner(match.id, match.teamA)}
        />
        <div className="flex items-center justify-center px-2 font-display text-xs font-bold text-ow-mist/40">
          VS
        </div>
        <Slot
          teamId={match.teamB}
          teams={teams}
          isWinner={match.winner === match.teamB}
          disabled={!ready || match.teamB === null}
          onClick={() => match.teamB !== null && onPickWinner(match.id, match.teamB)}
        />
      </div>

      {!ready && (
        <p className="border-t border-white/8 px-4 py-2 text-center text-xs text-ow-mist/40">
          이전 경기 결과를 기다려 주세요
        </p>
      )}
    </article>
  )
}

function Slot({
  teamId,
  teams,
  isWinner,
  disabled,
  onClick,
}: {
  teamId: number | null
  teams: Team[]
  isWinner: boolean
  disabled: boolean
  onClick: () => void
}) {
  const name = teamId === null ? '—' : teams.find((t) => t.id === teamId)?.name ?? '?'

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`px-4 py-5 text-center transition ${
        isWinner
          ? 'bg-ow-orange/20 text-ow-orange'
          : disabled
            ? 'text-ow-mist/35'
            : 'text-ow-cream hover:bg-white/5'
      }`}
    >
      <span className="font-display text-lg font-bold uppercase tracking-wide">{name}</span>
      {isWinner && (
        <span className="mt-1 block text-[10px] uppercase tracking-widest text-ow-orange">
          Winner
        </span>
      )}
      {!disabled && !isWinner && teamId !== null && (
        <span className="mt-1 block text-[10px] uppercase tracking-widest text-ow-mist/35">
          클릭 → 승자
        </span>
      )}
    </button>
  )
}
