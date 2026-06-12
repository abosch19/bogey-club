import { useState, Suspense } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { useMutation } from 'convex/react'
import { api } from '@convex/_generated/api'
import { Id } from '@convex/_generated/dataModel'
import { GAME_MODES, type GameMode } from '@/lib/types'
import { lastRound$ } from '@/lib/store'

// Stroke Play — hidden when Scramble is active
function StrokePlayCard() {
  return (
    <div className="rounded-btn p-4 border-2" style={{ backgroundColor: '#0e1a16', borderColor: '#0e1a16' }}>
      <div className="flex items-center gap-3">
        <div
          className="w-11 h-11 rounded-field flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: '#1f8a5b' }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 3v18" />
            <path d="M5 4h11l-2 3 2 3H5" />
          </svg>
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-white font-bold text-[15px]">Stroke Play</span>
            <span className="font-mono text-[8px] bg-white/20 text-white px-2 py-0.5 rounded-full uppercase tracking-wide">
              Siempre activo
            </span>
          </div>
          <p className="text-white/60 text-[12px] mt-0.5">Suma de golpes. Gana quien menos haga.</p>
        </div>
        <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: '#1f8a5b' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
            <path d="M5 13l4 4L19 7" stroke="#0e1a16" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
    </div>
  )
}

type ModeOptionCardProps = {
  mode: (typeof GAME_MODES)[number]
  compatible: boolean
  isSelected: boolean
  isDisabled: boolean
  expanded: boolean
  onActivate: () => void
  onToggleInfo: () => void
}

