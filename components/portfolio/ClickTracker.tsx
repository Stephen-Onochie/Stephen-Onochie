'use client'

import { useEffect } from 'react'
import { isOwnerBrowser } from '@/lib/site-analytics/visitor'

const TRACK_ENDPOINT = '/api/public/track-click'

function send(target: string) {
  const body = JSON.stringify({ target, path: window.location.pathname })
  // sendBeacon survives the page unloading when a link navigates away.
  const queued = navigator.sendBeacon?.(TRACK_ENDPOINT, new Blob([body], { type: 'application/json' }))
  if (!queued) {
    void fetch(TRACK_ENDPOINT, { method: 'POST', body, keepalive: true, headers: { 'Content-Type': 'application/json' } })
  }
}

// One delegated listener records clicks on any element marked data-track.
// auxclick covers middle-click "open in new tab".
export default function ClickTracker() {
  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (event.type === 'auxclick' && event.button !== 1) return
      const el = (event.target as Element | null)?.closest<HTMLElement>('[data-track]')
      const target = el?.dataset.track
      if (!target || isOwnerBrowser()) return
      send(target)
    }
    document.addEventListener('click', onClick, true)
    document.addEventListener('auxclick', onClick, true)
    return () => {
      document.removeEventListener('click', onClick, true)
      document.removeEventListener('auxclick', onClick, true)
    }
  }, [])

  return null
}
