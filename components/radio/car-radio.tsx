'use client'

import { ChevronsLeft, ChevronsRight, Power } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { PlaylistLoader } from '@/components/radio/playlist-loader'
import { ColorPicker } from '@/components/radio/color-picker'
import { PresetButtons, PRESETS_PER_BANK } from '@/components/radio/preset-buttons'
import { RadioDisplay } from '@/components/radio/radio-display'
import { RotaryKnob } from '@/components/radio/rotary-knob'
import { useRadioPlayer } from '@/hooks/use-radio-player'
import { useStreamTitle } from '@/hooks/use-stream-title'
import { applyDisplayColor, DEFAULT_COLOR_ID, findDisplayColor } from '@/lib/display-colors'
import { parseM3U, stationFrequency, type Station } from '@/lib/m3u'
import { cn } from '@/lib/utils'

const STORAGE_KEY = 'car-radio-classic:v1'
const MIN_PRESET_BANKS = 2
const TUNE_SETTLE_MS = 450
const FLASH_MS = 1600
const VOLUME_STEPS = 40

type SavedState = {
  stations: Station[]
  presetIds: (string | null)[]
  currentId: string | null
  volume: number
  colorId: string
}

function presetSlotCount(stationCount: number) {
  const banks = Math.max(MIN_PRESET_BANKS, Math.ceil(stationCount / PRESETS_PER_BANK))
  return banks * PRESETS_PER_BANK
}

function buildPresets(source: (string | null)[], stationCount: number) {
  const length = Math.max(presetSlotCount(stationCount), Math.ceil(source.length / PRESETS_PER_BANK) * PRESETS_PER_BANK)
  return Array.from({ length }, (_, index) => source[index] ?? null)
}

const emptyPresets = (): (string | null)[] => buildPresets([], 0)

function stationsLabel(count: number) {
  if (count === 1) return 'STACJĘ'
  const lastDigit = count % 10
  const lastTwo = count % 100
  if (lastDigit >= 2 && lastDigit <= 4 && (lastTwo < 12 || lastTwo > 14)) return 'STACJE'
  return 'STACJI'
}