function ModeOptionCard({
  mode,
  compatible,
  isSelected,
  isDisabled,
  expanded,
  onActivate,
  onToggleInfo,
}: ModeOptionCardProps) {
  return (
    <div
      className="relative w-full text-left rounded-btn p-4 border transition-all active:scale-[0.99]"
      style={{
        backgroundColor: isSelected ? '#0e1a16' : '#ffffff',
        borderColor: isSelected ? '#0e1a16' : '#e5e0d4',
        opacity: isDisabled ? 0.35 : 1,
      }}
    >
      <button
        type="button"
        onClick={onActivate}
        disabled={isDisabled}
        aria-label={mode.name}
        className="absolute inset-0 rounded-btn"
        style={{ cursor: isDisabled ? 'default' : 'pointer' }}
      />
      <div className="relative pointer-events-none flex items-center gap-3">
        <div
          className="w-11 h-11 rounded-field flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: isSelected ? 'rgba(255,255,255,0.12)' : mode.color + '22' }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke={isSelected ? '#fff' : mode.color}
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {mode.icon === 'swords' && (
              <>
                <path d="M4 4l8 8M3 7l3-3 2 2M20 4l-8 8M21 7l-3-3-2 2M14 14l6 6M10 18l-4 4" />
              </>
            )}
            {mode.icon === 'star' && <path d="M12 3l2.6 5.6L20 9.3l-4 4 1 6-5-2.9L7 19.3l1-6-4-4 5.4-.7z" />}
            {mode.icon === 'wolf' && (
              <>
                <path d="M4 5l3 4M20 5l-3 4M5 8c0 7 3 11 7 11s7-4 7-11" />
                <path d="M9 11h.01M15 11h.01" />
              </>
            )}
            {mode.icon === 'target' && (
              <>
                <circle cx="12" cy="12" r="8" />
                <circle cx="12" cy="12" r="4" />
              </>
            )}
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[14px]" style={{ color: isSelected ? '#fff' : '#0e1a16' }}>
              {mode.name}
            </span>
            {!compatible && (
              <span className="font-mono text-[8px] bg-amber-light text-amber-dark px-2 py-0.5 rounded-full uppercase">
                {mode.players} jug.
              </span>
            )}
          </div>
          <p className="text-[12px] mt-0.5" style={{ color: isSelected ? 'rgba(255,255,255,0.55)' : '#6b7a72' }}>
            {mode.desc}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {isSelected && (mode.id === 'wolf' || mode.id === 'bbb') && (
            <button
              type="button"
              aria-label="Cómo funciona esta modalidad"
              onClick={e => {
                e.stopPropagation()
                onToggleInfo()
              }}
              className="pointer-events-auto relative w-6 h-6 rounded-full flex items-center justify-center text-white/70 font-bold text-[12px]"
              style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}
            >
              ?
            </button>
          )}
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
            style={{
              backgroundColor: isSelected ? '#1f8a5b' : 'transparent',
              border: isSelected ? 'none' : '1.5px solid #e5e0d4',
            }}
          >
            {isSelected && (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <path
                  d="M5 13l4 4L19 7"
                  stroke="#0e1a16"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </div>
        </div>
      </div>
      {isSelected && expanded && (
        <div className="mt-2 p-3 rounded-[10px] bg-paper">
          {mode.id === 'wolf' && (
            <p className="text-[11px] text-mute">
              Cada hoyo, un jugador es el "lobo". Antes de empezar el hoyo decide: elegir pareja (y competir juntos) o
              ir solo (si gana, dobles puntos). Rota entre todos los jugadores.
            </p>
          )}
          {mode.id === 'bbb' && (
            <p className="text-[11px] text-mute">
              3 puntos por hoyo: Bingo (1º en llegar al green), Bango (más cerca del hoyo cuando todos están en green),
              Bongo (1º en embocar). Al anotar cada hoyo se reparten los 3 puntos.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

type FooterCtaProps = {
  extras: GameMode[]
  isScrambleSelected: boolean
  loading: boolean
  onStart: () => void
}

function FooterCta({ extras, isScrambleSelected, loading, onStart }: FooterCtaProps) {
  return (
    <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] px-[14px] pb-8 pt-4 bg-gradient-to-t from-paper to-transparent">
      <button
        type="button"
        onClick={onStart}
        disabled={loading}
        className="w-full flex items-center justify-between px-5 py-4 rounded-full font-bold text-[14px] transition active:scale-[0.98] disabled:opacity-60"
        style={{ backgroundColor: '#1f8a5b', color: '#0e1a16' }}
      >
        <span>
          {isScrambleSelected
            ? 'Scramble'
            : `Stroke${extras.length > 0 ? ` + ${extras.map(e => GAME_MODES.find(m => m.id === e)?.name.split(' ')[0]).join(' + ')}` : ' Play'}`}
        </span>
        <span className="bg-ink text-white text-[12px] font-bold px-3 py-1.5 rounded-full">
          {loading ? '…' : 'EMPEZAR →'}
        </span>
      </button>
    </div>
  )
}

function SeleccionarModalidadPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const courseId = searchParams.get('course') ?? ''
  const playerIds = searchParams.get('players')?.split(',').filter(Boolean) ?? []
  const guests = searchParams.get('guests')?.split('|').filter(Boolean) ?? []
  const leagueId = searchParams.get('league') ?? ''
  const holeMode = searchParams.get('hole_mode') ?? 'all'
  const preMode = searchParams.get('mode') ?? ''
  const scrambleTeams = searchParams.get('scramble_teams') ?? ''
  const totalPlayers = playerIds.length + guests.length

  // Stroke is always active
  const [extras, setExtras] = useState<GameMode[]>(preMode === 'scramble' ? ['scramble'] : [])
  const [loading, setLoading] = useState(false)
  const [bet, setBet] = useState('')
  const [expandedMode, setExpandedMode] = useState<string | null>(null)
  const createRound = useMutation(api.rounds.create)

  function isCompatible(mode: GameMode): boolean {
    if (mode === 'matchplay' || mode === 'matchplay_hcp') return totalPlayers === 2
    if (mode === 'wolf') return totalPlayers >= 3
    if (mode === 'bbb') return totalPlayers >= 2
    // Scramble: 2 players = same team OK; 4+ players need even number for 2 teams
    if (mode === 'scramble') return totalPlayers === 2 || (totalPlayers >= 4 && totalPlayers % 2 === 0)
    return true
  }

  function toggleExtra(mode: GameMode) {
    if (extras.includes(mode)) {
      setExtras(extras.filter(m => m !== mode))
      setExpandedMode(null)
    } else {
      if (extras.length >= 2) return
      setExtras([...extras, mode])
      if (mode === 'wolf' || mode === 'bbb') setExpandedMode(mode)
    }
  }

  async function handleStart() {
    setLoading(true)
    try {
      // Scramble: 2 players = same team, no assignment needed
      // 4+ players = go to parejas for manual team assignment
      if (isScrambleSelected && !scrambleTeams && totalPlayers >= 4) {
        const params = new URLSearchParams({
          course: courseId,
          players: playerIds.join(','),
          hole_mode: holeMode,
          ...(leagueId ? { league: leagueId } : {}),
        })
        navigate(`/round/pairs?${params}`)
        setLoading(false)
        return
      }

      // Scramble replaces stroke — no individual player scores
      const modes = isScrambleSelected ? extras : ['stroke', ...extras]
      const data = await createRound({
        course_id: courseId as Id<'courses'>,
        player_ids: playerIds as Id<'profiles'>[],
        guests,
        modes,
        hole_mode: holeMode,
        ...(leagueId ? { league_id: leagueId as Id<'leagues'> } : {}),
        ...(scrambleTeams ? { scramble_teams: scrambleTeams } : {}),
      })
      // Save last round config for quick-start (persisted via Legend State)
      const courseName = searchParams.get('course_name') ?? courseId
      lastRound$.set({
        course_id: courseId,
        course_name: courseName,
        player_ids: playerIds,
        guests,
        modes,
        hole_mode: holeMode,
        ...(leagueId ? { league_id: leagueId } : {}),
        ...(scrambleTeams ? { scramble_teams: scrambleTeams } : {}),
      })
      navigate(`/scorecard?round=${data.round_id}`)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al crear la ronda'
      alert(msg)
      setLoading(false)
    }
  }

  const isScrambleSelected = extras.includes('scramble')
  const modesByCompat = GAME_MODES.filter(m => m.id !== 'stroke')

  return (
    <div className="min-h-screen bg-paper flex flex-col">
      <div className="safe-top px-[14px] pt-3 pb-4">
        <div className="flex items-center justify-between mb-5">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-ink font-semibold text-[13px]"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M19 12H5M5 12l7-7M5 12l7 7"
                stroke="#0e1a16"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Atrás
          </button>
          <span className="font-mono text-[10px] text-mute uppercase tracking-[0.15em]">NUEVA RONDA · 3 / 3</span>
        </div>

        <h1 className="text-[28px] font-black tracking-tight text-ink leading-tight">
          ¿A qué
          <br />
          <span className="text-accent">jugamos?</span>
        </h1>
        <div className="flex items-center gap-2 mt-1">
          <p className="text-[13px] text-mute">
            {isScrambleSelected
              ? 'Scramble activo — sin resultado individual.'
              : 'Stroke Play siempre activo. Añade hasta 2 más.'}
          </p>
          {leagueId && (
            <span className="font-mono text-[9px] bg-blue-light text-blue px-2 py-0.5 rounded-full uppercase font-bold">
              LIGA
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 px-[14px] pb-32 space-y-2 overflow-y-auto">
        {!isScrambleSelected && <StrokePlayCard />}

        {/* Other modes */}
        {modesByCompat.map(mode => {
          const compatible = isCompatible(mode.id)
          const isSelected = extras.includes(mode.id)
          const isMaxed = extras.length >= 2 && !isSelected
          const isDisabled = !compatible || isMaxed
          return (
            <ModeOptionCard
              key={mode.id}
              mode={mode}
              compatible={compatible}
              isSelected={isSelected}
              isDisabled={isDisabled}
              expanded={expandedMode === mode.id}
              onActivate={() => {
                if (!isDisabled) toggleExtra(mode.id)
              }}
              onToggleInfo={() => setExpandedMode(expandedMode === mode.id ? null : mode.id)}
            />
          )
        })}
        {/* Hint: añade Stableford si solo tienes Stroke */}
        {extras.length === 0 && (
          <div className="bg-amber-light rounded-field px-4 py-3 flex gap-2">
            <span className="text-[16px]">💡</span>
            <p className="text-[12px] text-amber-dark">
              Añade <strong>Stableford</strong> para ver puntos en tiempo real en la tarjeta. Ideal para nivelar con el
              handicap.
            </p>
          </div>
        )}

        {/* Apuesta */}
        <div className="bg-white rounded-btn border border-rule p-4">
          <label htmlFor="apuesta" className="font-mono text-[9px] text-mute uppercase tracking-wide block mb-2">
            Apuesta (opcional)
          </label>
          <input
            id="apuesta"
            aria-label="Apuesta (opcional)"
            value={bet}
            onChange={e => setBet(e.target.value)}
            placeholder="El que pierde paga las cervezas..."
            className="w-full text-[14px] text-ink bg-transparent outline-none placeholder-faint"
          />
        </div>
      </div>

      {/* CTA */}
      <FooterCta extras={extras} isScrambleSelected={isScrambleSelected} loading={loading} onStart={handleStart} />
    </div>
  )
}

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-paper flex items-center justify-center">
          <div className="w-7 h-7 rounded-full border-2 border-accent border-t-transparent animate-spin" />
        </div>
      }
    >
      <SeleccionarModalidadPage />
    </Suspense>
  )
}
