import type { Match, Team } from '../types'

function nextPowerOfTwo(n: number): number {
  let p = 1
  while (p < n) p *= 2
  return p
}

function matchLabel(fromEnd: number, matchIndex: number, matchesInRound: number): string {
  if (fromEnd === 0) return '결승'
  if (fromEnd === 1) {
    return matchesInRound === 1 ? '준결승' : `준결승 ${matchIndex + 1}`
  }
  if (fromEnd === 2) return `8강 ${matchIndex + 1}`
  const bracketSize = 2 ** (fromEnd + 1)
  return `${bracketSize}강 ${matchIndex + 1}`
}

/**
 * N팀 싱글 엘리미네이션 브래킷.
 * 팀 수가 2의 거듭제곱이 아니면 부전승(BYE)으로 맞춥니다.
 */
export function createBracket(teams: Team[]): Match[] {
  const n = teams.length
  if (n < 2) return []

  const size = nextPowerOfTwo(n)
  const totalRounds = Math.log2(size)
  const matches: Match[] = []

  // 라운드별 매치 골격 생성 (1=첫 라운드 ... totalRounds=결승)
  const byRound: Match[][] = []
  for (let round = 1; round <= totalRounds; round++) {
    const fromEnd = totalRounds - round
    const matchesInRound = size / 2 ** round
    const roundMatches: Match[] = []

    for (let i = 0; i < matchesInRound; i++) {
      const match: Match = {
        id: `r${round}-m${i}`,
        round,
        teamA: null,
        teamB: null,
        winner: null,
        label: matchLabel(fromEnd, i, matchesInRound),
        nextMatchId: null,
        nextSlot: null,
      }
      roundMatches.push(match)
      matches.push(match)
    }
    byRound.push(roundMatches)
  }

  // 승자 경로 연결
  for (let r = 0; r < byRound.length - 1; r++) {
    for (let i = 0; i < byRound[r].length; i++) {
      const next = byRound[r + 1][Math.floor(i / 2)]
      byRound[r][i].nextMatchId = next.id
      byRound[r][i].nextSlot = i % 2 === 0 ? 'A' : 'B'
    }
  }

  // 첫 라운드 시드: 팀은 순서대로, 빈 자리는 부전승
  const slots: (number | null)[] = Array.from({ length: size }, (_, i) =>
    i < n ? teams[i].id : null,
  )

  const firstRound = byRound[0]
  for (let i = 0; i < firstRound.length; i++) {
    firstRound[i].teamA = slots[i * 2]
    firstRound[i].teamB = slots[i * 2 + 1]
  }

  // 부전승 자동 진출
  resolveByes(matches)

  return matches
}

function resolveByes(matches: Match[]): void {
  let changed = true
  while (changed) {
    changed = false
    for (const match of matches) {
      if (match.winner !== null) continue

      const a = match.teamA
      const b = match.teamB

      // 한쪽만 있으면 부전승
      if (a !== null && b === null) {
        advanceWinner(matches, match, a)
        changed = true
      } else if (b !== null && a === null) {
        advanceWinner(matches, match, b)
        changed = true
      }
    }
  }
}

function advanceWinner(matches: Match[], match: Match, winnerId: number): void {
  match.winner = winnerId
  if (!match.nextMatchId || !match.nextSlot) return

  const next = matches.find((m) => m.id === match.nextMatchId)
  if (!next) return

  if (match.nextSlot === 'A') next.teamA = winnerId
  else next.teamB = winnerId
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

  // 이전 승자가 있으면 하위 매치에서 걷어내기
  if (match.winner !== null && match.winner !== winnerId) {
    clearDownstream(next, match, match.winner)
  }

  advanceWinner(next, match, winnerId)
  return next
}

/** 승자 변경 시 이후 라운드에 남은 이전 승자 흔적을 제거 */
function clearDownstream(matches: Match[], from: Match, oldWinner: number): void {
  if (!from.nextMatchId || !from.nextSlot) return

  const next = matches.find((m) => m.id === from.nextMatchId)
  if (!next) return

  const slotTeam = from.nextSlot === 'A' ? next.teamA : next.teamB
  if (slotTeam !== oldWinner) return

  if (from.nextSlot === 'A') next.teamA = null
  else next.teamB = null

  if (next.winner === oldWinner) {
    const prevWinner = next.winner
    next.winner = null
    clearDownstream(matches, next, prevWinner)
  } else if (next.winner !== null) {
    // 슬롯만 비웠는데 다른 팀이 이미 우승 처리된 경우 무효화
    const prevWinner = next.winner
    next.winner = null
    clearDownstream(matches, next, prevWinner)
  }
}

export function findChampionMatch(matches: Match[]): Match | undefined {
  return matches.find((m) => m.nextMatchId === null && m.winner !== null)
}
