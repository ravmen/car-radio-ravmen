'use client'

import { useRef } from 'react'
import type { Station } from '@/lib/m3u'
import { cn } from '@/lib/utils'

const LONG_PRESS_MS = 700

type PresetButtonsProps = {
  presets: (Station | null)[]
  activePresetIndex: number | null
  onSelect: (presetIndex: number) => void
  onStore: (presetIndex: number) => void
  canStore: boolean
}

export function PresetButtons({ presets, activePresetIndex, onSelect, onStore, canStore }: PresetButtonsProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressFiredRef = useRef(false)

  function startPress(presetIndex: number) {
    longPressFiredRef.current = false
    if (!canStore) return
    timerRef.current = setTimeout(() => {
      longPressFiredRef.current = true
      navigator.vibrate?.(40)
      onStore(presetIndex)
    }, LONG_PRESS_MS)
  }

  function cancelPress() {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = null
  }

  function handleClick(presetIndex: number) {
    if (longPressFiredRef.current) {
      longPressFiredRef.current = false
      return
    }
    onSelect(presetIndex)
  }

  return (
    <div role="group" aria-label="Ulubione stacje" className="grid grid-cols-3 gap-3 sm:gap-4 md:grid-cols-6 short:grid-cols-6 short:gap-2">
      {presets.map((station, index) => {
        const isActive = activePresetIndex === index
        return (
          <button
            key={index}
            type="button"
            onClick={() => handleClick(index)}
            onPointerDown={() => startPress(index)}
            onPointerUp={cancelPress}
            onPointerLeave={cancelPress}
            onPointerCancel={cancelPress}
            onContextMenu={(event) => event.preventDefault()}
            disabled={!station && !canStore}
            aria-pressed={isActive}
            aria-label={
              station ? `Preset ${index + 1}: ${station.name}` : `Preset ${index + 1}: pusty, przytrzymaj aby zapisać`
            }
            className="hw-button relative flex h-24 min-w-0 select-none flex-col items-center justify-center gap-1 rounded-xl px-2 outline-none focus-visible:ring-4 focus-visible:ring-ring/60 disabled:opacity-40 sm:h-28 short:h-16"
          >
            <span
              aria-hidden="true"
              className={cn(
                'absolute top-2 h-1 w-8 rounded-full transition-all',
                isActive ? 'bg-primary shadow-[0_0_10px_var(--primary)]' : 'bg-background/80',
              )}
            />
            <span
              className={cn(
                'text-4xl font-bold leading-none sm:text-5xl short:text-3xl',
                isActive ? 'text-primary' : 'text-foreground',
              )}
            >
              {index + 1}
            </span>
            <span className="w-full truncate text-center text-xs font-medium uppercase tracking-wider text-muted-foreground sm:text-sm short:hidden">
              {station?.name ?? '— — —'}
            </span>
          </button>
        )
      })}
    </div>
  )
}
