import { formatTeamName, tierToMmr } from '../constants'
import type { Player, Position, Team } from '../types'

const BALANCED_ROLES: Position[] = ['tank', 'healer', 'dealer']

/**
 * 포지션별로 티어가 비슷하도록 팀을 나눕니다.
 * - 탱커끼리 / 힐러끼리 / 딜러끼리 각각 MMR 스네이크 드래프트
 * - 무작위는 전체 균형을 맞추며 배정
 * - 팀 수는 제한 없음 (대규모 내전용)
 */
export function balanceTeams(players: Player[], teamCount: number): Team[] {
  const count = Math.max(1, Math.floor(teamCount))
  const teams: Team[] = Array.from({ length: count }, (_, i) => ({
    id: i,
    name: formatTeamName(i),
    players: [],
    totalMmr: 0,
  }))

  if (players.length === 0) return teams

  for (const role of BALANCED_ROLES) {
    const rolePlayers = players.filter((p) => p.position === role)
    snakeDraftIntoTeams(rolePlayers, teams)
  }

  const randomPlayers = players.filter((p) => p.position === 'random')
  placeFlexiblePlayers(randomPlayers, teams)

  refineSameRoleBalance(teams)

  return teams
}

/** 고티어부터 1→N, N→1 스네이크로 역할 내 티어를 맞춥니다. */
function snakeDraftIntoTeams(players: Player[], teams: Team[]): void {
  if (players.length === 0) return

  const sorted = [...players].sort((a, b) => tierToMmr(b.tier) - tierToMmr(a.tier))
  const count = teams.length
  let direction = 1
  let index = 0

  for (const player of sorted) {
    addPlayerToTeam(teams[index], player)
    index += direction
    if (index >= count) {
      index = count - 1
      direction = -1
    } else if (index < 0) {
      index = 0
      direction = 1
    }
  }
}

/**
 * 무작위: 인원이 적고 총 MMR이 낮은 팀에 우선 배정.
 * (포지션이 고정되지 않으므로 전체 밸런스로 채움)
 */
function placeFlexiblePlayers(players: Player[], teams: Team[]): void {
  const sorted = [...players].sort((a, b) => tierToMmr(b.tier) - tierToMmr(a.tier))

  for (const player of sorted) {
    const target = [...teams].sort((a, b) => {
      if (a.players.length !== b.players.length) {
        return a.players.length - b.players.length
      }
      return a.totalMmr - b.totalMmr
    })[0]

    addPlayerToTeam(target, player)
  }
}

function addPlayerToTeam(team: Team, player: Player): void {
  team.players.push(player)
  team.totalMmr += tierToMmr(player.tier)
}

/**
 * 같은 포지션끼리만 스왑해서 역할별·전체 MMR 편차를 더 줄입니다.
 */
function refineSameRoleBalance(teams: Team[]): void {
  if (teams.length < 2) return

  const maxPasses = Math.min(80, Math.max(20, teams.length * 2))

  for (const role of BALANCED_ROLES) {
    for (let pass = 0; pass < maxPasses; pass++) {
      const roleStats = teams.map((team) => ({
        team,
        mmr: roleMmr(team, role),
        indices: team.players
          .map((p, i) => (p.position === role ? i : -1))
          .filter((i) => i >= 0),
      }))

      const withPlayers = roleStats.filter((s) => s.indices.length > 0)
      if (withPlayers.length < 2) break

      withPlayers.sort((a, b) => a.mmr - b.mmr)
      const weakest = withPlayers[0]
      const strongest = withPlayers[withPlayers.length - 1]
      const gap = strongest.mmr - weakest.mmr
      if (gap <= 1) break

      let bestSwap: {
        strongPlayerIdx: number
        weakPlayerIdx: number
        improvement: number
      } | null = null

      for (const si of strongest.indices) {
        for (const wi of weakest.indices) {
          const strongP = strongest.team.players[si]
          const weakP = weakest.team.players[wi]
          const strongM = tierToMmr(strongP.tier)
          const weakM = tierToMmr(weakP.tier)
          if (strongM <= weakM) continue

          const newStrongRole = strongest.mmr - strongM + weakM
          const newWeakRole = weakest.mmr - weakM + strongM
          const newGap = Math.abs(newStrongRole - newWeakRole)
          const roleImprovement = gap - newGap

          const newStrongTotal = strongest.team.totalMmr - strongM + weakM
          const newWeakTotal = weakest.team.totalMmr - weakM + strongM
          const oldTotalGap = Math.abs(
            strongest.team.totalMmr - weakest.team.totalMmr,
          )
          const newTotalGap = Math.abs(newStrongTotal - newWeakTotal)
          const totalPenalty = Math.max(0, newTotalGap - oldTotalGap) * 0.5
          const score = roleImprovement - totalPenalty

          if (score > 0 && (!bestSwap || score > bestSwap.improvement)) {
            bestSwap = {
              strongPlayerIdx: si,
              weakPlayerIdx: wi,
              improvement: score,
            }
          }
        }
      }

      if (!bestSwap) break

      const sPlayer = strongest.team.players[bestSwap.strongPlayerIdx]
      const wPlayer = weakest.team.players[bestSwap.weakPlayerIdx]
      const sM = tierToMmr(sPlayer.tier)
      const wM = tierToMmr(wPlayer.tier)

      strongest.team.players[bestSwap.strongPlayerIdx] = wPlayer
      weakest.team.players[bestSwap.weakPlayerIdx] = sPlayer
      strongest.team.totalMmr = strongest.team.totalMmr - sM + wM
      weakest.team.totalMmr = weakest.team.totalMmr - wM + sM
    }
  }
}

export function roleMmr(team: Team, role: Position): number {
  return team.players
    .filter((p) => p.position === role)
    .reduce((sum, p) => sum + tierToMmr(p.tier), 0)
}

export function roleAverageMmr(team: Team, role: Position): number {
  const rolePlayers = team.players.filter((p) => p.position === role)
  if (rolePlayers.length === 0) return 0
  return roleMmr(team, role) / rolePlayers.length
}

export function averageMmr(team: Team): number {
  if (team.players.length === 0) return 0
  return team.totalMmr / team.players.length
}
