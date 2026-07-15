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

  // 정원 → 역할 균형 → 팀 총점/평균 균등화 → 탱 캡 재확인
  enforceTankCap(teams)
  refineSlottedBalance(teams)
  refineTeamScoreBalance(teams)
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
      // 총점이 낮은 팀에 고티어를 우선 배분해 팀 점수 균등화
      if (a.totalMmr !== b.totalMmr) return a.totalMmr - b.totalMmr
      const aRole = roleMmr(a, role)
      const bRole = roleMmr(b, role)
      if (aRole !== bRole) return aRole - bRole
      return a.members.length - b.members.length
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
  // 총점 낮은 팀의 빈 슬롯부터, 고티어 플렉스 투입
  const sortedEmpties = [...empties].sort((a, b) => {
    if (a.team.totalMmr !== b.team.totalMmr) {
      return a.team.totalMmr - b.team.totalMmr
    }
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

  const maxPasses = Math.min(120, Math.max(40, teams.length * 4))

  for (const role of SLOT_ORDER) {
    for (let pass = 0; pass < maxPasses; pass++) {
      recalculateTotals(teams)

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
      const roleGap = strongest.mmr - weakest.mmr
      const totalGap = Math.abs(strongest.team.totalMmr - weakest.team.totalMmr)
      if (roleGap <= 0.5 && totalGap <= 1) break

      let best: {
        si: number
        wi: number
        score: number
      } | null = null

      for (const si of strongest.indices) {
        for (const wi of weakest.indices) {
          const sMem = strongest.team.members[si]
          const wMem = weakest.team.members[wi]
          const sM = playerRoleMmr(sMem.player, role)
          const wM = playerRoleMmr(wMem.player, role)
          if (sM === wM) continue

          const newStrongRole = strongest.mmr - sM + wM
          const newWeakRole = weakest.mmr - wM + sM
          const newStrongTotal = strongest.team.totalMmr - sM + wM
          const newWeakTotal = weakest.team.totalMmr - wM + sM

          const roleImprove =
            roleGap - Math.abs(newStrongRole - newWeakRole)
          const totalImprove =
            Math.abs(strongest.team.totalMmr - weakest.team.totalMmr) -
            Math.abs(newStrongTotal - newWeakTotal)

          // 역할 균형 + 팀 총점 균형을 함께 점수화
          const score = roleImprove * 1.2 + totalImprove * 1.8
          if (score > 0.05 && (!best || score > best.score)) {
            best = { si, wi, score }
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
 * 같은 배정 역할끼리(가능하면 교차 역할도) 팀 간 스왑해
 * 평균 MMR 편차를 최소화. (역할 정원·탱 캡 유지)
 */
function refineTeamScoreBalance(teams: Team[]): void {
  if (teams.length < 2) return

  recalculateTotals(teams)
  const maxPasses = Math.min(180, Math.max(50, teams.length * 6))

  for (let pass = 0; pass < maxPasses; pass++) {
    recalculateTotals(teams)
    const before = teamBalanceCost(teams)

    // 편차가 큰 팀 쌍을 우선 검사 (전수 + 강 vs 약)
    const ranked = [...teams]
      .map((team, index) => ({
        index,
        team,
        avg: team.members.length > 0 ? team.totalMmr / team.members.length : 0,
      }))
      .sort((a, b) => a.avg - b.avg)

    const pairKeys = new Set<string>()
    const pairs: [number, number][] = []

    function addPair(i: number, j: number) {
      if (i === j) return
      const a = Math.min(i, j)
      const b = Math.max(i, j)
      const key = `${a}:${b}`
      if (pairKeys.has(key)) return
      pairKeys.add(key)
      pairs.push([a, b])
    }

    // 최약 vs 최강, 차악 vs 차강 …
    for (let k = 0; k < Math.min(4, Math.floor(ranked.length / 2)); k++) {
      addPair(ranked[k].index, ranked[ranked.length - 1 - k].index)
    }
    // 팀 수가 적으면 전수 쌍
    if (teams.length <= 6) {
      for (let i = 0; i < teams.length; i++) {
        for (let j = i + 1; j < teams.length; j++) addPair(i, j)
      }
    } else {
      // 이웃 순위끼리도 약간
      for (let i = 0; i < ranked.length - 1; i++) {
        addPair(ranked[i].index, ranked[i + 1].index)
      }
    }

    let best: {
      ta: number
      tb: number
      ia: number
      ib: number
      cost: number
    } | null = null

    for (const [ta, tb] of pairs) {
      const teamA = teams[ta]
      const teamB = teams[tb]

      for (let ia = 0; ia < teamA.members.length; ia++) {
        for (let ib = 0; ib < teamB.members.length; ib++) {
          const a = teamA.members[ia]
          const b = teamB.members[ib]
          const sameRole = a.slottedRole === b.slottedRole

          if (!sameRole) {
            if (!canAssignRole(a.player, b.slottedRole)) continue
            if (!canAssignRole(b.player, a.slottedRole)) continue
            if (!crossSwapKeepsTankCap(teamA, teamB, ia, ib)) continue
          }

          const aRole = a.slottedRole
          const bRole = b.slottedRole
          const aM = playerRoleMmr(a.player, aRole)
          const bM = playerRoleMmr(b.player, bRole)
          // 같은 역할이면 MMR 같을 때 스킵, 교차면 슬롯 유지 시 기여도 차이 확인
          if (sameRole && aM === bM) continue

          const playerA = a.player
          const playerB = b.player

          teamA.members[ia] = { player: playerB, slottedRole: aRole }
          teamB.members[ib] = { player: playerA, slottedRole: bRole }
          recalculateTotals(teams)
          const cost = teamBalanceCost(teams)
          teamA.members[ia] = { player: playerA, slottedRole: aRole }
          teamB.members[ib] = { player: playerB, slottedRole: bRole }

          if (cost + 0.01 < before && (!best || cost < best.cost)) {
            best = { ta, tb, ia, ib, cost }
          }
        }
      }
    }

    recalculateTotals(teams)
    if (!best) break

    const teamA = teams[best.ta]
    const teamB = teams[best.tb]
    const a = teamA.members[best.ia]
    const b = teamB.members[best.ib]
    const aRole = a.slottedRole
    const bRole = b.slottedRole
    const playerA = a.player
    const playerB = b.player
    teamA.members[best.ia] = { player: playerB, slottedRole: aRole }
    teamB.members[best.ib] = { player: playerA, slottedRole: bRole }
  }

  recalculateTotals(teams)
}

function crossSwapKeepsTankCap(
  teamA: Team,
  teamB: Team,
  ia: number,
  ib: number,
): boolean {
  const a = teamA.members[ia]
  const b = teamB.members[ib]

  const simA = teamA.members.map((m, i) =>
    i === ia ? { ...m, player: b.player, slottedRole: a.slottedRole } : m,
  )
  const simB = teamB.members.map((m, i) =>
    i === ib ? { ...m, player: a.player, slottedRole: b.slottedRole } : m,
  )

  const tanksA = simA.filter((m) => m.slottedRole === 'tank').length
  const tanksB = simB.filter((m) => m.slottedRole === 'tank').length
  return tanksA <= activeComp.tank && tanksB <= activeComp.tank
}

/** 낮을수록 균형. 평균 MMR 편차 + 역할별 편차 */
function teamBalanceCost(teams: Team[]): number {
  const avgs = teams
    .filter((t) => t.members.length > 0)
    .map((t) => t.totalMmr / t.members.length)
  if (avgs.length < 2) return 0

  const mean = avgs.reduce((s, v) => s + v, 0) / avgs.length
  let avgVar = 0
  for (const v of avgs) avgVar += (v - mean) ** 2

  const maxAvg = Math.max(...avgs)
  const minAvg = Math.min(...avgs)
  const avgRange = maxAvg - minAvg

  let roleCost = 0
  for (const role of SLOT_ORDER) {
    const roleAvgs = teams
      .map((t) => {
        const n = rolePlayerCount(t, role)
        return n > 0 ? roleMmr(t, role) / n : null
      })
      .filter((v): v is number => v !== null)
    if (roleAvgs.length < 2) continue
    const rMean = roleAvgs.reduce((s, v) => s + v, 0) / roleAvgs.length
    for (const v of roleAvgs) roleCost += (v - rMean) ** 2
    roleCost += (Math.max(...roleAvgs) - Math.min(...roleAvgs)) * 0.5
  }

  // 인원 수 편차도 약간 패널티
  const sizes = teams.map((t) => t.members.length)
  const sizeMean = sizes.reduce((s, v) => s + v, 0) / sizes.length
  let sizeCost = 0
  for (const s of sizes) sizeCost += (s - sizeMean) ** 2

  return avgVar * 4 + avgRange * 6 + roleCost * 1.2 + sizeCost * 0.4
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
