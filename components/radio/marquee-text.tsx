'use client'

import { useLayoutEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

type MarqueeTextProps = {
  text: string
  className?: string
  pixelsPerSecond?: number
}

const GAP_EM = 2

export function MarqueeText({ text, className, pixelsPerSecond = 70 }: MarqueeTextProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const measureRef = useRef<HTMLSpanElement>(null)
  const [scrollDuration, setScrollDuration] = useState<number | null>(null)

  useLayoutEffect(() => {
    const container = containerRef.current
    const measure = measureRef.current
    if (!container || !measure) return

    const update = () => {
      const textWidth = measure.getBoundingClientRect().width
      const availableWidth = container.clientWidth
      if (textWidth <= availableWidth + 1) {
        setScrollDuration(null)
        return
      }
      const fontSize = Number.parseFloat(getComputedStyle(container).fontSize) || 16
      const loopDistance = textWidth + fontSize * GAP_EM
      setScrollDuration(Math.max(6, loopDistance / pixelsPerSecond))
    }

    update()
    const observer = new ResizeObserver(update)
    observer.observe(container)
    observer.observe(measure)
    document.fonts?.ready.then(update).catch(() => {})
    return () => observer.disconnect()
  }, [text, pixelsPerSecond])

  const isScrolling = scrollDuration !== null

  return (
    <div ref={containerRef} className={cn('relative overflow-hidden whitespace-nowrap', className)}>
      <span ref={measureRef} aria-hidden="true" className="invisible absolute left-0 top-0 w-max">
        {text}
      </span>

      {isScrolling ? (
        <>
          <span className="sr-only">{text}</span>
          <div
            key={text}
            aria-hidden="true"
            className="marquee-track flex w-max"
            style={{ '--marquee-duration': `${scrollDuration}s` } as React.CSSProperties}
          >
            <span style={{ paddingRight: `${GAP_EM}em` }}>{text}</span>
            <span style={{ paddingRight: `${GAP_EM}em` }}>{text}</span>
          </div>
        </>
      ) : (
        <span className="block truncate">{text}</span>
      )}
    </div>
  )
}
