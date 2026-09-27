export type Station = {
  id: string
  name: string
  url: string
  logo?: string
  group?: string
}

const ATTRIBUTE_PATTERN = /([\w-]+)="([^"]*)"/g
const STREAM_URL_PATTERN = /^https?:\/\//i

function parseExtInf(line: string) {
  const attributes: Record<string, string> = {}
  for (const match of line.matchAll(ATTRIBUTE_PATTERN)) {
    attributes[match[1].toLowerCase()] = match[2]
  }
  const withoutAttributes = line.replace(ATTRIBUTE_PATTERN, '')
  const commaIndex = withoutAttributes.indexOf(',')
  const title = commaIndex >= 0 ? withoutAttributes.slice(commaIndex + 1).trim() : ''

  return {
    name: title || attributes['tvg-name'] || '',
    logo: attributes['tvg-logo'] || undefined,
    group: attributes['group-title'] || undefined,
  }
}

function fallbackName(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return 'Stacja'
  }
}

export function parseM3U(content: string): Station[] {
  const lines = content
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  const stations: Station[] = []
  const seenUrls = new Set<string>()
  let pending: ReturnType<typeof parseExtInf> | null = null

  for (const line of lines) {
    if (line.toUpperCase().startsWith('#EXTINF')) {
      pending = parseExtInf(line)
      continue
    }
    if (line.startsWith('#')) continue
    if (!STREAM_URL_PATTERN.test(line)) {
      pending = null
      continue
    }
    if (seenUrls.has(line)) {
      pending = null
      continue
    }

    seenUrls.add(line)
    stations.push({
      id: `${stations.length}-${line}`,
      name: pending?.name || fallbackName(line),
      url: line,
      logo: pending?.logo,
      group: pending?.group,
    })
    pending = null
  }

  return stations
}

const FM_MIN = 87.6
const FM_MAX = 107.9

/** Stream stations have no real frequency, so spread them evenly across the FM band for the classic look. */
export function stationFrequency(index: number, total: number) {
  if (total <= 1) return (100.0).toFixed(1)
  const rawStep = (FM_MAX - FM_MIN) / (total - 1)
  const step = Math.min(2, Math.max(0.1, Math.floor(rawStep * 10) / 10))
  const slots = Math.round((FM_MAX - FM_MIN) / 0.1) + 1
  const tenths = Math.round((index * step) / 0.1) % slots
  return (FM_MIN + tenths * 0.1).toFixed(1)
}