export function CarRadio() {
  const [stations, setStations] = useState<Station[]>([])
  const [presetIds, setPresetIds] = useState<(string | null)[]>(emptyPresets)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isOn, setIsOn] = useState(false)
  const [volume, setVolume] = useState(0.6)
  const [flash, setFlash] = useState<string | null>(null)
  const [isHydrated, setIsHydrated] = useState(false)
  const [colorId, setColorId] = useState(DEFAULT_COLOR_ID)
  const [presetBank, setPresetBank] = useState(0)
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const settleDelayRef = useRef(0)

  const { status, play, stop } = useRadioPlayer(volume)
  const currentStation = stations[currentIndex] ?? null
  const currentUrl = currentStation?.url ?? null
  const streamTitle = useStreamTitle(isOn && status === 'playing' ? currentUrl : null)

  const showFlash = useCallback((message: string) => {
    setFlash(message)
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current)
    flashTimerRef.current = setTimeout(() => setFlash(null), FLASH_MS)
  }, [])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const saved = JSON.parse(raw) as Partial<SavedState>
        if (Array.isArray(saved.stations) && saved.stations.length > 0) {
          setStations(saved.stations)
          const savedPresets = Array.isArray(saved.presetIds) ? saved.presetIds : []
          setPresetIds(buildPresets(savedPresets, saved.stations.length))
          setCurrentIndex(Math.max(0, saved.stations.findIndex((station) => station.id === saved.currentId)))
        }
        if (typeof saved.volume === 'number') setVolume(Math.min(1, Math.max(0, saved.volume)))
        if (typeof saved.colorId === 'string') setColorId(findDisplayColor(saved.colorId).id)
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY)
    }
    setIsHydrated(true)
  }, [])

  useEffect(() => {
    if (!isHydrated) return
    const state: SavedState = { stations, presetIds, currentId: currentStation?.id ?? null, volume, colorId }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [isHydrated, stations, presetIds, currentStation?.id, volume, colorId])

  useEffect(() => {
    applyDisplayColor(findDisplayColor(colorId))
  }, [colorId])

  function changeColor(nextColorId: string) {
    setColorId(nextColorId)
    showFlash(`KOLOR: ${findDisplayColor(nextColorId).label.toUpperCase()}`)
  }

  useEffect(() => {
    if (!isOn || !currentUrl) {
      stop()
      return
    }
    const timer = setTimeout(() => play(currentUrl), settleDelayRef.current)
    settleDelayRef.current = TUNE_SETTLE_MS
    return () => clearTimeout(timer)
  }, [isOn, currentUrl, play, stop])

  const tune = useCallback(
    (direction: 1 | -1) => {
      const count = stations.length
      if (count === 0) return
      settleDelayRef.current = TUNE_SETTLE_MS
      setCurrentIndex((index) => (index + direction + count) % count)
    },
    [stations.length],
  )

  const togglePower = useCallback(() => {
    if (stations.length === 0) {
      showFlash('NAJPIERW WGRAJ LISTĘ M3U')
      return
    }
    settleDelayRef.current = 0
    setIsOn((on) => !on)
  }, [stations.length, showFlash])

  function changeVolume(next: number) {
    setVolume(next)
    showFlash(`VOL ${Math.round(next * VOLUME_STEPS)}`)
  }

  function selectPreset(presetIndex: number) {
    const stationId = presetIds[presetIndex]
    const index = stationId ? stations.findIndex((station) => station.id === stationId) : -1
    if (index < 0) {
      showFlash(`P${presetIndex + 1} PUSTY — PRZYTRZYMAJ, ABY ZAPISAĆ`)
      return
    }
    settleDelayRef.current = 0
    setCurrentIndex(index)
    setIsOn(true)
  }

  function storePreset(presetIndex: number) {
    if (!currentStation) return
    setPresetIds((ids) => ids.map((id, index) => (index === presetIndex ? currentStation.id : id)))
    showFlash(`ZAPISANO NA P${presetIndex + 1}`)
  }

  function loadPlaylist(content: string) {
    const parsed = parseM3U(content)
    if (parsed.length === 0) {
      showFlash('BŁĄD: PLIK NIE ZAWIERA STACJI')
      return
    }
    setStations(parsed)
    setPresetIds(buildPresets(parsed.map((station) => station.id), parsed.length))
    setPresetBank(0)
    settleDelayRef.current = 0
    setCurrentIndex(0)
    setIsOn(true)
    showFlash(`WCZYTANO ${parsed.length} ${stationsLabel(parsed.length)}`)
  }

  useEffect(() => {
    if (!('mediaSession' in navigator) || !currentStation) return
    navigator.mediaSession.metadata = new MediaMetadata({
      title: streamTitle ?? currentStation.name,
      artist: currentStation.name,
      album: 'Car Radio Classic',
      artwork: [
        currentStation.logo
          ? { src: currentStation.logo }
          : { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      ],
    })
  }, [currentStation, streamTitle])

  useEffect(() => {
    if (!('mediaSession' in navigator)) return
    const session = navigator.mediaSession
    session.setActionHandler('play', () => setIsOn(true))
    session.setActionHandler('pause', () => setIsOn(false))
    session.setActionHandler('stop', () => setIsOn(false))
    session.setActionHandler('nexttrack', () => tune(1))
    session.setActionHandler('previoustrack', () => tune(-1))
    return () => {
      for (const action of ['play', 'pause', 'stop', 'nexttrack', 'previoustrack'] as const) {
        session.setActionHandler(action, null)
      }
    }
  }, [tune])

  const presetStations = useMemo(
    () => presetIds.map((id) => stations.find((station) => station.id === id) ?? null),
    [presetIds, stations],
  )
  const activePresetIndex = currentStation ? presetIds.indexOf(currentStation.id) : -1

  useEffect(() => {
    if (activePresetIndex >= 0) setPresetBank(Math.floor(activePresetIndex / PRESETS_PER_BANK))
  }, [activePresetIndex])

  const rdsText = (() => {
    if (flash) return flash
    if (!currentStation) return 'Wgraj listę M3U, aby rozpocząć'
    if (!isOn) return 'Naciśnij POWER, aby słuchać'
    if (status === 'loading') return 'Strojenie…'
    if (status === 'error') return 'Brak sygnału — stacja niedostępna'
    return streamTitle ?? currentStation.group ?? `${currentStation.name} — na żywo`
  })()

  const hasStations = stations.length > 0

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-3 sm:p-6 short:gap-1 short:p-2">
      <section
        aria-label="Radio samochodowe"
        className="faceplate flex w-full max-w-6xl flex-col gap-5 rounded-3xl p-4 sm:gap-6 sm:p-6 short:gap-2 short:p-3"
      >
        <header className="flex items-center justify-between px-1 text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground short:hidden">
          <span>Car Radio Classic</span>
          <span>FM · RDS · M3U</span>
        </header>

        <div className="grid grid-cols-2 items-center gap-5 md:grid-cols-[auto_minmax(0,1fr)_auto] md:gap-8 short:grid-cols-[auto_minmax(0,1fr)_auto] short:gap-3">
          <div className="flex flex-col items-center gap-4 short:gap-2">
            <RotaryKnob
              mode="continuous"
              label="Volume"
              ariaLabel="Głośność"
              valueText={`Głośność ${Math.round(volume * VOLUME_STEPS)} z ${VOLUME_STEPS}`}
              value={volume}
              onChange={changeVolume}
            />
            <button
              type="button"
              onClick={togglePower}
              aria-pressed={isOn}
              className="hw-button flex h-14 w-full max-w-40 items-center justify-center gap-2 rounded-xl text-sm font-bold uppercase tracking-[0.2em] text-foreground outline-none focus-visible:ring-4 focus-visible:ring-ring/60 short:h-11"
            >
              <span
                aria-hidden="true"
                className={cn(
                  'size-2 rounded-full transition-colors',
                  isOn ? 'bg-primary shadow-[0_0_8px_var(--primary)]' : 'bg-background',
                )}
              />
              <Power className="size-5" aria-hidden="true" />
              Power
            </button>
          </div>

          <RadioDisplay
            className="order-first col-span-2 md:order-none md:col-span-1 short:order-none short:col-span-1"
            frequency={currentStation ? stationFrequency(currentIndex, stations.length) : null}
            stationName={currentStation?.name ?? null}
            rdsText={rdsText}
            stationPosition={currentStation ? currentIndex + 1 : null}
            stationCount={stations.length}
            presetNumber={activePresetIndex >= 0 ? activePresetIndex + 1 : null}
            status={status}
            isOn={isOn}
          />

          <div className="flex flex-col items-center gap-4 short:gap-2">
            <RotaryKnob
              mode="stepped"
              label="Tune"
              ariaLabel="Strojenie stacji"
              valueText={currentStation ? `${currentStation.name}, stacja ${currentIndex + 1} z ${stations.length}` : 'Brak stacji'}
              onStep={tune}
              disabled={!hasStations}
            />
            <div className="flex w-full max-w-40 gap-3">
              <button
                type="button"
                onClick={() => tune(-1)}
                disabled={!hasStations}
                aria-label="Poprzednia stacja"
                className="hw-button flex h-14 flex-1 items-center justify-center rounded-xl text-foreground outline-none focus-visible:ring-4 focus-visible:ring-ring/60 disabled:opacity-40 short:h-11"
              >
                <ChevronsLeft className="size-6" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => tune(1)}
                disabled={!hasStations}
                aria-label="Następna stacja"
                className="hw-button flex h-14 flex-1 items-center justify-center rounded-xl text-foreground outline-none focus-visible:ring-4 focus-visible:ring-ring/60 disabled:opacity-40 short:h-11"
              >
                <ChevronsRight className="size-6" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>

        <PresetButtons
          presets={presetStations}
          bank={presetBank}
          onBankChange={setPresetBank}
          activePresetIndex={activePresetIndex >= 0 ? activePresetIndex : null}
          onSelect={selectPreset}
          onStore={storePreset}
          canStore={currentStation !== null}
        />
      </section>

      <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-1">
        <ColorPicker value={colorId} onChange={changeColor} />
        <PlaylistLoader onLoad={loadPlaylist} />
      </div>
    </div>
  )
}
