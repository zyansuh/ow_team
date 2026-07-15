export type Position = 'tank' | 'healer' | 'dealer' | 'random'

export type RankName =
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

export interface Player {
  id: string
  nickname: string
  position: Position
  tier: Tier
}

export interface Team {
  id: number
  name: string
  players: Player[]
  totalMmr: number
}

export interface Match {
  id: string
  round: number
  teamA: number | null
  teamB: number | null
  winner: number | null
  label: string
}
