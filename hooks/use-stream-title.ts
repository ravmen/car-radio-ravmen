'use client'

import useSWR from 'swr'

type StreamMetadata = { title: string | null; station: string | null }

const fetcher = async (url: string): Promise<StreamMetadata> => {
  const response = await fetch(url)
  if (!response.ok) return { title: null, station: null }
  return response.json()
}

// The APK build is a static export without API routes, so it sets this to an empty string to disable RDS lookups.
const METADATA_ENDPOINT = process.env.NEXT_PUBLIC_METADATA_ENDPOINT ?? '/api/metadata'

export function useStreamTitle(streamUrl: string | null) {
  const key = streamUrl && METADATA_ENDPOINT ? `${METADATA_ENDPOINT}?url=${encodeURIComponent(streamUrl)}` : null
  const { data } = useSWR(key, fetcher, {
    refreshInterval: 20000,
    revalidateOnFocus: false,
    keepPreviousData: false,
  })
  return data?.title ?? null
}
