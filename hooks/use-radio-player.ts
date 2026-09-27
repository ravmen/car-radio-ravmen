'use client'

import type Hls from 'hls.js'
import { useCallback, useEffect, useRef, useState } from 'react'

export type PlayerStatus = 'idle' | 'loading' | 'playing' | 'error'

const START_TIMEOUT_MS = 15000
const HLS_PATTERN = /\.m3u8(\?|#|$)/i

function withTimeout<T>(promise: Promise<T>, ms: number) {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), ms)
    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (error) => {
        clearTimeout(timer)
        reject(error)
      },
    )
  })
}

/** Browsers block http audio on https pages, so try the https variant of the stream first. */
function sourceCandidates(url: string) {
  if (typeof window !== 'undefined' && window.location.protocol === 'https:' && url.startsWith('http:')) {
    return [url.replace(/^http:/, 'https:'), url]
  }
  return [url]
}

export function useRadioPlayer(volume: number) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const hlsRef = useRef<Hls | null>(null)
  const requestIdRef = useRef(0)
  const [status, setStatus] = useState<PlayerStatus>('idle')

  const detach = useCallback(() => {
    hlsRef.current?.destroy()
    hlsRef.current = null
    const audio = audioRef.current
    if (!audio) return
    audio.pause()
    audio.removeAttribute('src')
    audio.load()
  }, [])

  useEffect(() => {
    const audio = new Audio()
    audio.preload = 'none'
    audioRef.current = audio

    const handlePlaying = () => setStatus('playing')
    const handleWaiting = () => setStatus((current) => (current === 'playing' ? 'loading' : current))
    const handleError = () => setStatus((current) => (current === 'playing' ? 'error' : current))

    audio.addEventListener('playing', handlePlaying)
    audio.addEventListener('waiting', handleWaiting)
    audio.addEventListener('error', handleError)

    return () => {
      audio.removeEventListener('playing', handlePlaying)
      audio.removeEventListener('waiting', handleWaiting)
      audio.removeEventListener('error', handleError)
      hlsRef.current?.destroy()
      audio.pause()
      audio.removeAttribute('src')
      audioRef.current = null
    }
  }, [])

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume
  }, [volume])

  const startSource = useCallback(async (audio: HTMLAudioElement, url: string) => {
    const needsHlsJs = HLS_PATTERN.test(url) && !audio.canPlayType('application/vnd.apple.mpegurl')

    if (needsHlsJs) {
      const { default: HlsClass } = await import('hls.js')
      if (HlsClass.isSupported()) {
        const hls = new HlsClass({ lowLatencyMode: false })
        hlsRef.current = hls
        await withTimeout(
          new Promise<void>((resolve, reject) => {
            hls.on(HlsClass.Events.MANIFEST_PARSED, () => resolve())
            hls.on(HlsClass.Events.ERROR, (_event, data) => {
              if (data.fatal) {
                reject(new Error(data.details))
                setStatus('error')
              }
            })
            hls.loadSource(url)
            hls.attachMedia(audio)
          }),
          START_TIMEOUT_MS,
        )
        await withTimeout(audio.play(), START_TIMEOUT_MS)
        return
      }
    }

    audio.src = url
    await withTimeout(audio.play(), START_TIMEOUT_MS)
  }, [])

  const play = useCallback(
    async (url: string) => {
      const audio = audioRef.current
      if (!audio) return
      const requestId = ++requestIdRef.current
      detach()
      setStatus('loading')

      for (const candidate of sourceCandidates(url)) {
        if (requestId !== requestIdRef.current) return
        try {
          await startSource(audio, candidate)
          if (requestId === requestIdRef.current) setStatus('playing')
          return
        } catch {
          if (requestId !== requestIdRef.current) return
          detach()
        }
      }

      if (requestId === requestIdRef.current) setStatus('error')
    },
    [detach, startSource],
  )

  const stop = useCallback(() => {
    requestIdRef.current++
    detach()
    setStatus('idle')
  }, [detach])

  return { status, play, stop }
}
