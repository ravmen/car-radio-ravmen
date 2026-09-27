export type DisplayColor = {
  id: string
  label: string
  primary: string
  lcd: string
}

export const DISPLAY_COLORS: DisplayColor[] = [
  { id: 'amber', label: 'Bursztynowy', primary: 'oklch(0.8 0.16 72)', lcd: 'oklch(0.1 0.018 65)' },
  { id: 'red', label: 'Czerwony', primary: 'oklch(0.66 0.23 27)', lcd: 'oklch(0.1 0.02 27)' },
  { id: 'green', label: 'Zielony', primary: 'oklch(0.82 0.2 145)', lcd: 'oklch(0.1 0.02 145)' },
  { id: 'blue', label: 'Niebieski', primary: 'oklch(0.72 0.16 245)', lcd: 'oklch(0.1 0.025 250)' },
  { id: 'cyan', label: 'Turkusowy', primary: 'oklch(0.84 0.13 200)', lcd: 'oklch(0.1 0.02 200)' },
  { id: 'violet', label: 'Fioletowy', primary: 'oklch(0.72 0.2 300)', lcd: 'oklch(0.1 0.025 300)' },
  { id: 'white', label: 'Biały', primary: 'oklch(0.95 0.01 250)', lcd: 'oklch(0.1 0.006 250)' },
]

export const DEFAULT_COLOR_ID = DISPLAY_COLORS[0].id

export function findDisplayColor(id: string | null | undefined) {
  return DISPLAY_COLORS.find((color) => color.id === id) ?? DISPLAY_COLORS[0]
}

export function applyDisplayColor(color: DisplayColor) {
  const root = document.documentElement.style
  root.setProperty('--primary', color.primary)
  root.setProperty('--ring', color.primary)
  root.setProperty('--destructive', color.primary)
  root.setProperty('--lcd', color.lcd)
}
