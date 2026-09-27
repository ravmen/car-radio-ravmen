'use client'

import useSWR from 'swr'

type StreamMetadata = { title: string | null; station: string | null }

const fetcher = async (url: string): Promise<StreamMetadata> => {
  const response = await fetch(url)
  if (!response.ok) return { title: null, station: null }
  return response.json()
}

export function useStreamTitle(streamUrl: string | null) {
  const { data } = useSWR(streamUrl ? `/api/metadata?url=${encodeURIComponent(streamUrl)}` : null, fetcher, {
    refreshInterval: 20000,
    revalidateOnFocus: false,
    keepPreviousData: false,
  })
  return data?.title ?? null
}
