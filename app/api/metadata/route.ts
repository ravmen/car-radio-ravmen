import { NextResponse, type NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

const REQUEST_TIMEOUT_MS = 8000
const MAX_METAINT = 256 * 1024
const MAX_BLOCKS = 3
const PRIVATE_HOST =
  /^(localhost|0\.|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|\[?::1\]?$|\[?f[cd][0-9a-f]{2}:)/i

type MetadataResponse = { title: string | null; station: string | null }

function respond(body: MetadataResponse, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { 'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=20' },
  })
}

function decodeMetadata(bytes: Uint8Array) {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    return new TextDecoder('windows-1250').decode(bytes)
  }
}

function concat(a: Uint8Array, b: Uint8Array) {
  const merged = new Uint8Array(a.length + b.length)
  merged.set(a)
  merged.set(b, a.length)
  return merged
}

async function readStreamTitle(body: ReadableStream<Uint8Array>, metaInt: number) {
  const reader = body.getReader()
  let buffer: Uint8Array = new Uint8Array(0)
  let blockStart = 0
  let blocksRead = 0

  try {
    while (blocksRead < MAX_BLOCKS) {
      const lengthIndex = blockStart + metaInt
      if (buffer.length > lengthIndex) {
        const metaLength = buffer[lengthIndex] * 16
        const metaEnd = lengthIndex + 1 + metaLength
        if (metaLength === 0) {
          blockStart = lengthIndex + 1
          blocksRead++
          continue
        }
        if (buffer.length >= metaEnd) {
          const raw = decodeMetadata(buffer.subarray(lengthIndex + 1, metaEnd)).replace(/\0+$/, '')
          const match = raw.match(/StreamTitle='([\s\S]*?)';/)
          const title = match?.[1]?.trim()
          return title ? title.slice(0, 200) : null
        }
      }

      const { done, value } = await reader.read()
      if (done || !value) return null
      buffer = concat(buffer, value)
    }
    return null
  } finally {
    reader.cancel().catch(() => {})
  }
}

export async function GET(request: NextRequest) {
  const rawUrl = request.nextUrl.searchParams.get('url')

  let target: URL
  try {
    target = new URL(rawUrl ?? '')
  } catch {
    return respond({ title: null, station: null }, 400)
  }

  if (!['http:', 'https:'].includes(target.protocol) || PRIVATE_HOST.test(target.hostname)) {
    return respond({ title: null, station: null }, 400)
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch(target, {
      headers: { 'Icy-MetaData': '1', 'User-Agent': 'CarRadioClassic/1.0' },
      signal: controller.signal,
      cache: 'no-store',
    })

    const station = response.headers.get('icy-name')?.trim() || null
    const metaInt = Number(response.headers.get('icy-metaint'))

    if (!response.ok || !response.body || !Number.isFinite(metaInt) || metaInt <= 0 || metaInt > MAX_METAINT) {
      response.body?.cancel().catch(() => {})
      return respond({ title: null, station })
    }

    const title = await readStreamTitle(response.body, metaInt)
    return respond({ title, station })
  } catch {
    return respond({ title: null, station: null })
  } finally {
    clearTimeout(timeout)
  }
}
