import {
  formatTeamName,
  hasExplicitRole,
  isFlex,
  playerOverallMmr,
  playerRoleMmr,
  specificRoles,
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

  // 정원 먼저 맞춘 뒤 MMR 미세 조정 → 다시 한 번 탱 캡 확인
  enforceTankCap(teams)
  refineSlottedBalance(teams)
  enforceTankCap(teams)
  recalculateTotals(teams)

  return teams
}

function slotCount(team: Team, role: SlottedRole): number {
  return team.members.filter((m) => m.slottedRole === role).length
}

function needsSlot(team: Team, role: SlottedRole): boolean {
  return slotCount(team, role) < activeComp[role]
}

function explicitSlottedRoles(player: Player): SlottedRole[] {
  return specificRoles(player)
    .map((r) => r.position)
    .filter((p): p is SlottedRole => p !== 'random')
}

/** 전담은 명시 포지션만, 플렉스는 canFlexInto 규칙 */
function canAssignRole(player: Player, role: SlottedRole): boolean {
  if (hasExplicitRole(player, role)) return true
  return isFlex(player) && canFlexInto(player, role)
}

function pickAssignableRole(
  player: Player,
  team: Team,
  candidates: SlottedRole[],
): SlottedRole | null {
  const allowed = candidates.filter(
    (role) => needsSlot(team, role) && canAssignRole(player, role),
  )
  if (allowed.length === 0) return null
  return [...allowed].sort(
    (a, b) => playerRoleMmr(player, b) - playerRoleMmr(player, a),
  )[0]
}

function soleExplicitRole(player: Player): SlottedRole | null {
  const roles = explicitSlottedRoles(player)
  return roles.length === 1 ? roles[0] : null
}

/** 딜/힐로 배정 가능한지 */
function canPlayNonTank(player: Player): boolean {
  return NON_TANK_ROLES.some((role) => canAssignRole(player, role))
}

/** 해당 역할만 명시한 전담 */
function isSoleForRole(player: Player, role: SlottedRole): boolean {
  return soleExplicitRole(player) === role
}

/** 탱 정원 초과 시 대체 — 명시한 딜/힐만, 없으면 null */
function pickNonTankRole(player: Player, team: Team): SlottedRole | null {
  return pickAssignableRole(player, team, NON_TANK_ROLES)
}

function clampRole(team: Team, player: Player, role: SlottedRole): SlottedRole {
  if (!canAssignRole(player, role)) {
    const alt = pickAssignableRole(player, team, SLOT_ORDER)
    if (alt) return alt
    return soleExplicitRole(player) ?? role
  }

  if (role === 'tank' && slotCount(team, 'tank') >= activeComp.tank) {
    const alt = pickNonTankRole(player, team)
    if (alt) return alt
    // 탱 전담만 선택한 경우 딜/힐로 강제 전환하지 않음
    if (soleExplicitRole(player) === 'tank') return 'tank'
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
  // 전담(sole)을 먼저 채워 멀티포지션이 다른 슬롯에 남도록 함
  const sorted = [...pool].sort((a, b) => {
    const aSole = isSoleForRole(a, role) ? 1 : 0
    const bSole = isSoleForRole(b, role) ? 1 : 0
    if (aSole !== bSole) return bSole - aSole
    return playerRoleMmr(b, role) - playerRoleMmr(a, role)
  })

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
    (role) => needsSlot(team, role) && canAssignRole(player, role),
  )
  if (deficitRoles.length > 0) {
    return [...deficitRoles].sort(
      (a, b) => playerRoleMmr(player, b) - playerRoleMmr(player, a),
    )[0]
  }

  const sole = soleExplicitRole(player)
  if (sole) return sole

  const nonTank = pickNonTankRole(player, team)
  if (nonTank) return nonTank

  return explicitSlottedRoles(player)[0] ?? 'dealer'
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
          (role) => needsSlot(team, role) && canAssignRole(player, role),
        ),
      }))
      .filter((x) => x.emptyRoles.length > 0)

    if (withEmpty.length > 0) {
      withEmpty.sort((a, b) => a.team.totalMmr - b.team.totalMmr)
      const target = withEmpty[0]
      // 탱 정원 가득이면 멀티포지션은 딜/힐 빈칸 우선
      const roles = [...target.emptyRoles].sort((a, b) => {
        const tankFull = !needsSlot(target.team, 'tank')
        if (tankFull && a === 'tank' && b !== 'tank') return 1
        if (tankFull && b === 'tank' && a !== 'tank') return -1
        return playerRoleMmr(player, b) - playerRoleMmr(player, a)
      })
      addMember(target.team, player, roles[0])
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

/**
 * 탱커 정원 초과 시:
 * - 딜/힐도 가능한 멀티포지션을 먼저 다른 역할로 이동
 * - 탱 전담은 다른 팀의 빈 탱 슬롯으로 이동
 * - 그래도 불가하면 전담은 오버플로 탱으로 유지
 */
function enforceTankCap(teams: Team[]): void {
  for (const team of teams) {
    while (slotCount(team, 'tank') > activeComp.tank) {
      const tanks = team.members.filter((m) => m.slottedRole === 'tank')

      // 옮기기 쉬운 순: 딜/힐 가능 > 탱 전담 아님 > 탱 MMR 낮음
      const movable = [...tanks].sort((a, b) => {
        const aMove = canPlayNonTank(a.player) ? 1 : 0
        const bMove = canPlayNonTank(b.player) ? 1 : 0
        if (aMove !== bMove) return bMove - aMove

        const aSole = isSoleForRole(a.player, 'tank') ? 1 : 0
        const bSole = isSoleForRole(b.player, 'tank') ? 1 : 0
        if (aSole !== bSole) return aSole - bSole

        return (
          playerRoleMmr(a.player, 'tank') - playerRoleMmr(b.player, 'tank')
        )
      })

      let fixed = false
      for (const candidate of movable) {
        const viewTeam: Team = {
          ...team,
          members: team.members.filter((m) => m !== candidate),
        }
        const altRole = pickNonTankRole(candidate.player, viewTeam)
        if (altRole) {
          candidate.slottedRole = altRole
          fixed = true
          break
        }

        const altTeam = teams.find(
          (t) => t !== team && needsSlot(t, 'tank'),
        )
        if (altTeam && isSoleForRole(candidate.player, 'tank')) {
          team.members = team.members.filter((m) => m !== candidate)
          altTeam.members.push(candidate)
          fixed = true
          break
        }
      }

      if (!fixed) break
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
