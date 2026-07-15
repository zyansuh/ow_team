import { type FormEvent, useState } from 'react'
import { Plus, Trash2, UserRound } from 'lucide-react'
import { createId } from '../constants'
import type { ReserveEntry } from '../types'

interface ReserveBenchProps {
  reserves: ReserveEntry[]
  onAdd: (entry: ReserveEntry) => void
  onRemove: (id: string) => void
  onClear: () => void
}

export function ReserveBench({
  reserves,
  onAdd,
  onRemove,
  onClear,
}: ReserveBenchProps) {
  const [nickname, setNickname] = useState('')

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const name = nickname.trim()
    if (!name) return
    onAdd({ id: createId(), nickname: name })
    setNickname('')
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="text-xs font-medium tracking-wide text-ow-mist">예비인원</p>
        <p className="mt-1 text-xs leading-relaxed text-ow-mist/85">
          팀짜기에 포함되지 않는 대기·교체 인원입니다. 닉네임만 적어 두면 됩니다.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-2 sm:flex-row sm:items-stretch"
      >
        <input
          className="input-field clip-angle min-w-0 flex-1"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="예비 닉네임"
          maxLength={24}
          autoComplete="off"
        />
        <button type="submit" className="btn-ghost w-full shrink-0 sm:w-auto">
          <Plus size={16} />
          예비 추가
        </button>
      </form>

      {reserves.length === 0 ? (
        <p className="rounded-[12px] border border-dashed border-ow-cream/12 px-3 py-5 text-center text-sm text-ow-mist/80">
          예비인원이 없습니다.
        </p>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-ow-mist">예비 {reserves.length}명</p>
            <button
              type="button"
              className="btn-ghost !min-h-9 !px-3 !text-xs"
              onClick={onClear}
            >
              예비 비우기
            </button>
          </div>
          <ul className="flex flex-wrap gap-2">
            {reserves.map((entry) => (
              <li
                key={entry.id}
                className="inline-flex max-w-full items-center gap-2 rounded-full border border-ow-cream/10 bg-white/80 py-1.5 pl-2.5 pr-1"
              >
                <UserRound size={14} className="shrink-0 text-ow-mist/80" />
                <span className="truncate text-sm font-medium text-ow-cream">
                  {entry.nickname}
                </span>
                <button
                  type="button"
                  aria-label={`${entry.nickname} 예비 삭제`}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ow-mist/80 transition hover:bg-red-50 hover:text-red-500"
                  onClick={() => onRemove(entry.id)}
                >
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
