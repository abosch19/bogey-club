import { useEffect, useState } from 'react'
import { useConvex } from 'convex/react'
import { currentPushState, enablePush, disablePush, PushState } from '@/lib/push'

const SUBTITLE: Record<PushState | 'loading' | 'unavailable', string> = {
  loading: 'Comprobando…',
  unsupported: 'Tu navegador no las soporta',
  unavailable: 'Disponibles solo en la app instalada',
  denied: 'Bloqueadas — actívalas en los ajustes del navegador',
  off: 'Nuevas partidas y avisos de liga',
  on: 'Activadas en este dispositivo',
}

/** Profile card to enable/disable Web Push on this device. */
export function PushSettings() {
  const convex = useConvex()
  const [state, setState] = useState<PushState | 'loading' | 'unavailable'>('loading')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    currentPushState().then(s => {
      if (!cancelled) setState(s)
    })
    return () => {
      cancelled = true
    }
  }, [])

  async function toggle() {
    setBusy(true)
    try {
      setState(state === 'on' ? await disablePush(convex) : await enablePush(convex))
    } catch {
      setState('unavailable')
    }
    setBusy(false)
  }

  if (state === 'unsupported') return null

  const canToggle = state === 'on' || state === 'off'
  const isOn = state === 'on'

  return (
    <div className="flex items-center gap-3 bg-white rounded-[16px] px-4 py-3.5 border border-[#e5e0d4]">
      <div className="w-9 h-9 rounded-full bg-[#f6e6c4] flex items-center justify-center">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path
            d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0"
            stroke="#9b6e1a"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <div className="flex-1">
        <p className="font-semibold text-[14px] text-[#0e1a16]">Notificaciones</p>
        <p className="text-[11px] text-[#6b7a72]">{SUBTITLE[state]}</p>
      </div>
      {canToggle && (
        <button
          type="button"
          onClick={toggle}
          disabled={busy}
          aria-label={isOn ? 'Desactivar notificaciones' : 'Activar notificaciones'}
          className="w-12 h-7 rounded-full transition flex-shrink-0 disabled:opacity-60"
          style={{ backgroundColor: isOn ? '#1f8a5b' : '#e5e0d4' }}
        >
          <span
            className="block w-5 h-5 rounded-full bg-white shadow transition-transform"
            style={{ transform: isOn ? 'translateX(26px)' : 'translateX(4px)' }}
          />
        </button>
      )}
    </div>
  )
}
