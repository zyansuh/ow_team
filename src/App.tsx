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

const STORAGE_KEY = 'squad-forge-players'

function loadPlayers(): Player[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as Player[]
    return Array.isArray(parsed) ? parsed : []
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
        {/* Hero */}
        <header className="relative overflow-hidden border-b border-white/10">
          <div
            className="pointer-events-none absolute inset-0 opacity-40"
            style={{
              background:
                'linear-gradient(105deg, transparent 40%, rgba(249,158,26,0.12) 50%, transparent 60%)',
            }}
          />
          <div className="relative mx-auto flex min-h-[72svh] max-w-5xl flex-col justify-center px-5 py-16 sm:px-8 sm:min-h-[68svh]">
            <div className="animate-rise flex items-center gap-2 text-ow-orange">
              <Crosshair size={18} />
              <span className="text-sm font-semibold tracking-[0.12em] text-ow-orange">
                오버워치 커스텀 · 대규모 내전
              </span>
            </div>

            <h1 className="animate-rise-delay-1 mt-5 font-bold leading-[1.05] tracking-tight text-ow-cream">
              <span className="block text-5xl sm:text-6xl md:text-7xl">티어맞춤</span>
              <span className="mt-1 block text-6xl text-ow-orange sm:text-7xl md:text-8xl">
                팀짜기
              </span>
            </h1>

            <p className="animate-rise-delay-2 mt-6 max-w-lg text-base leading-relaxed text-ow-mist/80 sm:text-lg">
              닉네임·포지션·티어로 역할별 실력을 맞춘 팀을 만들고,
              인원 많은 서버 내전·토너먼트까지 한곳에서 돌리세요.
            </p>

            <div className="animate-rise-delay-3 mt-8 flex flex-wrap gap-3">
              <a href="#lobby" className="btn-primary">
                <Users size={18} />
                로비 시작
              </a>
              <a href="#results" className="btn-ghost">
                결과 보기
              </a>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-5xl space-y-10 px-5 py-12 sm:px-8 sm:py-16">
          {/* Lobby */}
          <section id="lobby" className="section-panel space-y-6 p-5 clip-angle sm:p-7 animate-rise">
            <div>
              <h2 className="font-display text-2xl font-bold uppercase tracking-wide sm:text-3xl">
                로비
              </h2>
              <p className="mt-1 text-sm text-ow-mist/65">
                팀원·팀 수 모두 제한 없이 추가할 수 있습니다. 디비전은 5가 낮고 1이 높습니다.
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

          {/* Setup */}
          <section className="section-panel p-5 clip-angle sm:p-7 animate-rise-delay-1">
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
              <p className="mt-3 text-sm text-amber-400/90">
                팀 수보다 인원이 적습니다. 최소 {teamCount}명 이상 등록해 주세요.
              </p>
            )}
          </section>

          {/* Results */}
          <div id="results" className="scroll-mt-8 space-y-10">
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

        <footer className="border-t border-white/8 py-8 text-center text-xs text-ow-mist/35">
          <p className="tracking-wide">티어맞춤 팀짜기 · 오버워치 내전용 팀 편성</p>
        </footer>
      </div>
    </div>
  )
}
