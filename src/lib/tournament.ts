import type { Match, Team } from '../types'

/** 2~4팀 싱글 엘리미네이션 브래킷 생성 */
export function createBracket(teams: Team[]): Match[] {
  const n = teams.length
  if (n < 2) return []

  if (n === 2) {
    return [
      {
        id: 'final',
        round: 1,
        teamA: teams[0].id,
        teamB: teams[1].id,
        winner: null,
        label: '결승',
      },
    ]
  }

  if (n === 3) {
    return [
      {
        id: 'semi',
        round: 1,
        teamA: teams[0].id,
        teamB: teams[1].id,
        winner: null,
        label: '준결승',
      },
      {
        id: 'final',
        round: 2,
        teamA: teams[2].id,
        teamB: null,
        winner: null,
        label: '결승',
      },
    ]
  }

  // 4팀
  return [
    {
      id: 'semi-1',
      round: 1,
      teamA: teams[0].id,
      teamB: teams[1].id,
      winner: null,
      label: '준결승 A',
    },
    {
      id: 'semi-2',
      round: 1,
      teamA: teams[2].id,
      teamB: teams[3].id,
      winner: null,
      label: '준결승 B',
    },
    {
      id: 'final',
      round: 2,
      teamA: null,
      teamB: null,
      winner: null,
      label: '결승',
    },
  ]
}

export function setMatchWinner(
  matches: Match[],
  matchId: string,
  winnerId: number,
): Match[] {
  const next = matches.map((m) => ({ ...m }))
  const match = next.find((m) => m.id === matchId)
  if (!match) return matches
  if (match.teamA === null || match.teamB === null) return matches
  if (winnerId !== match.teamA && winnerId !== match.teamB) return matches

  match.winner = winnerId

  // 준결승 승자를 결승에 배치
  if (matchId === 'semi') {
    const final = next.find((m) => m.id === 'final')
    if (final) final.teamB = winnerId
  }

  if (matchId === 'semi-1') {
    const final = next.find((m) => m.id === 'final')
    if (final) final.teamA = winnerId
  }

  if (matchId === 'semi-2') {
    const final = next.find((m) => m.id === 'final')
    if (final) final.teamB = winnerId
  }

  // 상위 매치 승자 변경 시 결승 승자 초기화
  if (matchId.startsWith('semi')) {
    const final = next.find((m) => m.id === 'final')
    if (final) final.winner = null
  }

  return next
}
