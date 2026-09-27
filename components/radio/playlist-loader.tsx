'use client'

import { Upload } from 'lucide-react'
import { useRef, type ChangeEvent } from 'react'

type PlaylistLoaderProps = {
  onLoad: (content: string, fileName: string) => void
}

export function PlaylistLoader({ onLoad }: PlaylistLoaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    onLoad(await file.text(), file.name)
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={handleChange}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="flex min-h-12 items-center gap-2 rounded-full px-5 text-sm font-medium tracking-wide text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-4 focus-visible:ring-ring/60"
      >
        <Upload className="size-4" aria-hidden="true" />
        Wgraj własną listę stacji M3U
      </button>
    </>
  )
}
