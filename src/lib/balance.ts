import {
  formatTeamName,
  hasExplicitRole,
  isFlex,
  playerOverallMmr,
  playerRoleMmr,
} from '../constants'
import type { Player, Position, SlottedRole, Team, TeamMember } from '../types'

/** 오버워치 한 팀 구성: 탱커 1 · 딜러 2 · 힐러 2 */
export const TEAM_COMPOSITION: Record<SlottedRole, number> = {
  tank: 1,
  dealer: 2,
  healer: 2,
}

export const SLOT_ORDER: SlottedRole[] = ['tank', 'healer', 'dealer']

/**
 * OW 5인 구성(탱1·딜2·힐2)으로 팀을 나눕니다.
 * 1) 전담(무작위 아님) 인원을 역할 슬롯에 티어 맞춰 배치
 * 2) 무작위(플렉스) 인원을 빈 슬롯에 해당 포지션 티어로 채움
 * 3) 남는 인원은 인원·MMR이 적은 팀에 최적 역할로 추가
 */
export function balanceTeams(players: Player[], teamCount: number): Team[] {
  const count = Math.max(1, Math.floor(teamCount))
  const teams: Team[] = Array.from({ length: count }, (_, i) => ({
    id: i,
    name: formatTeamName(i),
    members: [],
    totalMmr: 0,
  }))

  if (players.length === 0) return teams

  const assigned = new Set<string>()
  const specialists = players.filter((p) => !isFlex(p))
  const flexPool = players.filter((p) => isFlex(p))

  // 1) 전담 역할 배치 (슬롯 정원 내에서)
  for (const role of SLOT_ORDER) {
    const pool = specialists.filter(
      (p) => !assigned.has(p.id) && hasExplicitRole(p, role),
    )
    fillRoleSlots(role, pool, teams, assigned)
  }

  // 전담인데 아직 못 들어간 사람 (슬롯이 다 찬 경우 등) → 빈 슬롯/오버플로로
  const leftoverSpecialists = specialists.filter((p) => !assigned.has(p.id))

  // 2) 빈 슬롯을 무작위(플렉스)로 채움
  fillEmptySlotsWithFlex(flexPool, teams, assigned)

  // 3) 남은 전담 + 남은 플렉스 → 빈 슬롯 우선, 없으면 오버플로
  const stillLeft = [...leftoverSpecialists, ...flexPool].filter(
    (p) => !assigned.has(p.id),
  )
  placeOverflow(stillLeft, teams, assigned)

  refineSlottedBalance(teams)
  recalculateTotals(teams)

  return teams
}

function slotCount(team: Team, role: SlottedRole): number {
  return team.members.filter((m) => m.slottedRole === role).length
}

function needsSlot(team: Team, role: SlottedRole): boolean {
  return slotCount(team, role) < TEAM_COMPOSITION[role]
}

function addMember(team: Team, player: Player, slottedRole: SlottedRole): void {
  team.members.push({ player, slottedRole })
  team.totalMmr += playerRoleMmr(player, slottedRole)
}

function fillRoleSlots(
  role: SlottedRole,
  pool: Player[],
  teams: Team[],
  assigned: Set<string>,
): void {
  const sorted = [...pool].sort(
    (a, b) => playerRoleMmr(b, role) - playerRoleMmr(a, role),
  )

  for (const player of sorted) {
    if (assigned.has(player.id)) continue

    const candidates = teams.filter((t) => needsSlot(t, role))
    if (candidates.length === 0) break

    candidates.sort((a, b) => {
      const aRole = roleMmr(a, role)
      const bRole = roleMmr(b, role)
      if (aRole !== bRole) return aRole - bRole
      return a.totalMmr - b.totalMmr
    })

    addMember(candidates[0], player, role)
    assigned.add(player.id)
  }
}

function canFlexInto(player: Player, role: SlottedRole): boolean {
  // 플렉스 + 해당 역할 티어가 있으면 빈 슬롯 투입 가능
  if (isFlex(player) && hasExplicitRole(player, role)) return true
  // 구형: 무작위만(대표 티어)
  if (
    isFlex(player) &&
    !hasExplicitRole(player, 'tank') &&
    !hasExplicitRole(player, 'healer') &&
    !hasExplicitRole(player, 'dealer')
  ) {
    return true
  }
  return false
}

function listEmptySlots(teams: Team[]): { team: Team; role: SlottedRole }[] {
  const empties: { team: Team; role: SlottedRole }[] = []
  for (const role of SLOT_ORDER) {
    for (const team of teams) {
      const missing = TEAM_COMPOSITION[role] - slotCount(team, role)
      for (let i = 0; i < missing; i++) {
        empties.push({ team, role })
      }
    }
  }
  return empties
}

function fillEmptySlotsWithFlex(
  flexPlayers: Player[],
  teams: Team[],
  assigned: Set<string>,
): void {
  const empties = listEmptySlots(teams)
  // 슬롯별로 「그 역할 MMR이 낮은 팀」 빈자리부터 강한 플렉스로 채움
  const sortedEmpties = [...empties].sort((a, b) => {
    const roleCmp = SLOT_ORDER.indexOf(a.role) - SLOT_ORDER.indexOf(b.role)
    if (roleCmp !== 0) return roleCmp
    return roleMmr(a.team, a.role) - roleMmr(b.team, b.role)
  })

  for (const { team, role } of sortedEmpties) {
    if (!needsSlot(team, role)) continue

    const candidates = flexPlayers
      .filter((p) => !assigned.has(p.id) && canFlexInto(p, role))
      .sort((a, b) => playerRoleMmr(b, role) - playerRoleMmr(a, role))

    if (candidates.length === 0) continue

    // 팀에 넣었을 때 역할 균형이 좋아지는 쪽 우선: 일단 가장 강한 후보
    // (약한 팀에 강한 플렉스를 넣어 맞춤)
    const pick = candidates[0]
    addMember(team, pick, role)
    assigned.add(pick.id)
  }
}

