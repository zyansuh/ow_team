export type Position = 'tank' | 'healer' | 'dealer' | 'random'

export type SlottedRole = 'tank' | 'healer' | 'dealer'

/** 5:5 = 탱1·딜2·힐2 / 6:6 = 탱2·딜2·힐2 */
export type GameMode = '5v5' | '6v6'

export type RankName =
  | 'unranked'
  | 'bronze'
  | 'silver'
  | 'gold'
  | 'platinum'
  | 'diamond'
  | 'master'
  | 'grandmaster'
  | 'champion'

export type Division = 1 | 2 | 3 | 4 | 5

export interface Tier {
  rank: RankName
  division: Division
}

/** 포지션 하나 + 해당 포지션 티어 */
export interface RoleEntry {
  position: Position
  tier: Tier
}

export interface Player {
  id: string
  nickname: string
  /** 한 명이 여러 포지션·티어를 가질 수 있음 (최소 1개) */
  roles: RoleEntry[]
}

/** 팀에 배치된 인원 + 맡은 역할 (OW: 탱1 딜2 힐2) */
export interface TeamMember {
  player: Player
  slottedRole: SlottedRole
}

export interface Team {
  id: number
  name: string
  members: TeamMember[]
  totalMmr: number
}

export interface Match {
  id: string
  round: number
  teamA: number | null
  teamB: number | null
  winner: number | null
  label: string
  nextMatchId: string | null
  nextSlot: 'A' | 'B' | null
}
