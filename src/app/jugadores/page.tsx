'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { formatHandicap } from '@/lib/golf'

type Player = {
  id: string
  name: string
  handicap_index: number
  avatar_color: string
  rounds: number
  best_score: number | null
}

export default function JugadoresPage() {
  const [players, setPlayers] = useState<Player[]>([])
  const [myId, setMyId]       = useState('')
  const [search, setSearch]   = useState('')
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }
      setMyId(user.id)

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name, handicap_index, avatar_color')
        .order('handicap_index', { ascending: true })

      if (!profiles?.length) { setLoading(false); return }

      // Get round counts and best scores
      const { data: rps } = await supabase
        .from('round_players')
        .select('profile_id, round_id')
        .in('profile_id', profiles.map(p => p.id))

      const { data: completedRounds } = await supabase
        .from('rounds')
        .select('id, status')
        .eq('status', 'completed')

      const completedIds = new Set((completedRounds ?? []).map(r => r.id))

      // Count rounds per player
      const roundCounts: Record<string, number> = {}
      for (const rp of rps ?? []) {
        if (completedIds.has(rp.round_id)) {
          roundCounts[rp.profile_id] = (roundCounts[rp.profile_id] ?? 0) + 1
        }
      }

      setPlayers(profiles.map(p => ({
        ...p,
        rounds: roundCounts[p.id] ?? 0,
        best_score: null,
      })))
      setLoading(false)
    }
    load()
  }, [])

  const filtered = players.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return (
    <div className="min-h-screen bg-[#f4f1e9] flex items-center justify-center">
      <div className="w-7 h-7 rounded-full border-2 border-[#1f8a5b] border-t-transparent animate-spin"/>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#f4f1e9] pb-8">
      <div className="safe-top px-[14px] pt-3 pb-4">
        <div className="flex items-center gap-3 mb-4">
          <Link href="/perfil" className="flex items-center gap-1.5 text-[#0e1a16] font-semibold text-[13px]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M19 12H5M5 12l7-7M5 12l7 7" stroke="#0e1a16" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Perfil
          </Link>
        </div>

        <h1 className="text-[26px] font-black tracking-tight text-[#0e1a16] mb-4">El club</h1>

        {/* Search */}
        <div className="flex items-center gap-3 bg-white rounded-full px-4 py-3 border border-[#e5e0d4] mb-4">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="#6b7a72" strokeWidth="1.8"/><path d="M16 16L21 21" stroke="#6b7a72" strokeWidth="1.8" strokeLinecap="round"/></svg>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar jugador…"
            className="flex-1 bg-transparent text-[14px] text-[#0e1a16] placeholder-[#a09a90] outline-none"/>
        </div>

        <div className="space-y-2">
          {filtered.map((p, i) => (
            <div key={p.id} className={`bg-white rounded-[16px] p-4 border flex items-center gap-3 ${p.id === myId ? 'border-[#1f8a5b]' : 'border-[#e5e0d4]'}`}>
              <span className="font-mono text-[12px] font-bold text-[#6b7a72] w-5 text-center">{i + 1}</span>
              <div className="w-11 h-11 rounded-full flex items-center justify-center text-white text-[15px] font-bold flex-shrink-0"
                style={{ backgroundColor: p.avatar_color }}>
                {p.name[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-[14px] text-[#0e1a16]">{p.name}</p>
                  {p.id === myId && <span className="font-mono text-[8px] text-[#1f8a5b] bg-[#d9eedd] px-1.5 py-0.5 rounded-full uppercase">Tú</span>}
                </div>
                <p className="text-[11px] text-[#6b7a72] mt-0.5">{p.rounds} ronda{p.rounds !== 1 ? 's' : ''}</p>
              </div>
              <div className="text-right">
                <p className="font-mono text-[11px] text-[#6b7a72] uppercase">HCP</p>
                <p className="font-mono text-[18px] font-black text-[#0e1a16]">{formatHandicap(p.handicap_index)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
