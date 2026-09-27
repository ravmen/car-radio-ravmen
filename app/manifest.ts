import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Car Radio Classic',
    short_name: 'Car Radio',
    description: 'Klasyczne radio samochodowe FM z własną listą stacji M3U.',
    start_url: '/',
    display: 'fullscreen',
    orientation: 'any',
    background_color: '#0d0f12',
    theme_color: '#0d0f12',
    lang: 'pl',
    icons: [
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
