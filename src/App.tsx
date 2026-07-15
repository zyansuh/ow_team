import { useEffect, useState } from 'react'
import { Crosshair, Users } from 'lucide-react'
import { ModeSelect } from './components/ModeSelect'
import { PlayerForm } from './components/PlayerForm'
import { PlayerList } from './components/PlayerList'
import { ReserveBench } from './components/ReserveBench'
import { TeamSetup } from './components/TeamSetup'
import { TeamResults } from './components/TeamResults'
import { Tournament } from './components/Tournament'
import {
  balanceTeams,
  compositionSummary,
  modeDisplayName,
} from './lib/balance'
import { createBracket, setMatchWinner } from './lib/tournament'
import type { GameMode, Match, Player, ReserveEntry, Team } from './types'
import { createId, normalizePlayer } from './constants'

const STORAGE_KEY = 'squad-forge-players'
const RESERVE_KEY = 'squad-forge-reserves'
const MODE_KEY = 'squad-forge-mode'

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

function loadReserves(): ReserveEntry[] {
  try {
    const raw = localStorage.getItem(RESERVE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter(
        (item): item is ReserveEntry =>
          !!item &&
          typeof item === 'object' &&
          typeof (item as ReserveEntry).id === 'string' &&
          typeof (item as ReserveEntry).nickname === 'string',
      )
      .map((item) => ({
        id: item.id,
        nickname: item.nickname.trim(),
      }))
      .filter((item) => item.nickname.length > 0)
  } catch {
    return []
  }
}

function loadMode(): GameMode {
  const raw = localStorage.getItem(MODE_KEY)
  return raw === '6v6' ? '6v6' : '5v5'
}

export default function App() {
  const [players, setPlayers] = useState<Player[]>(loadPlayers)
  const [reserves, setReserves] = useState<ReserveEntry[]>(loadReserves)
  const [gameMode, setGameMode] = useState<GameMode>(loadMode)
  const [teamCount, setTeamCount] = useState(2)
  const [teams, setTeams] = useState<Team[]>([])
  const [matches, setMatches] = useState<Match[]>([])
  const [hasBalanced, setHasBalanced] = useState(false)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(players))
  }, [players])

  useEffect(() => {
    localStorage.setItem(RESERVE_KEY, JSON.stringify(reserves))
  }, [reserves])

  useEffect(() => {
    localStorage.setItem(MODE_KEY, gameMode)
  }, [gameMode])

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

  function addReserve(entry: ReserveEntry) {
    setReserves((prev) => [...prev, entry])
  }

  function removeReserve(id: string) {
    setReserves((prev) => prev.filter((r) => r.id !== id))
  }

  function clearReserves() {
    setReserves([])
  }

  function movePlayerToReserve(player: Player) {
    setPlayers((prev) => prev.filter((p) => p.id !== player.id))
    setReserves((prev) => [
      ...prev,
      { id: createId(), nickname: player.nickname },
    ])
    setHasBalanced(false)
  }

  function handleModeChange(mode: GameMode) {
    setGameMode(mode)
    setHasBalanced(false)
  }

  function applyBalance(shuffle: boolean) {
    const balanced = balanceTeams(players, teamCount, gameMode, shuffle)
    setTeams(balanced)
    setMatches(createBracket(balanced))
    setHasBalanced(true)

    requestAnimationFrame(() => {
      document.getElementById('results')?.scrollIntoView({ behavior: 'smooth' })
    })
  }

  function handleBalance() {
    applyBalance(false)
  }

  function handleRebalance() {
    applyBalance(true)
  }

  function handlePickWinner(matchId: string, teamId: number) {
    setMatches((prev) => setMatchWinner(prev, matchId, teamId))
  }

  return (
    <div className="bg-arena min-h-svh">
      <div className="bg-hex min-h-svh">
        <header className="hero-shell border-b border-ow-cream/8">
          <div className="hero-orb hero-orb-a" aria-hidden />
          <div className="hero-orb hero-orb-b" aria-hidden />
          <div className="relative mx-auto flex min-h-[min(88svh,620px)] max-w-5xl flex-col justify-center px-4 py-14 sm:min-h-[64svh] sm:px-8 sm:py-20 md:px-10">
            <div className="animate-rise hero-brand-mark">
              <Crosshair size={16} className="shrink-0 sm:size-[18px]" />
              <span>오버워치 커스텀 · 내전</span>
            </div>

            <h1 className="animate-rise-delay-1 hero-title mt-5 text-ow-cream sm:mt-6">
              <span className="block text-[clamp(2.6rem,11vw,5.25rem)]">티어맞춤</span>
              <span className="mt-1 block bg-gradient-to-r from-ow-orange via-[#f3841f] to-[#d96510] bg-clip-text text-[clamp(3.1rem,13vw,6rem)] text-transparent">
                팀짜기
              </span>
            </h1>

            <p className="animate-rise-delay-2 mt-6 max-w-md text-[1rem] leading-relaxed text-ow-mist sm:mt-7 sm:text-lg">
              역할별 티어로 팀을 맞추고, 토너먼트까지 한곳에서.
            </p>

            <div className="animate-rise-delay-3 mt-8 flex w-full flex-col gap-3 sm:mt-9 sm:w-auto sm:flex-row">
              <a href="#mode" className="btn-primary w-full sm:w-auto">
                <Users size={18} />
                모드 선택
              </a>
              <a href="#lobby" className="btn-ghost w-full sm:w-auto">
                로비 시작
              </a>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:space-y-10 sm:px-8 sm:py-16 md:px-10">
          <div id="mode" className="scroll-mt-4">
            <ModeSelect gameMode={gameMode} onChange={handleModeChange} />
          </div>

          <section
            id="lobby"
            className="section-panel animate-rise space-y-5 p-4 clip-angle sm:space-y-6 sm:p-7 scroll-mt-4"
          >
            <div>
              <h2 className="section-title text-2xl text-ow-cream sm:text-3xl">로비</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-ow-mist">
                {modeDisplayName(gameMode)} · {compositionSummary(gameMode)}. 포지션별
                티어를 적은 뒤 무작위를 켜면 빈 슬롯을 자동으로 채웁니다. 예비인원은 팀짜기에
                들어가지 않습니다.
              </p>
            </div>

            <PlayerForm onAdd={addPlayer} />
            <div className="border-t border-ow-cream/8 pt-5">
              <PlayerList
                players={players}
                onRemove={removePlayer}
                onClear={clearPlayers}
                onMoveToReserve={movePlayerToReserve}
              />
            </div>

            <div className="border-t border-ow-cream/8 pt-5">
              <ReserveBench
                reserves={reserves}
                onAdd={addReserve}
                onRemove={removeReserve}
                onClear={clearReserves}
              />
            </div>
          </section>

          <section className="section-panel animate-rise-delay-1 p-4 clip-angle sm:p-7">
            <TeamSetup
              gameMode={gameMode}
              teamCount={teamCount}
              onTeamCountChange={(n) => {
                setTeamCount(n)
                setHasBalanced(false)
              }}
              playerCount={players.length}
              onBalance={handleBalance}
              onRebalance={handleRebalance}
              canBalance={players.length >= teamCount}
              hasBalanced={hasBalanced}
            />
            {players.length > 0 && players.length < teamCount && (
              <p className="mt-3 text-sm leading-relaxed text-amber-700">
                팀 수보다 인원이 적습니다. 최소 {teamCount}명 이상 등록해 주세요.
              </p>
            )}
          </section>

          <div id="results" className="scroll-mt-4 space-y-8 sm:scroll-mt-8 sm:space-y-10">
            {hasBalanced && (
              <>
                <TeamResults
                  teams={teams}
                  gameMode={gameMode}
                  reserves={reserves}
                />
                <Tournament
                  teams={teams}
                  matches={matches}
                  onPickWinner={handlePickWinner}
                />
              </>
            )}
          </div>
        </main>

        <footer className="border-t border-ow-cream/8 px-4 py-8 text-center sm:py-10">
          <p className="text-xs tracking-wide text-ow-mist">
            티어맞춤 팀짜기 · 오버워치 내전용 팀 편성
          </p>
          <p className="mt-2 text-[11px] tracking-wide text-ow-mist">made by DANBI</p>
        </footer>
      </div>
    </div>
  )
}
