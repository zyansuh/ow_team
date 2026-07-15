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

const SPECIFIC_POSITIONS: Position[] = ['tank', 'healer', 'dealer']

function emptyDraft(): RoleDraft {
  return {
    tank: { enabled: true, tier: { ...DEFAULT_TIER } },
    healer: { enabled: true, tier: { ...DEFAULT_TIER } },
    dealer: { enabled: true, tier: { ...DEFAULT_TIER } },
    random: { enabled: false, tier: { ...DEFAULT_TIER } },
  }
}

function TierFields({
  tier,
  onRank,
  onDivision,
}: {
  tier: Tier
  onRank: (rank: RankName) => void
  onDivision: (division: Division) => void
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <label className="block space-y-1.5">
        <span className="text-xs text-ow-mist/60">티어</span>
        <select
          className="input-field clip-angle"
          value={tier.rank}
          onChange={(e) => onRank(e.target.value as RankName)}
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
        {tier.rank === 'unranked' ? (
          <div className="input-field clip-angle flex items-center text-ow-mist/45">
            해당 없음
          </div>
        ) : (
          <select
            className="input-field clip-angle"
            value={tier.division}
            onChange={(e) => onDivision(Number(e.target.value) as Division)}
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
  )
}

export function PlayerForm({ onAdd }: PlayerFormProps) {
  const [nickname, setNickname] = useState('')
  const [draft, setDraft] = useState<RoleDraft>(emptyDraft)
  const [error, setError] = useState('')

  const specificEnabled = SPECIFIC_POSITIONS.filter((p) => draft[p].enabled)
  const allSpecificOn = SPECIFIC_POSITIONS.every((p) => draft[p].enabled)

  function togglePosition(position: Position) {
    if (position === 'random') {
      setDraft((prev) => {
        const turningOn = !prev.random.enabled
        if (turningOn) {
          // 무작위 ON → 탱/힐/딜 전부 켜서 티어 작성 유도, 빈 슬롯 플렉스 배정용
          return {
            tank: { ...prev.tank, enabled: true },
            healer: { ...prev.healer, enabled: true },
            dealer: { ...prev.dealer, enabled: true },
            random: { ...prev.random, enabled: true },
          }
        }
        return {
          ...prev,
          random: { ...prev.random, enabled: false },
        }
      })
      setError('')
      return
    }

    setDraft((prev) => {
      // 플렉스 상태에서는 탱/힐/딜 끄기 금지 (전부 작성 필요)
      if (prev.random.enabled && prev[position].enabled) {
        setError('무작위(플렉스)는 탱·힐·딜 티어를 모두 작성해야 합니다.')
        return prev
      }
      return {
        ...prev,
        [position]: { ...prev[position], enabled: !prev[position].enabled },
      }
    })
    setError('')
  }

  function setRoleRank(position: Position, rank: RankName) {
    setDraft((prev) => ({
      ...prev,
      [position]: {
        ...prev[position],
        tier: {
          rank,
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

    if (draft.random.enabled && !allSpecificOn) {
      setError('무작위는 탱커·힐러·딜러 티어를 모두 작성한 뒤 켜 주세요.')
      return
    }

    if (specificEnabled.length === 0 && !draft.random.enabled) {
      setError('포지션을 하나 이상 선택해 주세요.')
      return
    }

    const roles: RoleEntry[] = specificEnabled.map((p) => ({
      position: p,
      tier: { ...draft[p].tier },
    }))

    if (draft.random.enabled) {
      roles.push({ position: 'random', tier: { ...DEFAULT_TIER } })
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
          포지션 · 티어 (OW 구성: 탱1 · 딜2 · 힐2)
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
        <p className="text-xs leading-relaxed text-ow-mist/45">
          탱·힐·딜 티어를 모두 적은 뒤 <span className="text-ow-mist/70">무작위</span>를
          켜면, 팀 짜기 때 빈 슬롯(탱1·딜2·힐2)을 해당 티어로 자동 채웁니다.
        </p>
      </div>

      <div className="space-y-3">
        {specificEnabled.map((position) => (
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
            <TierFields
              tier={draft[position].tier}
              onRank={(rank) => setRoleRank(position, rank)}
              onDivision={(division) => setRoleDivision(position, division)}
            />
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
