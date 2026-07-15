import { Trash2 } from 'lucide-react'
import {
  POSITION_COLORS,
  POSITION_LABELS,
  RANK_COLORS,
  formatTier,
  tierToMmr,
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
      <p className="text-sm text-ow-mist/55 py-6 text-center">
        아직 등록된 팀원이 없습니다. 위에서 닉네임·포지션·티어를 입력해 주세요.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="font-display text-sm uppercase tracking-widest text-ow-mist/70">
          등록 {players.length}명
        </p>
        <button type="button" className="btn-ghost !text-xs" onClick={onClear}>
          전체 삭제
        </button>
      </div>

      <ul className="grid gap-2 sm:grid-cols-2">
        {players.map((player, i) => (
          <li
            key={player.id}
            className="animate-rise flex items-center gap-3 border border-white/8 bg-ow-slate/40 px-3 py-2.5"
            style={{ animationDelay: `${Math.min(i, 12) * 0.04}s` }}
          >
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center font-display text-sm font-bold"
              style={{
                background: `${POSITION_COLORS[player.position]}22`,
                color: POSITION_COLORS[player.position],
                border: `1px solid ${POSITION_COLORS[player.position]}66`,
              }}
              title={POSITION_LABELS[player.position]}
            >
              {POSITION_LABELS[player.position][0]}
            </span>

            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-ow-cream">{player.nickname}</p>
              <div className="mt-0.5 flex flex-wrap items-center gap-2">
                <span
                  className="text-xs"
                  style={{ color: POSITION_COLORS[player.position] }}
                >
                  {POSITION_LABELS[player.position]}
                </span>
                <span
                  className="tier-chip"
                  style={{ borderColor: RANK_COLORS[player.tier.rank], color: RANK_COLORS[player.tier.rank] }}
                >
                  {formatTier(player.tier)}
                </span>
                <span className="text-[11px] text-ow-mist/40">MMR {tierToMmr(player.tier)}</span>
              </div>
            </div>

            <button
              type="button"
              aria-label={`${player.nickname} 삭제`}
              className="shrink-0 p-1.5 text-ow-mist/45 transition hover:text-red-400"
              onClick={() => onRemove(player.id)}
            >
              <Trash2 size={16} />
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
