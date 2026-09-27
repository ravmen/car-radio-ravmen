'use client'

import { Radio } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'

function initials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return ''
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase()
  return words
    .slice(0, 3)
    .map((word) => word[0])
    .join('')
    .toUpperCase()
}

type StationLogoProps = {
  name: string | null
  logo?: string
  isOn: boolean
  className?: string
}

export function StationLogo({ name, logo, isOn, className }: StationLogoProps) {
  return (
    <div className={cn('flex flex-col items-center gap-3 short:gap-1.5', className)}>
      <div className="lcd flex size-36 items-center justify-center overflow-hidden rounded-2xl p-3 sm:size-40 lg:size-48 short:size-28 short:p-2">
        {logo ? (
          <LogoImage key={logo} src={logo} name={name ?? ''} dimmed={!isOn} />
        ) : (
          <LogoFallback name={name} dimmed={!isOn} />
        )}
      </div>
      <span className="text-sm font-semibold uppercase tracking-[0.35em] text-muted-foreground short:text-xs">
        Logo
      </span>
    </div>
  )
}

function LogoImage({ src, name, dimmed }: { src: string; name: string; dimmed: boolean }) {
  const [failed, setFailed] = useState(false)

  if (failed) return <LogoFallback name={name} dimmed={dimmed} />

  return (
    // eslint-disable-next-line @next/next/no-img-element -- logos come from arbitrary user playlist hosts
    <img
      src={src}
      alt={`Logo stacji ${name}`}
      onError={() => setFailed(true)}
      referrerPolicy="no-referrer"
      className={cn(
        'size-full rounded-xl bg-white/95 object-contain p-2 transition-opacity',
        dimmed ? 'opacity-40' : 'opacity-100',
      )}
    />
  )
}

function LogoFallback({ name, dimmed }: { name: string | null; dimmed: boolean }) {
  const text = name ? initials(name) : ''

  return (
    <div
      role="img"
      aria-label={name ? `Stacja ${name}` : 'Brak stacji'}
      className={cn('flex flex-col items-center justify-center gap-2 transition-opacity', dimmed && 'opacity-40')}
    >
      {text ? (
        <span className="lcd-glow font-mono text-5xl font-bold leading-none tracking-wider sm:text-6xl short:text-4xl" aria-hidden="true">
          {text}
        </span>
      ) : (
        <Radio className="lcd-glow size-14 short:size-10" aria-hidden="true" />
      )}
    </div>
  )
}
