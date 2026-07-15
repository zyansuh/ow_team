import type { FormEvent } from 'react'
import { useState } from 'react'
import { Plus } from 'lucide-react'
import {
  DIVISIONS,
  POSITION_LABELS,
  RANK_LABELS,
  RANK_ORDER,
  createId,
} from '../constants'
import type { Division, Player, Position, RankName } from '../types'

interface PlayerFormProps {
  onAdd: (player: Player) => void
}

export function PlayerForm({ onAdd }: PlayerFormProps) {
  const [nickname, setNickname] = useState('')
  const [position, setPosition] = useState<Position>('random')
  const [rank, setRank] = useState<RankName>('gold')
  const [division, setDivision] = useState<Division>(3)

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const name = nickname.trim()
    if (!name) return

    onAdd({
      id: createId(),
      nickname: name,
      position,
      tier: { rank, division },
    })
    setNickname('')
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block space-y-1.5 sm:col-span-2 lg:col-span-1">
          <span className="text-xs font-medium tracking-wide text-ow-mist/70">
            닉네임
          </span>
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

        <label className="block space-y-1.5">
          <span className="text-xs font-medium tracking-wide text-ow-mist/70">
            포지션
          </span>
          <select
            className="input-field clip-angle"
            value={position}
            onChange={(e) => setPosition(e.target.value as Position)}
          >
            {(Object.keys(POSITION_LABELS) as Position[]).map((key) => (
              <option key={key} value={key}>
                {POSITION_LABELS[key]}
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-1.5">
          <span className="text-xs font-medium tracking-wide text-ow-mist/70">
            티어
          </span>
          <select
            className="input-field clip-angle"
            value={rank}
            onChange={(e) => setRank(e.target.value as RankName)}
          >
            {RANK_ORDER.map((key) => (
              <option key={key} value={key}>
                {RANK_LABELS[key]}
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-1.5">
          <span className="text-xs font-medium tracking-wide text-ow-mist/70">
            디비전
          </span>
          <select
            className="input-field clip-angle"
            value={division}
            onChange={(e) => setDivision(Number(e.target.value) as Division)}
          >
            {DIVISIONS.map((d) => (
              <option key={d} value={d}>
                디비전 {d}
              </option>
            ))}
          </select>
        </label>
      </div>

      <button type="submit" className="btn-primary animate-pulse-glow w-full sm:w-auto">
        <Plus size={18} strokeWidth={2.5} />
        팀원 추가
      </button>
    </form>
  )
}
