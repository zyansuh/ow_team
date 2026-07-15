import type { Division, Position, RankName, Tier } from './types'

export const RANK_ORDER: RankName[] = [
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
  bronze: '#b87333',
  silver: '#9ca3af',
  gold: '#eab308',
  platinum: '#67e8f9',
  diamond: '#38bdf8',
  master: '#fbbf24',
  grandmaster: '#f97316',
  champion: '#f43f5e',
}

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

export function formatTeamName(index: number): string {
  return `${index + 1}팀`
}

/** 브론즈5(최저) → 챔피언1(최고). 디비전은 5가 낮고 1이 높음 */
export function tierToMmr(tier: Tier): number {
  const rankIndex = RANK_ORDER.indexOf(tier.rank)
  const divisionScore = 6 - tier.division
  return rankIndex * 5 + divisionScore
}

export function formatTier(tier: Tier): string {
  return `${RANK_LABELS[tier.rank]} ${tier.division}`
}

export function createId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}
