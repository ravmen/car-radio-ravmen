import type { PlayerStatus } from '@/hooks/use-radio-player'
import { cn } from '@/lib/utils'
import { MarqueeText } from '@/components/radio/marquee-text'

type RadioDisplayProps = {
  frequency: string | null
  stationName: string | null
  rdsText: string
  stationPosition: number | null
  stationCount: number
  presetNumber: number | null
  status: PlayerStatus
  isOn: boolean
  className?: string
}

const STATUS_LABELS: Record<PlayerStatus, string> = {
  idle: 'STOP',
  loading: 'BUF',
  playing: 'LIVE',
  error: 'ERR',
}

function Indicator({ active, children }: { active: boolean; children: React.ReactNode }) {
  return <span className={cn('transition-colors', active ? 'lcd-glow' : 'text-lcd-dim')}>{children}</span>
}

export function RadioDisplay({
  frequency,
  stationName,
  rdsText,
  stationPosition,
  stationCount,
  presetNumber,
  status,
  isOn,
  className,
}: RadioDisplayProps) {
  const isPlaying = isOn && status === 'playing'

  return (
    <div
      role="region"
      aria-label="Wyświetlacz radia"
      aria-live="polite"
      className={cn(
        'lcd relative flex min-w-0 flex-col justify-between gap-3 overflow-hidden rounded-2xl p-5 font-mono sm:p-6 short:gap-1 short:p-3',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-4 text-sm tracking-[0.25em] sm:text-base short:text-xs">
        <div className="flex items-center gap-4">
          <Indicator active={isOn}>FM</Indicator>
          <Indicator active={isPlaying}>ST</Indicator>
          <Indicator active={isPlaying && rdsText.length > 0}>RDS</Indicator>
        </div>
        <div className="flex items-center gap-4">
          <Indicator active={presetNumber !== null}>{presetNumber !== null ? `P${presetNumber}` : 'P-'}</Indicator>
          {stationCount > 0 && stationPosition !== null && (
            <Indicator active>
              {String(stationPosition).padStart(2, '0')}/{String(stationCount).padStart(2, '0')}
            </Indicator>
          )}
          <Indicator active={isOn}>{isOn ? STATUS_LABELS[status] : 'OFF'}</Indicator>
        </div>
      </div>

      <div className="flex items-baseline gap-3">
        <span className={cn('text-5xl leading-none sm:text-6xl short:text-4xl', frequency ? 'lcd-glow' : 'text-lcd-dim')}>
          {frequency ?? '88.8'}
        </span>
        <span className={cn('text-xl sm:text-2xl short:text-lg', frequency ? 'lcd-glow' : 'text-lcd-dim')}>MHz</span>
      </div>

      <MarqueeText
        text={stationName ?? 'BRAK STACJI'}
        pixelsPerSecond={90}
        className={cn(
          'text-5xl uppercase leading-tight sm:text-6xl lg:text-7xl short:text-4xl',
          stationName ? 'lcd-glow' : 'text-lcd-dim',
        )}
      />

      <div className="border-t border-primary/15 pt-3 text-lg sm:text-xl short:pt-1 short:text-base">
        <MarqueeText text={rdsText} pixelsPerSecond={50} className="lcd-glow" />
      </div>
    </div>
  )
}
