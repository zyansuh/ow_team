import {
  formatTeamName,
  hasExplicitRole,
  isFlex,
  playerOverallMmr,
  playerRoleMmr,
} from '../constants'
import type {
  GameMode,
  Player,
  Position,
  SlottedRole,
  Team,
  TeamMember,
} from '../types'

export type { GameMode }

export const MODE_COMPOSITION: Record<
  GameMode,
  Record<SlottedRole, number>
> = {
  '5v5': { tank: 1, dealer: 2, healer: 2 },
  '6v6': { tank: 2, dealer: 2, healer: 2 },
}

export const SLOT_ORDER: SlottedRole[] = ['tank', 'healer', 'dealer']

const NON_TANK_ROLES: SlottedRole[] = ['dealer', 'healer']

/** balanceTeams 실행 중 현재 모드 구성 */
let activeComp = MODE_COMPOSITION['5v5']

export function getComposition(mode: GameMode) {
  return MODE_COMPOSITION[mode]
}

export function rosterSize(mode: GameMode): number {
  const c = MODE_COMPOSITION[mode]
  return c.tank + c.dealer + c.healer
}

export function modeDisplayName(mode: GameMode): string {
  return mode === '5v5' ? '5:5' : '6:6'
}

export function compositionSummary(mode: GameMode): string {
  const c = MODE_COMPOSITION[mode]
  return `탱커 ${c.tank} · 딜러 ${c.dealer} · 힐러 ${c.healer}`
}

/** 하위 호환: 기본 5:5 구성 */
export const TEAM_COMPOSITION = MODE_COMPOSITION['5v5']

/**
 * OW 구성으로 팀을 나눕니다.
 * 5:5 → 탱1·딜2·힐2 / 6:6 → 탱2·딜2·힐2
 */
export function balanceTeams(
  players: Player[],
  teamCount: number,
  mode: GameMode = '5v5',
): Team[] {
  activeComp = MODE_COMPOSITION[mode]
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

  for (const role of SLOT_ORDER) {
    const pool = specialists.filter(
      (p) => !assigned.has(p.id) && hasExplicitRole(p, role),
    )
    fillRoleSlots(role, pool, teams, assigned)
  }

  const leftoverSpecialists = specialists.filter((p) => !assigned.has(p.id))

  fillEmptySlotsWithFlex(flexPool, teams, assigned)

  const stillLeft = [...leftoverSpecialists, ...flexPool].filter(
    (p) => !assigned.has(p.id),
  )
  placeOverflow(stillLeft, teams, assigned)

  refineSlottedBalance(teams)
  recalculateTotals(teams)
  enforceTankCap(teams)

  return teams
}

function slotCount(team: Team, role: SlottedRole): number {
  return team.members.filter((m) => m.slottedRole === role).length
}

function needsSlot(team: Team, role: SlottedRole): boolean {
  return slotCount(team, role) < activeComp[role]
}

/** 탱커 자리 없거나 이미 1명이면 딜/힐만 선택 */
function pickNonTankRole(player: Player, team: Team): SlottedRole {
  const prefer = NON_TANK_ROLES.filter(
    (role) =>
      needsSlot(team, role) &&
      (hasExplicitRole(player, role) || canFlexInto(player, role)),
  )
  if (prefer.length > 0) {
    return [...prefer].sort(
      (a, b) => playerRoleMmr(player, b) - playerRoleMmr(player, a),
    )[0]
  }

  const open = NON_TANK_ROLES.filter((role) => needsSlot(team, role))
  if (open.length > 0) {
    return [...open].sort(
      (a, b) => playerRoleMmr(player, b) - playerRoleMmr(player, a),
    )[0]
  }

  return [...NON_TANK_ROLES].sort(
    (a, b) => playerRoleMmr(player, b) - playerRoleMmr(player, a),
  )[0]
}

function clampRole(team: Team, player: Player, role: SlottedRole): SlottedRole {
  if (role === 'tank' && slotCount(team, 'tank') >= activeComp.tank) {
    return pickNonTankRole(player, team)
  }
  return role
}

function addMember(team: Team, player: Player, slottedRole: SlottedRole): void {
  const role = clampRole(team, player, slottedRole)
  team.members.push({ player, slottedRole: role })
  team.totalMmr += playerRoleMmr(player, role)
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
  if (isFlex(player) && hasExplicitRole(player, role)) return true
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
      const missing = activeComp[role] - slotCount(team, role)
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

    addMember(team, candidates[0], role)
    assigned.add(candidates[0].id)
  }
}

function bestRoleForPlayer(player: Player, team: Team): SlottedRole {
  const deficitRoles = SLOT_ORDER.filter(
    (role) =>
      needsSlot(team, role) &&
      (hasExplicitRole(player, role) || canFlexInto(player, role)),
  )
  if (deficitRoles.length > 0) {
    return [...deficitRoles].sort(
      (a, b) => playerRoleMmr(player, b) - playerRoleMmr(player, a),
    )[0]
  }

  // 빈 슬롯 없음 → 탱커 추가 금지, 딜/힐만
  return pickNonTankRole(player, team)
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

/** 혹시라도 탱커가 2명 이상이면 초과분을 딜/힐로 강제 변경 */
function enforceTankCap(teams: Team[]): void {
  for (const team of teams) {
    const tanks = team.members.filter((m) => m.slottedRole === 'tank')
    if (tanks.length <= activeComp.tank) continue

    // MMR 높은 1명만 탱커 유지, 나머지 재배정
    const ranked = [...tanks].sort(
      (a, b) =>
        playerRoleMmr(b.player, 'tank') - playerRoleMmr(a.player, 'tank'),
    )
    for (const extra of ranked.slice(activeComp.tank)) {
      extra.slottedRole = pickNonTankRole(extra.player, {
        ...team,
        // 임시로 이 멤버를 탱이 아닌 것처럼 보고 빈 딜/힐 우선
        members: team.members.filter((m) => m !== extra),
      })
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

export function isFullRoster(team: Team, mode: GameMode = '5v5'): boolean {
  const comp = MODE_COMPOSITION[mode]
  return SLOT_ORDER.every(
    (role) => rolePlayerCount(team, role) >= comp[role],
  )
}

export function teamPlayers(team: Team): Player[] {
  return team.members.map((m) => m.player)
}

export type { TeamMember }
