'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useRef, type PointerEvent } from 'react'
import type { Station } from '@/lib/m3u'
import { cn } from '@/lib/utils'

const LONG_PRESS_MS = 700
const SWIPE_THRESHOLD_PX = 60
export const PRESETS_PER_BANK = 6

type PresetButtonsProps = {
  presets: (Station | null)[]
  bank: number
  onBankChange: (bank: number) => void
  activePresetIndex: number | null
  onSelect: (presetIndex: number) => void
  onStore: (presetIndex: number) => void
  canStore: boolean
}

export function PresetButtons({
  presets,
  bank,
  onBankChange,
  activePresetIndex,
  onSelect,
  onStore,
  canStore,
}: PresetButtonsProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const suppressClickRef = useRef(false)
  const swipeStartXRef = useRef<number | null>(null)

  const bankCount = Math.max(1, Math.ceil(presets.length / PRESETS_PER_BANK))
  const offset = bank * PRESETS_PER_BANK
  const visible = Array.from({ length: PRESETS_PER_BANK }, (_, index) => presets[offset + index] ?? null)

  function changeBank(direction: 1 | -1) {
    onBankChange((bank + direction + bankCount) % bankCount)
  }

  function cancelPress() {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = null
  }

  function startPress(presetIndex: number) {
    suppressClickRef.current = false
    if (!canStore) return
    timerRef.current = setTimeout(() => {
      suppressClickRef.current = true
      navigator.vibrate?.(40)
      onStore(presetIndex)
    }, LONG_PRESS_MS)
  }

  function handleClick(presetIndex: number) {
    if (suppressClickRef.current) {
      suppressClickRef.current = false
      return
    }
    onSelect(presetIndex)
  }

  function handleSwipeStart(event: PointerEvent) {
    swipeStartXRef.current = event.clientX
  }

  function handleSwipeMove(event: PointerEvent) {
    if (swipeStartXRef.current === null) return
    if (Math.abs(event.clientX - swipeStartXRef.current) > 12) cancelPress()
  }

  function handleSwipeEnd(event: PointerEvent) {
    if (swipeStartXRef.current === null) return
    const deltaX = event.clientX - swipeStartXRef.current
    swipeStartXRef.current = null
    if (Math.abs(deltaX) < SWIPE_THRESHOLD_PX || bankCount < 2) return
    suppressClickRef.current = true
    changeBank(deltaX < 0 ? 1 : -1)
  }

  const bankButtonClass =
    'hw-button flex w-12 shrink-0 items-center justify-center self-stretch rounded-xl text-foreground outline-none focus-visible:ring-4 focus-visible:ring-ring/60 disabled:opacity-30 sm:w-14'

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-stretch gap-3 sm:gap-4 short:gap-2">
        <button
          type="button"
          onClick={() => changeBank(-1)}
          disabled={bankCount < 2}
          aria-label="Poprzedni bank presetów"
          className={bankButtonClass}
        >
          <ChevronLeft className="size-7" aria-hidden="true" />
        </button>

        <div
          role="group"
          aria-label={`Ulubione stacje ${offset + 1}–${offset + PRESETS_PER_BANK}`}
          onPointerDownCapture={handleSwipeStart}
          onPointerMoveCapture={handleSwipeMove}
          onPointerUpCapture={handleSwipeEnd}
          onPointerCancelCapture={() => (swipeStartXRef.current = null)}
          className="grid min-w-0 flex-1 touch-pan-y grid-cols-3 gap-3 sm:gap-4 md:grid-cols-6 short:grid-cols-6 short:gap-2"
        >
          {visible.map((station, localIndex) => {
            const presetIndex = offset + localIndex
            const isActive = activePresetIndex === presetIndex
            return (
              <button
                key={presetIndex}
                type="button"
                onClick={() => handleClick(presetIndex)}
                onPointerDown={() => startPress(presetIndex)}
                onPointerUp={cancelPress}
                onPointerLeave={cancelPress}
                onPointerCancel={cancelPress}
                onContextMenu={(event) => event.preventDefault()}
                disabled={!station && !canStore}
                aria-pressed={isActive}
                aria-label={
                  station
                    ? `Preset ${presetIndex + 1}: ${station.name}`
                    : `Preset ${presetIndex + 1}: pusty, przytrzymaj aby zapisać`
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
                    'text-4xl font-bold leading-none tabular-nums sm:text-5xl short:text-3xl',
                    isActive ? 'text-primary' : 'text-foreground',
                  )}
                >
                  {presetIndex + 1}
                </span>
                <span className="w-full truncate text-center text-xs font-medium uppercase tracking-wider text-muted-foreground sm:text-sm short:hidden">
                  {station?.name ?? '— — —'}
                </span>
              </button>
            )
          })}
        </div>

        <button
          type="button"
          onClick={() => changeBank(1)}
          disabled={bankCount < 2}
          aria-label="Następny bank presetów"
          className={bankButtonClass}
        >
          <ChevronRight className="size-7" aria-hidden="true" />
        </button>
      </div>

      {bankCount > 1 && (
        <div className="flex items-center justify-center gap-2 short:hidden" aria-hidden="true">
          <span className="mr-1 font-mono text-xs uppercase tracking-widest text-muted-foreground">
            Bank {bank + 1}/{bankCount}
          </span>
          {bankCount <= 12 &&
            Array.from({ length: bankCount }, (_, index) => (
              <span
                key={index}
                className={cn(
                  'h-1.5 rounded-full transition-all',
                  index === bank ? 'w-5 bg-primary' : 'w-1.5 bg-muted-foreground/40',
                )}
              />
            ))}
        </div>
      )}
    </div>
  )
}
