import { useEffect, useState } from 'react'
import { Crosshair, Users } from 'lucide-react'
import { PlayerForm } from './components/PlayerForm'
import { PlayerList } from './components/PlayerList'
import { TeamSetup } from './components/TeamSetup'
import { TeamResults } from './components/TeamResults'
import { Tournament } from './components/Tournament'
import { balanceTeams } from './lib/balance'
import { createBracket, setMatchWinner } from './lib/tournament'
import type { Match, Player, Team } from './types'
import { normalizePlayer } from './constants'

const STORAGE_KEY = 'squad-forge-players'

function loadPlayers(): Player[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed
      .map((item) => normalizePlayer(item))
      .filter((p): p is Player => p !== null)
  } catch {
    return []
  }
}

export default function App() {
  const [players, setPlayers] = useState<Player[]>(loadPlayers)
  const [teamCount, setTeamCount] = useState(2)
  const [teams, setTeams] = useState<Team[]>([])
  const [matches, setMatches] = useState<Match[]>([])
  const [hasBalanced, setHasBalanced] = useState(false)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(players))
  }, [players])

  function addPlayer(player: Player) {
    setPlayers((prev) => [...prev, player])
    setHasBalanced(false)
  }

  function removePlayer(id: string) {
    setPlayers((prev) => prev.filter((p) => p.id !== id))
    setHasBalanced(false)
  }

  function clearPlayers() {
    setPlayers([])
    setTeams([])
    setMatches([])
    setHasBalanced(false)
  }

  function handleBalance() {
    const balanced = balanceTeams(players, teamCount)
    setTeams(balanced)
    setMatches(createBracket(balanced))
    setHasBalanced(true)

    requestAnimationFrame(() => {
      document.getElementById('results')?.scrollIntoView({ behavior: 'smooth' })
    })
  }

  function handlePickWinner(matchId: string, teamId: number) {
    setMatches((prev) => setMatchWinner(prev, matchId, teamId))
  }

  return (
    <div className="bg-arena min-h-svh">
      <div className="bg-hex min-h-svh">
        <header className="relative overflow-hidden border-b border-white/10">
          <div
            className="pointer-events-none absolute inset-0 opacity-40"
            style={{
              background:
                'linear-gradient(105deg, transparent 40%, rgba(249,158,26,0.12) 50%, transparent 60%)',
            }}
          />
          <div className="relative mx-auto flex min-h-[min(88svh,640px)] max-w-5xl flex-col justify-center px-4 py-12 sm:min-h-[68svh] sm:px-8 sm:py-16 md:px-10">
            <div className="animate-rise flex items-center gap-2 text-ow-orange">
              <Crosshair size={16} className="shrink-0 sm:size-[18px]" />
              <span className="text-xs font-semibold tracking-[0.08em] text-ow-orange sm:text-sm sm:tracking-[0.12em]">
                오버워치 커스텀 · 대규모 내전
              </span>
            </div>

            <h1 className="animate-rise-delay-1 mt-4 font-bold leading-[1.08] tracking-tight text-ow-cream sm:mt-5 sm:leading-[1.05]">
              <span className="block text-[clamp(2.25rem,10vw,4.5rem)]">티어맞춤</span>
              <span className="mt-0.5 block text-[clamp(2.75rem,12vw,5.5rem)] text-ow-orange sm:mt-1">
                팀짜기
              </span>
            </h1>

            <p className="animate-rise-delay-2 mt-5 max-w-lg text-[0.95rem] leading-relaxed text-ow-mist/80 sm:mt-6 sm:text-lg">
              닉네임·포지션·티어로 역할별 실력을 맞춘 팀을 만들고,
              인원 많은 서버 내전·토너먼트까지 한곳에서 돌리세요.
            </p>

            <div className="animate-rise-delay-3 mt-7 flex w-full flex-col gap-3 sm:mt-8 sm:w-auto sm:flex-row sm:flex-wrap">
              <a href="#lobby" className="btn-primary w-full sm:w-auto">
                <Users size={18} />
                로비 시작
              </a>
              <a href="#results" className="btn-ghost w-full sm:w-auto">
                결과 보기
              </a>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:space-y-10 sm:px-8 sm:py-16 md:px-10">
          <section
            id="lobby"
            className="section-panel animate-rise space-y-5 p-4 clip-angle sm:space-y-6 sm:p-7 scroll-mt-4"
          >
            <div>
              <h2 className="text-xl font-bold tracking-tight sm:text-3xl sm:tracking-wide sm:font-display sm:uppercase">
                로비
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-ow-mist/65">
                팀원·팀 수 제한 없음. 한 명에 포지션을 여러 개 넣고 포지션마다 티어를 적을 수
                있습니다. 디비전은 5가 낮고 1이 높습니다.
              </p>
            </div>

            <PlayerForm onAdd={addPlayer} />
            <div className="border-t border-white/8 pt-5">
              <PlayerList
                players={players}
                onRemove={removePlayer}
                onClear={clearPlayers}
              />
            </div>
          </section>

          <section className="section-panel animate-rise-delay-1 p-4 clip-angle sm:p-7">
            <TeamSetup
              teamCount={teamCount}
              onTeamCountChange={(n) => {
                setTeamCount(n)
                setHasBalanced(false)
              }}
              playerCount={players.length}
              onBalance={handleBalance}
              canBalance={players.length >= teamCount}
            />
            {players.length > 0 && players.length < teamCount && (
              <p className="mt-3 text-sm leading-relaxed text-amber-400/90">
                팀 수보다 인원이 적습니다. 최소 {teamCount}명 이상 등록해 주세요.
              </p>
            )}
          </section>

          <div id="results" className="scroll-mt-4 space-y-8 sm:scroll-mt-8 sm:space-y-10">
            {hasBalanced && (
              <>
                <TeamResults teams={teams} />
                <Tournament
                  teams={teams}
                  matches={matches}
                  onPickWinner={handlePickWinner}
                />
              </>
            )}
          </div>
        </main>

        <footer className="border-t border-white/8 px-4 py-6 text-center sm:py-8">
          <p className="text-xs tracking-wide text-ow-mist/35">
            티어맞춤 팀짜기 · 오버워치 내전용 팀 편성
          </p>
          <p className="mt-2 text-[11px] tracking-wide text-ow-mist/25">made by DANBI</p>
        </footer>
      </div>
    </div>
  )
}
