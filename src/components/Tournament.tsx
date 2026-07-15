import { Crown } from 'lucide-react'
import { findChampionMatch } from '../lib/tournament'
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

function roundTitle(round: number, maxRound: number, matchCount: number): string {
  const fromEnd = maxRound - round
  if (fromEnd === 0) return '결승'
  if (fromEnd === 1) return '준결승'
  if (fromEnd === 2) return '8강'
  const bracketSize = 2 ** (fromEnd + 1)
  return `${bracketSize}강 · ${matchCount}경기`
}

export function Tournament({ teams, matches, onPickWinner }: TournamentProps) {
  if (matches.length === 0) return null

  const rounds = [...new Set(matches.map((m) => m.round))].sort((a, b) => a - b)
  const maxRound = Math.max(...rounds)
  const champion = findChampionMatch(matches)

  return (
    <section className="animate-rise-delay-3 space-y-4 sm:space-y-5">
      <header>
        <h2 className="section-title text-2xl text-ow-cream sm:text-3xl">
          토너먼트
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-ow-mist">
          {teams.length}팀 싱글 엘리미네이션 · 승자를 탭하면 다음 라운드로 올라갑니다.
          <span className="mt-0.5 block text-ow-mist/80 sm:mt-0 sm:ml-1 sm:inline">
            (모바일에서는 좌우로 밀어 보세요)
          </span>
        </p>
      </header>

      {champion && (
        <div className="section-panel animate-float flex items-center gap-3 border-ow-orange/40 px-4 py-3.5 clip-angle sm:px-5 sm:py-4">
          <Crown className="shrink-0 text-ow-orange" size={24} />
          <div className="min-w-0">
            <p className="text-xs font-semibold tracking-widest text-ow-orange uppercase">
              우승
            </p>
            <p className="truncate text-xl font-bold text-ow-cream sm:text-2xl">
              {teamName(teams, champion.winner)}
            </p>
          </div>
        </div>
      )}

      <div className="bracket-scroll">
        {rounds.map((round) => {
          const roundMatches = matches.filter((m) => m.round === round)
          const visible = roundMatches.filter(
            (m) => m.teamA !== null || m.teamB !== null || m.round > 1,
          )

          return (
            <div key={round} className="bracket-round space-y-3">
              <p className="sticky top-0 text-xs font-semibold tracking-wide text-ow-mist">
                {roundTitle(round, maxRound, visible.length)}
              </p>
              {visible.map((match) => (
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
  const isBye =
    (match.teamA !== null && match.teamB === null) ||
    (match.teamB !== null && match.teamA === null)

  return (
    <article className="section-panel overflow-hidden clip-angle">
      <div className="flex flex-wrap items-center gap-x-2 border-b border-ow-cream/8 px-3 py-2 sm:px-4">
        <span className="text-sm font-semibold tracking-wide text-ow-orange">
          {match.label}
        </span>
        {isBye && match.winner !== null && (
          <span className="text-[10px] tracking-widest text-ow-mist/80 uppercase">부전승</span>
        )}
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-stretch">
        <Slot
          teamId={match.teamA}
          teams={teams}
          isWinner={match.winner === match.teamA}
          disabled={!ready || match.teamA === null}
          onClick={() => match.teamA !== null && onPickWinner(match.id, match.teamA)}
        />
        <div className="flex items-center justify-center px-1.5 text-xs font-bold text-ow-mist/80 sm:px-2">
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

      {!ready && !isBye && (
        <p className="border-t border-ow-cream/8 px-3 py-2 text-center text-xs text-ow-mist/80 sm:px-4">
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
      className={`min-h-[72px] px-2 py-3 text-center transition sm:min-h-0 sm:px-3 sm:py-4 ${
        isWinner
          ? 'bg-ow-orange/20 text-ow-orange'
          : disabled
            ? 'text-ow-mist/75'
            : 'text-ow-cream hover:bg-ow-cream/4 active:bg-ow-cream/6'
      }`}
    >
      <span className="block truncate text-sm font-bold tracking-wide sm:text-base">{name}</span>
      {isWinner && (
        <span className="mt-1 block text-[10px] tracking-widest text-ow-orange uppercase">
          승자
        </span>
      )}
      {!disabled && !isWinner && teamId !== null && (
        <span className="mt-1 block text-[10px] tracking-widest text-ow-mist/75">
          탭 → 승자
        </span>
      )}
    </button>
  )
}
