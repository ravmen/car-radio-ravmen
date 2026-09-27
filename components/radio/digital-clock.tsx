'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

const WEEKDAYS = ['ND', 'PN', 'WT', 'ŚR', 'CZ', 'PT', 'SO']

const pad = (value: number) => String(value).padStart(2, '0')

export function DigitalClock({ className }: { className?: string }) {
  const [now, setNow] = useState<Date | null>(null)

  useEffect(() => {
    setNow(new Date())
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const hours = now ? pad(now.getHours()) : '--'
  const minutes = now ? pad(now.getMinutes()) : '--'
  const colonVisible = now ? now.getSeconds() % 2 === 0 : true
  const dateText = now ? `${WEEKDAYS[now.getDay()]} ${pad(now.getDate())}.${pad(now.getMonth() + 1)}` : '-- --.--'

  return (
    <div className={cn('flex flex-col items-center gap-3 short:gap-1.5', className)}>
      <div
        role="timer"
        aria-live="off"
        aria-label={now ? `Godzina ${hours}:${minutes}` : 'Zegar'}
        className="lcd flex h-36 w-44 flex-col items-center justify-center gap-2 rounded-2xl font-mono sm:h-40 sm:w-48 lg:h-48 lg:w-56 short:h-28 short:w-36 short:gap-1"
      >
        <p className="lcd-glow flex items-baseline text-5xl leading-none tabular-nums sm:text-6xl short:text-4xl" aria-hidden="true">
          <span>{hours}</span>
          <span className={cn('transition-opacity', colonVisible ? 'opacity-100' : 'opacity-20')}>:</span>
          <span>{minutes}</span>
        </p>
        <p className="lcd-glow text-sm tracking-[0.25em] sm:text-base short:text-xs" aria-hidden="true">
          {dateText}
        </p>
      </div>
      <span className="text-sm font-semibold uppercase tracking-[0.35em] text-muted-foreground short:text-xs">
        Zegar
      </span>
    </div>
  )
}