function bestRoleForPlayer(player: Player, team: Team): SlottedRole {
  const deficitRoles = SLOT_ORDER.filter(
    (role) =>
      needsSlot(team, role) &&
      (hasExplicitRole(player, role) || canFlexInto(player, role)),
  )
  const anyRoles = SLOT_ORDER.filter(
    (role) => hasExplicitRole(player, role) || canFlexInto(player, role),
  )
  const pool = deficitRoles.length > 0 ? deficitRoles : anyRoles.length > 0 ? anyRoles : SLOT_ORDER
  return [...pool].sort(
    (a, b) => playerRoleMmr(player, b) - playerRoleMmr(player, a),
  )[0]
}

function placeOverflow(
  players: Player[],
  teams: Team[],
  assigned: Set<string>,
): void {
  const sorted = [...players].sort(
    (a, b) => playerOverallMmr(b) - playerOverallMmr(a),
  )

  for (const player of sorted) {
    if (assigned.has(player.id)) continue

    // 빈 슬롯 있는 팀 우선
    const withEmpty = teams
      .map((team) => ({
        team,
        emptyRoles: SLOT_ORDER.filter(
          (role) =>
            needsSlot(team, role) &&
            (hasExplicitRole(player, role) || canFlexInto(player, role)),
        ),
      }))
      .filter((x) => x.emptyRoles.length > 0)

    if (withEmpty.length > 0) {
      withEmpty.sort((a, b) => a.team.totalMmr - b.team.totalMmr)
      const target = withEmpty[0]
      const role = [...target.emptyRoles].sort(
        (a, b) => playerRoleMmr(player, b) - playerRoleMmr(player, a),
      )[0]
      addMember(target.team, player, role)
      assigned.add(player.id)
      continue
    }

    // 슬롯이 다 찬 경우: 인원 적은 팀에 오버플로
    const target = [...teams].sort((a, b) => {
      if (a.members.length !== b.members.length) {
        return a.members.length - b.members.length
      }
      return a.totalMmr - b.totalMmr
    })[0]

    const role = bestRoleForPlayer(player, target)
    addMember(target, player, role)
    assigned.add(player.id)
  }
}

function refineSlottedBalance(teams: Team[]): void {
  if (teams.length < 2) return

  const maxPasses = Math.min(80, Math.max(20, teams.length * 2))

  for (const role of SLOT_ORDER) {
    for (let pass = 0; pass < maxPasses; pass++) {
      const stats = teams.map((team) => ({
        team,
        mmr: roleMmr(team, role),
        indices: team.members
          .map((m, i) => (m.slottedRole === role ? i : -1))
          .filter((i) => i >= 0),
      }))

      const withMembers = stats.filter((s) => s.indices.length > 0)
      if (withMembers.length < 2) break

      withMembers.sort((a, b) => a.mmr - b.mmr)
      const weakest = withMembers[0]
      const strongest = withMembers[withMembers.length - 1]
      const gap = strongest.mmr - weakest.mmr
      if (gap <= 1) break

      let best: { si: number; wi: number; score: number } | null = null

      for (const si of strongest.indices) {
        for (const wi of weakest.indices) {
          const sMem = strongest.team.members[si]
          const wMem = weakest.team.members[wi]
          const sM = playerRoleMmr(sMem.player, role)
          const wM = playerRoleMmr(wMem.player, role)
          if (sM <= wM) continue

          const newStrong = strongest.mmr - sM + wM
          const newWeak = weakest.mmr - wM + sM
          const improvement = gap - Math.abs(newStrong - newWeak)
          if (improvement > 0 && (!best || improvement > best.score)) {
            best = { si, wi, score: improvement }
          }
        }
      }

      if (!best) break

      const sMem = strongest.team.members[best.si]
      const wMem = weakest.team.members[best.wi]
      strongest.team.members[best.si] = { ...wMem, slottedRole: role }
      weakest.team.members[best.wi] = { ...sMem, slottedRole: role }
    }
  }
}

function recalculateTotals(teams: Team[]): void {
  for (const team of teams) {
    team.totalMmr = team.members.reduce(
      (sum, m) => sum + playerRoleMmr(m.player, m.slottedRole),
      0,
    )
  }
}

export function roleMmr(team: Team, role: Position): number {
  if (role === 'random') return 0
  return team.members
    .filter((m) => m.slottedRole === role)
    .reduce((sum, m) => sum + playerRoleMmr(m.player, role), 0)
}

export function roleAverageMmr(team: Team, role: Position): number {
  if (role === 'random') return 0
  const count = rolePlayerCount(team, role)
  if (count === 0) return 0
  return roleMmr(team, role) / count
}

export function rolePlayerCount(team: Team, role: Position): number {
  if (role === 'random') return 0
  return team.members.filter((m) => m.slottedRole === role).length
}

export function averageMmr(team: Team): number {
  if (team.members.length === 0) return 0
  return team.totalMmr / team.members.length
}

export function compositionLabel(team: Team): string {
  const t = rolePlayerCount(team, 'tank')
  const d = rolePlayerCount(team, 'dealer')
  const h = rolePlayerCount(team, 'healer')
  return `탱 ${t} · 딜 ${d} · 힐 ${h}`
}

export function isFullRoster(team: Team): boolean {
  return SLOT_ORDER.every(
    (role) => rolePlayerCount(team, role) >= TEAM_COMPOSITION[role],
  )
}

/** UI/레거시 호환: members의 player 목록 */
export function teamPlayers(team: Team): Player[] {
  return team.members.map((m) => m.player)
}

export type { TeamMember }
