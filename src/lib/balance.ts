import {
  formatTeamName,
  hasRole,
  playerOverallMmr,
  playerRoleMmr,
} from '../constants'
import type { Player, Position, Team } from '../types'

const BALANCED_ROLES: Position[] = ['tank', 'healer', 'dealer']

/**
 * 포지션별로 티어가 비슷하도록 팀을 나눕니다.
 * - 한 명이 여러 포지션을 가진 경우: 아직 미배정일 때만 해당 역할 드래프트에 포함
 * - 탱/힐/딜 각각 해당 포지션 티어 기준으로 스네이크
 * - 무작위만 있거나 남은 인원은 전체 균형을 맞추며 배정
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

  const assigned = new Set<string>()

  for (const role of BALANCED_ROLES) {
    const rolePlayers = players.filter(
      (p) => !assigned.has(p.id) && hasRole(p, role),
    )
    snakeDraftByRole(rolePlayers, teams, role, assigned)
  }

  const remaining = players.filter((p) => !assigned.has(p.id))
  placeFlexiblePlayers(remaining, teams, assigned)

  refineSameRoleBalance(teams)

  return teams
}

function snakeDraftByRole(
  players: Player[],
  teams: Team[],
  role: Position,
  assigned: Set<string>,
): void {
  if (players.length === 0) return

  const sorted = [...players].sort(
    (a, b) => playerRoleMmr(b, role) - playerRoleMmr(a, role),
  )
  const count = teams.length
  let direction = 1
  let index = 0

  for (const player of sorted) {
    if (assigned.has(player.id)) continue
    addPlayerToTeam(teams[index], player)
    assigned.add(player.id)
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

function placeFlexiblePlayers(
  players: Player[],
  teams: Team[],
  assigned: Set<string>,
): void {
  const sorted = [...players].sort(
    (a, b) => playerOverallMmr(b) - playerOverallMmr(a),
  )

  for (const player of sorted) {
    if (assigned.has(player.id)) continue
    const target = [...teams].sort((a, b) => {
      if (a.players.length !== b.players.length) {
        return a.players.length - b.players.length
      }
      return a.totalMmr - b.totalMmr
    })[0]

    addPlayerToTeam(target, player)
    assigned.add(player.id)
  }
}

function addPlayerToTeam(team: Team, player: Player): void {
  team.players.push(player)
  team.totalMmr += playerOverallMmr(player)
}

/**
 * 같은 포지션을 가진 사람들끼리만 스왑해 역할별 MMR 편차를 줄입니다.
 * (멀티포지션은 해당 역할 티어 기준으로 비교)
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
          .map((p, i) => (hasRole(p, role) ? i : -1))
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
          const strongM = playerRoleMmr(strongP, role)
          const weakM = playerRoleMmr(weakP, role)
          if (strongM <= weakM) continue

          const newStrongRole = strongest.mmr - strongM + weakM
          const newWeakRole = weakest.mmr - weakM + strongM
          const newGap = Math.abs(newStrongRole - newWeakRole)
          const roleImprovement = gap - newGap

          const strongOverall = playerOverallMmr(strongP)
          const weakOverall = playerOverallMmr(weakP)
          const newStrongTotal = strongest.team.totalMmr - strongOverall + weakOverall
          const newWeakTotal = weakest.team.totalMmr - weakOverall + strongOverall
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
      const sOverall = playerOverallMmr(sPlayer)
      const wOverall = playerOverallMmr(wPlayer)

      strongest.team.players[bestSwap.strongPlayerIdx] = wPlayer
      weakest.team.players[bestSwap.weakPlayerIdx] = sPlayer
      strongest.team.totalMmr = strongest.team.totalMmr - sOverall + wOverall
      weakest.team.totalMmr = weakest.team.totalMmr - wOverall + sOverall
    }
  }
}

export function roleMmr(team: Team, role: Position): number {
  return team.players.reduce((sum, p) => sum + playerRoleMmr(p, role), 0)
}

export function roleAverageMmr(team: Team, role: Position): number {
  const rolePlayers = team.players.filter((p) => hasRole(p, role))
  if (rolePlayers.length === 0) return 0
  return roleMmr(team, role) / rolePlayers.length
}

export function rolePlayerCount(team: Team, role: Position): number {
  return team.players.filter((p) => hasRole(p, role)).length
}

export function averageMmr(team: Team): number {
  if (team.players.length === 0) return 0
  return team.totalMmr / team.players.length
}
