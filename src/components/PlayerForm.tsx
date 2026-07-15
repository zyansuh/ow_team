import type { FormEvent } from 'react'
import { useState } from 'react'
import { Plus } from 'lucide-react'
import {
  DEFAULT_TIER,
  DIVISIONS,
  POSITION_COLORS,
  POSITION_LABELS,
  POSITION_ORDER,
  RANK_LABELS,
  RANK_ORDER,
  createId,
} from '../constants'
import type { Division, Player, Position, RankName, RoleEntry, Tier } from '../types'

interface PlayerFormProps {
  onAdd: (player: Player) => void
}

type RoleDraft = Record<Position, { enabled: boolean; tier: Tier }>

function emptyDraft(): RoleDraft {
  return {
    tank: { enabled: false, tier: { ...DEFAULT_TIER } },
    healer: { enabled: false, tier: { ...DEFAULT_TIER } },
    dealer: { enabled: false, tier: { ...DEFAULT_TIER } },
    random: { enabled: true, tier: { ...DEFAULT_TIER } },
  }
}

export function PlayerForm({ onAdd }: PlayerFormProps) {
  const [nickname, setNickname] = useState('')
  const [draft, setDraft] = useState<RoleDraft>(emptyDraft)
  const [error, setError] = useState('')

  function togglePosition(position: Position) {
    setDraft((prev) => ({
      ...prev,
      [position]: { ...prev[position], enabled: !prev[position].enabled },
    }))
    setError('')
  }

  function setRoleRank(position: Position, rank: RankName) {
    setDraft((prev) => ({
      ...prev,
      [position]: {
        ...prev[position],
        tier: {
          rank,
          // 미배치/언랭은 디비전 개념 없음 → 고정
          division: rank === 'unranked' ? 5 : prev[position].tier.division,
        },
      },
    }))
  }

  function setRoleDivision(position: Position, division: Division) {
    setDraft((prev) => ({
      ...prev,
      [position]: {
        ...prev[position],
        tier: { ...prev[position].tier, division },
      },
    }))
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const name = nickname.trim()
    if (!name) return

    const roles: RoleEntry[] = POSITION_ORDER.filter((p) => draft[p].enabled).map(
      (p) => ({
        position: p,
        tier: { ...draft[p].tier },
      }),
    )

    if (roles.length === 0) {
      setError('포지션을 하나 이상 선택해 주세요.')
      return
    }

    onAdd({
      id: createId(),
      nickname: name,
      roles,
    })
    setNickname('')
    setDraft(emptyDraft())
    setError('')
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <label className="block space-y-1.5">
        <span className="text-xs font-medium tracking-wide text-ow-mist/70">닉네임</span>
        <input
          className="input-field clip-angle"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="배틀태그 / 닉네임"
          maxLength={24}
          autoComplete="off"
          required
        />
      </label>

      <div className="space-y-2">
        <p className="text-xs font-medium tracking-wide text-ow-mist/70">
          포지션 (여러 개 선택 가능 · 포지션마다 티어 따로)
        </p>
        <div className="flex flex-wrap gap-2">
          {POSITION_ORDER.map((position) => {
            const on = draft[position].enabled
            const color = POSITION_COLORS[position]
            return (
              <button
                key={position}
                type="button"
                onClick={() => togglePosition(position)}
                className="min-h-10 px-3 py-2 text-sm font-semibold transition clip-btn"
                style={{
                  background: on ? `${color}28` : 'rgba(15,23,36,0.55)',
                  color: on ? color : 'rgba(197,208,222,0.55)',
                  border: `1px solid ${on ? `${color}88` : 'rgba(197,208,222,0.18)'}`,
                }}
              >
                {POSITION_LABELS[position]}
              </button>
            )
          })}
        </div>
      </div>

      <div className="space-y-3">
        {POSITION_ORDER.filter((p) => draft[p].enabled).map((position) => (
          <div
            key={position}
            className="border border-white/10 bg-ow-slate/35 p-3 clip-angle sm:p-4"
            style={{ borderLeft: `3px solid ${POSITION_COLORS[position]}` }}
          >
            <p
              className="mb-2.5 text-sm font-semibold"
              style={{ color: POSITION_COLORS[position] }}
            >
              {POSITION_LABELS[position]} 티어
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block space-y-1.5">
                <span className="text-xs text-ow-mist/60">티어</span>
                <select
                  className="input-field clip-angle"
                  value={draft[position].tier.rank}
                  onChange={(e) => setRoleRank(position, e.target.value as RankName)}
                >
                  {RANK_ORDER.map((key) => (
                    <option key={key} value={key}>
                      {RANK_LABELS[key]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs text-ow-mist/60">디비전</span>
                {draft[position].tier.rank === 'unranked' ? (
                  <div className="input-field clip-angle flex items-center text-ow-mist/45">
                    해당 없음
                  </div>
                ) : (
                  <select
                    className="input-field clip-angle"
                    value={draft[position].tier.division}
                    onChange={(e) =>
                      setRoleDivision(position, Number(e.target.value) as Division)
                    }
                  >
                    {DIVISIONS.map((d) => (
                      <option key={d} value={d}>
                        디비전 {d}
                      </option>
                    ))}
                  </select>
                )}
              </label>
            </div>
          </div>
        ))}
      </div>

      {error && <p className="text-sm text-amber-400/90">{error}</p>}

      <button type="submit" className="btn-primary animate-pulse-glow w-full sm:w-auto">
        <Plus size={18} strokeWidth={2.5} />
        팀원 추가
      </button>
    </form>
  )
}
