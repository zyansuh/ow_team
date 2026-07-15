import type { Division, Player, Position, RankName, RoleEntry, Tier } from './types'

export const RANK_ORDER: RankName[] = [
  'unranked',
  'bronze',
  'silver',
  'gold',
  'platinum',
  'diamond',
  'master',
  'grandmaster',
  'champion',
]

export const RANK_LABELS: Record<RankName, string> = {
  unranked: '미배치/언랭',
  bronze: '브론즈',
  silver: '실버',
  gold: '골드',
  platinum: '플래티넘',
  diamond: '다이아',
  master: '마스터',
  grandmaster: '그랜드마스터',
  champion: '챔피언',
}

export const RANK_COLORS: Record<RankName, string> = {
  unranked: '#6b7280',
  bronze: '#b87333',
  silver: '#9ca3af',
  gold: '#eab308',
  platinum: '#67e8f9',
  diamond: '#38bdf8',
  master: '#fbbf24',
  grandmaster: '#f97316',
  champion: '#f43f5e',
}

export const POSITION_ORDER: Position[] = ['tank', 'healer', 'dealer', 'random']

export const POSITION_LABELS: Record<Position, string> = {
  tank: '탱커',
  healer: '힐러',
  dealer: '딜러',
  random: '무작위',
}

export const POSITION_COLORS: Record<Position, string> = {
  tank: '#3b82f6',
  healer: '#22c55e',
  dealer: '#ef4444',
  random: '#a78bfa',
}

export const DIVISIONS: Division[] = [5, 4, 3, 2, 1]

export const DEFAULT_TIER: Tier = { rank: 'gold', division: 3 }

export function formatTeamName(index: number): string {
  return `${index + 1}팀`
}

/** 미배치/언랭(최저) → 브론즈5 → … → 챔피언1(최고). 디비전은 5가 낮고 1이 높음 */
export function tierToMmr(tier: Tier): number {
  if (tier.rank === 'unranked') return 0
  const rankIndex = RANK_ORDER.indexOf(tier.rank) - 1 // bronze = 0
  const divisionScore = 6 - tier.division
  return rankIndex * 5 + divisionScore
}

export function formatTier(tier: Tier): string {
  if (tier.rank === 'unranked') return RANK_LABELS.unranked
  return `${RANK_LABELS[tier.rank]} ${tier.division}`
}

export function isUnranked(rank: RankName): boolean {
  return rank === 'unranked'
}

export function createId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function hasRole(player: Player, position: Position): boolean {
  return player.roles.some((r) => r.position === position)
}

export function getRoleEntry(player: Player, position: Position): RoleEntry | undefined {
  return player.roles.find((r) => r.position === position)
}

/** 해당 포지션 티어 MMR. 없으면 0 */
export function playerRoleMmr(player: Player, position: Position): number {
  const entry = getRoleEntry(player, position)
  return entry ? tierToMmr(entry.tier) : 0
}

/** 팀원 전체 강도: 보유 포지션 MMR 평균 */
export function playerOverallMmr(player: Player): number {
  if (player.roles.length === 0) return 0
  const sum = player.roles.reduce((acc, r) => acc + tierToMmr(r.tier), 0)
  return sum / player.roles.length
}

export function primaryPosition(player: Player): Position {
  const ordered = [...player.roles].sort(
    (a, b) => POSITION_ORDER.indexOf(a.position) - POSITION_ORDER.indexOf(b.position),
  )
  return ordered[0]?.position ?? 'random'
}

/** localStorage 구버전(position+tier) → roles 마이그레이션 */
export function normalizePlayer(raw: unknown): Player | null {
  if (!raw || typeof raw !== 'object') return null
  const data = raw as Record<string, unknown>
  if (typeof data.id !== 'string' || typeof data.nickname !== 'string') return null

  if (Array.isArray(data.roles) && data.roles.length > 0) {
    const roles = data.roles
      .map((r) => normalizeRoleEntry(r))
      .filter((r): r is RoleEntry => r !== null)
    if (roles.length === 0) return null
    return { id: data.id, nickname: data.nickname, roles }
  }

  // 구형: { position, tier }
  const position = data.position as Position | undefined
  const tier = data.tier as Tier | undefined
  if (
    position &&
    POSITION_ORDER.includes(position) &&
    tier &&
    typeof tier === 'object' &&
    'rank' in tier &&
    'division' in tier
  ) {
    return {
      id: data.id,
      nickname: data.nickname,
      roles: [{ position, tier }],
    }
  }

  return null
}

function normalizeRoleEntry(raw: unknown): RoleEntry | null {
  if (!raw || typeof raw !== 'object') return null
  const data = raw as Record<string, unknown>
  const position = data.position as Position | undefined
  const tier = data.tier as Tier | undefined
  if (!position || !POSITION_ORDER.includes(position)) return null
  if (!tier || typeof tier !== 'object' || !('rank' in tier) || !('division' in tier)) {
    return null
  }
  return { position, tier }
}
