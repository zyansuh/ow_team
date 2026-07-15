import { Trash2 } from 'lucide-react'
import {
  POSITION_COLORS,
  POSITION_LABELS,
  POSITION_ORDER,
  RANK_COLORS,
  formatTier,
  playerOverallMmr,
  primaryPosition,
} from '../constants'
import type { Player } from '../types'

interface PlayerListProps {
  players: Player[]
  onRemove: (id: string) => void
  onClear: () => void
}

export function PlayerList({ players, onRemove, onClear }: PlayerListProps) {
  if (players.length === 0) {
    return (
      <p className="py-6 text-center text-sm leading-relaxed text-ow-mist/55">
        아직 등록된 팀원이 없습니다. 위에서 닉네임과 포지션별 티어를 입력해 주세요.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium tracking-wide text-ow-mist/70">
          등록 {players.length}명
        </p>
        <button type="button" className="btn-ghost !min-h-9 !px-3 !text-xs" onClick={onClear}>
          전체 삭제
        </button>
      </div>

      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {players.map((player, i) => {
          const primary = primaryPosition(player)
          const roles = [...player.roles].sort(
            (a, b) =>
              POSITION_ORDER.indexOf(a.position) - POSITION_ORDER.indexOf(b.position),
          )

          return (
            <li
              key={player.id}
              className="animate-rise flex min-w-0 items-start gap-2.5 border border-white/8 bg-ow-slate/40 px-3 py-2.5 sm:gap-3"
              style={{ animationDelay: `${Math.min(i, 12) * 0.04}s` }}
            >
              <span
                className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center text-sm font-bold"
                style={{
                  background: `${POSITION_COLORS[primary]}22`,
                  color: POSITION_COLORS[primary],
                  border: `1px solid ${POSITION_COLORS[primary]}66`,
                }}
                title={roles.map((r) => POSITION_LABELS[r.position]).join(', ')}
              >
                {roles.length > 1 ? roles.length : POSITION_LABELS[primary][0]}
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <p className="truncate font-medium text-ow-cream">{player.nickname}</p>
                  <span className="hidden text-[11px] text-ow-mist/40 sm:inline">
                    평균 MMR {playerOverallMmr(player).toFixed(1)}
                  </span>
                </div>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {roles.map((role) => (
                    <span
                      key={role.position}
                      className="tier-chip"
                      style={{
                        borderColor: RANK_COLORS[role.tier.rank],
                        color: POSITION_COLORS[role.position],
                      }}
                      title={`${POSITION_LABELS[role.position]} ${formatTier(role.tier)}`}
                    >
                      <span className="opacity-80">{POSITION_LABELS[role.position]}</span>
                      <span
                        className="ml-1"
                        style={{ color: RANK_COLORS[role.tier.rank] }}
                      >
                        {formatTier(role.tier)}
                      </span>
                    </span>
                  ))}
                </div>
              </div>

              <button
                type="button"
                aria-label={`${player.nickname} 삭제`}
                className="flex h-10 w-10 shrink-0 items-center justify-center text-ow-mist/45 transition hover:text-red-400"
                onClick={() => onRemove(player.id)}
              >
                <Trash2 size={16} />
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
