'use client'

import { useRef, useState, type KeyboardEvent, type PointerEvent, type WheelEvent } from 'react'
import { cn } from '@/lib/utils'

const TUNE_STEP_DEGREES = 28
const VOLUME_SWEEP_DEGREES = 270
const VOLUME_TICKS = 11
const TUNE_TICKS = 24

type SteppedProps = {
  mode: 'stepped'
  onStep: (direction: 1 | -1) => void
  disabled?: boolean
}

type ContinuousProps = {
  mode: 'continuous'
  value: number
  onChange: (value: number) => void
  disabled?: boolean
}

type RotaryKnobProps = (SteppedProps | ContinuousProps) & {
  label: string
  ariaLabel: string
  valueText: string
  className?: string
}

function haptic() {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate?.(6)
}

export function RotaryKnob(props: RotaryKnobProps) {
  const { label, ariaLabel, valueText, className, disabled } = props
  const knobRef = useRef<HTMLDivElement>(null)
  const lastAngleRef = useRef<number | null>(null)
  const stepAccumulatorRef = useRef(0)
  const valueRef = useRef(props.mode === 'continuous' ? props.value : 0)
  const [freeRotation, setFreeRotation] = useState(0)
  const [isDragging, setIsDragging] = useState(false)

  if (props.mode === 'continuous' && !isDragging) valueRef.current = props.value

  const rotation = props.mode === 'continuous' ? -135 + props.value * VOLUME_SWEEP_DEGREES : freeRotation

  function pointerAngle(event: PointerEvent) {
    const rect = knobRef.current!.getBoundingClientRect()
    const x = event.clientX - (rect.left + rect.width / 2)
    const y = event.clientY - (rect.top + rect.height / 2)
    return (Math.atan2(y, x) * 180) / Math.PI
  }

  function applyRotation(delta: number) {
    if (disabled) return
    if (props.mode === 'continuous') {
      const next = Math.min(1, Math.max(0, valueRef.current + delta / VOLUME_SWEEP_DEGREES))
      if (next !== valueRef.current) {
        valueRef.current = next
        props.onChange(next)
      }
      return
    }

    setFreeRotation((current) => current + delta)
    stepAccumulatorRef.current += delta
    while (stepAccumulatorRef.current >= TUNE_STEP_DEGREES) {
      stepAccumulatorRef.current -= TUNE_STEP_DEGREES
      props.onStep(1)
      haptic()
    }
    while (stepAccumulatorRef.current <= -TUNE_STEP_DEGREES) {
      stepAccumulatorRef.current += TUNE_STEP_DEGREES
      props.onStep(-1)
      haptic()
    }
  }

  function nudge(direction: 1 | -1) {
    if (disabled) return
    if (props.mode === 'continuous') {
      applyRotation(direction * VOLUME_SWEEP_DEGREES * 0.05)
    } else {
      setFreeRotation((current) => current + direction * TUNE_STEP_DEGREES)
      props.onStep(direction)
    }
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (disabled) return
    event.currentTarget.setPointerCapture(event.pointerId)
    lastAngleRef.current = pointerAngle(event)
    setIsDragging(true)
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (lastAngleRef.current === null) return
    const angle = pointerAngle(event)
    let delta = angle - lastAngleRef.current
    if (delta > 180) delta -= 360
    if (delta < -180) delta += 360
    lastAngleRef.current = angle
    applyRotation(delta)
  }

  function handlePointerEnd() {
    lastAngleRef.current = null
    stepAccumulatorRef.current = 0
    setIsDragging(false)
  }

  function handleWheel(event: WheelEvent<HTMLDivElement>) {
    nudge(event.deltaY < 0 ? 1 : -1)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'ArrowUp' || event.key === 'ArrowRight') {
      event.preventDefault()
      nudge(1)
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowLeft') {
      event.preventDefault()
      nudge(-1)
    }
  }

  const tickCount = props.mode === 'continuous' ? VOLUME_TICKS : TUNE_TICKS

  return (
    <div className={cn('flex flex-col items-center gap-3 short:gap-1.5', className)}>
      <div className="knob-bezel relative size-36 rounded-full p-4 sm:size-40 lg:size-48 short:size-28 short:p-3">
        {Array.from({ length: tickCount }, (_, index) => {
          const angle =
            props.mode === 'continuous'
              ? -135 + (index / (VOLUME_TICKS - 1)) * VOLUME_SWEEP_DEGREES
              : (index / TUNE_TICKS) * 360
          const isLit = props.mode === 'continuous' && props.value > 0 && index / (VOLUME_TICKS - 1) <= props.value + 0.001
          return (
            <span
              key={index}
              aria-hidden="true"
              className="absolute inset-0 flex justify-center"
              style={{ transform: `rotate(${angle}deg)` }}
            >
              <span
                className={cn(
                  'mt-1 h-2 w-0.5 rounded-full transition-colors',
                  isLit ? 'bg-primary shadow-[0_0_6px_var(--primary)]' : 'bg-muted-foreground/30',
                )}
              />
            </span>
          )
        })}

        <div
          ref={knobRef}
          role="slider"
          tabIndex={disabled ? -1 : 0}
          aria-label={ariaLabel}
          aria-valuetext={valueText}
          aria-disabled={disabled || undefined}
          {...(props.mode === 'continuous'
            ? { 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': Math.round(props.value * 100) }
            : {})}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerEnd}
          onPointerCancel={handlePointerEnd}
          onWheel={handleWheel}
          onKeyDown={handleKeyDown}
          className={cn(
            'knob-grip relative size-full touch-none select-none rounded-full outline-none focus-visible:ring-4 focus-visible:ring-ring/60',
            disabled ? 'cursor-not-allowed opacity-60' : isDragging ? 'cursor-grabbing' : 'cursor-grab',
          )}
          style={{ transform: `rotate(${rotation}deg)` }}
        >
          <div className="knob-cap absolute inset-[16%] rounded-full" />
          <span
            aria-hidden="true"
            className="absolute left-1/2 top-[7%] h-[22%] w-1.5 -translate-x-1/2 rounded-full bg-primary shadow-[0_0_10px_var(--primary)]"
          />
        </div>
      </div>
      <span className="text-sm font-semibold uppercase tracking-[0.35em] text-muted-foreground short:text-xs">
        {label}
      </span>
    </div>
  )
}
