'use client'

import { DISPLAY_COLORS } from '@/lib/display-colors'
import { cn } from '@/lib/utils'

type ColorPickerProps = {
  value: string
  onChange: (colorId: string) => void
}

export function ColorPicker({ value, onChange }: ColorPickerProps) {
  return (
    <div role="radiogroup" aria-label="Kolor wyświetlacza" className="flex items-center gap-1">
      <span className="mr-1 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Kolor</span>
      {DISPLAY_COLORS.map((color) => {
        const isSelected = color.id === value
        return (
          <button
            key={color.id}
            type="button"
            role="radio"
            aria-checked={isSelected}
            aria-label={color.label}
            title={color.label}
            onClick={() => onChange(color.id)}
            className="flex size-11 items-center justify-center rounded-full outline-none focus-visible:ring-4 focus-visible:ring-ring/60"
          >
            <span
              aria-hidden="true"
              style={{ backgroundColor: color.primary, boxShadow: isSelected ? `0 0 12px ${color.primary}` : undefined }}
              className={cn(
                'size-6 rounded-full transition-transform',
                isSelected ? 'scale-110 ring-2 ring-foreground ring-offset-2 ring-offset-background' : 'opacity-70',
              )}
            />
          </button>
        )
      })}
    </div>
  )
}
