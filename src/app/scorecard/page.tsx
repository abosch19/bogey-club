import { Skeleton } from '@/components/ui/skeleton'
import { useSearchParams, useNavigate } from 'react-router'
import { useState, Suspense } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { useSelector } from '@legendapp/state/react'
import { api } from '@convex/_generated/api'
import { Id } from '@convex/_generated/dataModel'
import { strokesReceived } from '@/lib/golf'
import { pendingHoles$, pendingForRound, PendingHole } from '@/lib/offline-scores'
import { Drawer } from 'vaul'
import { HoleSheet } from '@/components/HoleSheet'
import { Avatar } from '@/components/ui/avatar'
import { PlayerLink } from '@/components/ui/player-link'
import { ShareScorecardButton } from '@/components/ShareScorecard'
import { Segmented } from '@/components/ui/segmented'
import { HeroCard } from '@/components/ui/hero-card'
import { ScoreTable, type Player, type Hole, type ViewMode } from '@/components/ScorecardTable'
import { ScoreLegend } from '@/components/ScoreLegend'
import { RoundStats, type Score } from '@/components/RoundStats'

const SPINNER = (
  <div className="min-h-screen bg-paper pb-28 px-[14px]" style={{ paddingTop: 'max(14px, env(safe-area-inset-top))' }}>
    <Skeleton className="h-28 rounded-card mb-4" />
    <Skeleton className="h-10 rounded-full mb-3" />
    <Skeleton className="h-96 rounded-card" />
  </div>
)

type ClasificacionProps = {
  ranking: Player[]
  getTotal: (pid: string) => number
  realPar: number
}

function scoreDeltaLabel(delta: number): string {
  if (delta === 0) return 'E'
  return delta > 0 ? `+${delta}` : `${delta}`
}

function scoreDeltaColor(delta: number): string {
  if (delta <= 0) return '#7dd3a8'
  if (delta <= 9) return '#e8b75a'
  return '#ff9a83'
}

function modeLabel(mode: string): string {
  if (mode === 'stroke') return 'Stroke'
  if (mode === 'stableford') return 'Stableford'
  if (mode === 'matchplay_hcp') return 'Matchplay Hcp'
  return mode
}

function Clasificacion({ ranking, getTotal, realPar }: ClasificacionProps) {
  return (
    <div className="space-y-2">
      {ranking.map((p, i) => {
        const total = getTotal(p.id)
        const delta = total && realPar > 0 ? total - realPar : null
        const isFirst = i === 0
        return (
          <div
            key={p.id}
            className="rounded-btn p-4 border flex items-center gap-3"
            style={{ backgroundColor: isFirst ? '#0e1a16' : '#fff', borderColor: isFirst ? '#0e1a16' : '#e5e0d4' }}
          >
            <div
              className="w-8 h-8 rounded-[8px] flex items-center justify-center font-mono font-black text-[14px]"
              style={{ backgroundColor: isFirst ? '#e8b75a' : '#f4f1e9', color: isFirst ? '#0e1a16' : '#6b7a72' }}
            >
              {i + 1}
            </div>
            <PlayerLink profileId={p.is_guest ? null : p.id}>
              <Avatar name={p.name} src={p.avatar_url} size={40} />
            </PlayerLink>
            <div className="flex-1">
              <p className="font-bold text-[15px]" style={{ color: isFirst ? '#fff' : '#0e1a16' }}>
                {p.name}
              </p>
              <p className="font-mono text-[10px]" style={{ color: isFirst ? 'rgba(255,255,255,0.5)' : '#6b7a72' }}>
                Hcp {p.course_handicap}
              </p>
            </div>
            <div className="text-right">
              <p
                className="font-mono text-[22px] font-black leading-none"
                style={{ color: isFirst ? '#fff' : '#0e1a16' }}
              >
                {total || '–'}
              </p>
              {delta !== null && (
                <p
                  className="font-mono text-[11px] font-bold mt-0.5"
                  style={{ color: delta <= 0 ? '#1f8a5b' : '#e8b75a' }}
                >
                  {delta > 0 ? `+${delta}` : delta === 0 ? 'E' : delta}
                </p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

type BetControlProps = {
  roundId: string
  customBet: string
}

function BetControl({ roundId, customBet }: BetControlProps) {
  const [betEdit, setBetEdit] = useState<string | null>(null)
  const [showBetModal, setShowBetModal] = useState(false)
  const [savingBet, setSavingBet] = useState(false)
  const setBetMut = useMutation(api.rounds.setBet)

  // Bet input value: derived from notes, overridden by the user's edit (if any)
  const bet = betEdit ?? customBet

  return (
    <>
      {/* Bet button */}
      <button
        type="button"
        onClick={() => setShowBetModal(true)}
        className="flex items-center gap-1 px-2 py-1 rounded-full border transition"
        style={{ backgroundColor: bet ? '#f6e6c4' : '#f4f1e9', borderColor: bet ? '#e8b75a' : '#e5e0d4' }}
        title={bet || 'Añadir apuesta'}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"
            fill={bet ? '#9b6e1a' : '#6b7a72'}
          />
        </svg>
        <span className="font-mono text-[9px] font-bold" style={{ color: bet ? '#9b6e1a' : '#6b7a72' }}>
          {bet ? 'Apuesta' : 'Apostar'}
        </span>
      </button>

      {/* Bet bottom sheet (Vaul) */}
      <Drawer.Root open={showBetModal} onOpenChange={setShowBetModal}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-50" style={{ backgroundColor: 'rgba(14,26,22,0.5)' }} />
          <Drawer.Content className="fixed bottom-0 inset-x-0 z-50 mx-auto max-w-[430px] bg-white rounded-t-[28px] p-5 pb-10 outline-none">
            <div className="w-10 h-1 rounded-full bg-rule mx-auto mb-4" />
            <Drawer.Title className="text-[18px] font-black text-ink mb-1">Apuesta de la ronda</Drawer.Title>
            <Drawer.Description className="text-[12px] text-mute mb-4">
              El que pierda tiene que cumplirla. Se mostrará al firmar.
            </Drawer.Description>
            <input
              aria-label="Apuesta de la ronda"
              value={bet}
              onChange={e => setBetEdit(e.target.value)}
              placeholder="Ej: el que pierde paga las cervezas..."
              className="w-full border-2 border-rule rounded-btn px-4 py-3 text-[14px] text-ink outline-none focus:border-amber mb-4"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowBetModal(false)}
                className="flex-1 py-3 rounded-full border border-rule font-semibold text-[14px] text-mute"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={savingBet}
                onClick={async () => {
                  setSavingBet(true)
                  await setBetMut({ round_id: roundId as Id<'rounds'>, bet: bet || null })
                  setSavingBet(false)
                  setShowBetModal(false)
                }}
                className="flex-1 py-3 rounded-full font-bold text-[14px] text-ink disabled:opacity-60"
                style={{ backgroundColor: '#e8b75a' }}
              >
                {savingBet ? 'Guardando...' : bet ? 'Guardar apuesta' : 'Quitar apuesta'}
              </button>
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </>
  )
}

type EditPlayersControlProps = {
  roundId: string
  myId: string
  players: Player[]
  allProfiles: { _id: string; name: string; avatar_url?: string | null }[] | undefined
  isPractice: boolean
  isActive: boolean
}

function EditPlayersControl({ roundId, myId, players, allProfiles, isPractice, isActive }: EditPlayersControlProps) {
  const navigate = useNavigate()
  const [showEditPlayers, setShowEditPlayers] = useState(false)
  const addPlayerMut = useMutation(api.roundPlayers.add)
  const removePlayerMut = useMutation(api.roundPlayers.remove)
  const removeRoundMut = useMutation(api.rounds.remove)

  async function addPlayer(profileId: string) {
    await addPlayerMut({ roundId: roundId as Id<'rounds'>, profileId: profileId as Id<'profiles'> })
  }

  async function removePlayer(profileId: string) {
    if (!confirm('¿Eliminar este jugador de la ronda?')) return
    await removePlayerMut({ roundId: roundId as Id<'rounds'>, profileId: profileId as Id<'profiles'> })
  }

  return (
    <>
      {/* Edit players button */}
      <button
        type="button"
        onClick={() => setShowEditPlayers(true)}
        aria-label="Editar jugadores"
        className="w-8 h-8 rounded-full bg-paper border border-rule flex items-center justify-center"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path
            d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"
            stroke="#6b7a72"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <circle cx="9" cy="7" r="4" stroke="#6b7a72" strokeWidth="1.8" />
          <path
            d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"
            stroke="#6b7a72"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      </button>

      {/* Edit players bottom sheet (Vaul) */}
      <Drawer.Root open={showEditPlayers} onOpenChange={setShowEditPlayers}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-50" style={{ backgroundColor: 'rgba(14,26,22,0.5)' }} />
          <Drawer.Content
            aria-describedby={undefined}
            className="fixed bottom-0 inset-x-0 z-50 mx-auto max-w-[430px] bg-white rounded-t-[28px] p-5 pb-10 max-h-[85vh] overflow-y-auto outline-none"
          >
            <div className="w-10 h-1 rounded-full bg-rule mx-auto mb-4" />
            <div className="flex items-center justify-between mb-4">
              <Drawer.Title className="text-[18px] font-black text-ink">Jugadores</Drawer.Title>
              <button
                type="button"
                onClick={() => setShowEditPlayers(false)}
                aria-label="Cerrar"
                className="text-mute text-[20px]"
              >
                ×
              </button>
            </div>
            {/* Current players */}
            <p className="font-mono text-[9px] text-mute uppercase tracking-wide mb-2">En esta ronda</p>
            <div className="space-y-2 mb-4">
              {players.map(p => (
                <div key={p.id} className="flex items-center gap-3 bg-paper rounded-field px-3 py-2.5">
                  <Avatar name={p.name} src={p.avatar_url} size={32} />
                  <span className="flex-1 font-semibold text-[13px] text-ink">{p.name}</span>
                  <span className="font-mono text-[10px] text-mute">hcp {p.course_handicap}</span>
                  {p.id !== myId && (
                    <button
                      type="button"
                      onClick={() => removePlayer(p.id)}
                      className="text-red text-[11px] font-semibold px-2 py-1 rounded-full border border-red hover:bg-red-light transition"
                    >
                      Quitar
                    </button>
                  )}
                </div>
              ))}
            </div>
            {/* Add players */}
            <p className="font-mono text-[9px] text-mute uppercase tracking-wide mb-2">Añadir jugador</p>
            <div className="space-y-2">
              {(allProfiles ?? []).flatMap(p =>
                players.find(rp => rp.id === p._id)
                  ? []
                  : [
                      <button
                        type="button"
                        key={p._id}
                        onClick={() => addPlayer(p._id)}
                        className="w-full flex items-center gap-3 bg-white rounded-field px-3 py-2.5 border border-rule text-left active:opacity-70"
                      >
                        <Avatar name={p.name} src={p.avatar_url} size={32} />
                        <span className="flex-1 font-semibold text-[13px] text-ink">{p.name}</span>
                        <span className="font-mono text-[10px] text-accent font-bold">+ Añadir</span>
                      </button>,
                    ],
              )}
            </div>

            {/* Danger zone — práctica o ronda en curso */}
            <div className="mt-5 pt-4 border-t border-rule-soft">
              {isPractice || isActive ? (
                <button
                  type="button"
                  onClick={async () => {
                    const msg = isPractice
                      ? '¿Borrar esta ronda de práctica? Se eliminarán todos los golpes.'
                      : '¿Descartar esta ronda en curso? Se eliminarán todos los golpes anotados y no se podrá recuperar.'
                    if (!confirm(msg)) return
                    await removeRoundMut({ round_id: roundId as Id<'rounds'> })
                    navigate('/')
                  }}
                  className="w-full py-3 rounded-full border-2 border-red text-red font-bold text-[14px] transition active:opacity-80"
                >
                  {isPractice ? 'Borrar ronda de práctica' : 'Descartar ronda en curso'}
                </button>
              ) : (
                <div className="bg-paper rounded-field px-4 py-3 text-center">
                  <p className="text-[12px] text-mute font-semibold">
                    Ronda competitiva finalizada — no se puede borrar
                  </p>
                  <p className="font-mono text-[10px] text-mute mt-0.5">Contacta al admin si hay un error</p>
                </div>
              )}
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </>
  )
}

type MatchplayResult = { state: number; label: string; leader: Player | null; a: Player; b: Player }

type ScorecardHeaderProps = {
  roundId: string
  myId: string
  courseName: string
  modes: string[]
  players: Player[]
  customBet: string
  allProfiles: { _id: string; name: string; avatar_url?: string | null }[] | undefined
  isPractice: boolean
  isActive: boolean
  completed: boolean
  myScoresCount: number
  holesCount: number
  getTotal: (pid: string) => number
  /** Strokes over/under par across the holes the player has scored so far. */
  getDelta: (pid: string) => number
  viewMode: ViewMode
  setViewMode: (m: ViewMode) => void
  matchplayResult: MatchplayResult | null
  availableModes: { key: ViewMode; label: string }[]
  shareButton?: React.ReactNode
}

function ScorecardHeader({
  roundId,
  myId,
  courseName,
  modes,
  players,
  customBet,
  allProfiles,
  isPractice,
  isActive,
  completed,
  myScoresCount,
  holesCount,
  getTotal,
  getDelta,
  viewMode,
  setViewMode,
  matchplayResult,
  availableModes,
  shareButton,
}: ScorecardHeaderProps) {
  const navigate = useNavigate()
  const progressPct = holesCount > 0 ? Math.round((myScoresCount / holesCount) * 100) : 0
  const leader = players
    .flatMap(p => {
      const total = getTotal(p.id)
      return total > 0 ? [{ player: p, total, delta: getDelta(p.id) }] : []
    })
    .toSorted((a, b) => a.total - b.total)[0]

  return (
    <div className="safe-top px-[14px] pt-3 pb-3">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 rounded-full bg-white px-3 py-2 text-mute font-semibold text-[13px] border border-rule active:scale-[0.98] transition"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path
                d="M19 12H5M5 12l7-7M5 12l7 7"
                stroke="#6b7a72"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Atrás
          </button>
        </div>
        <div className="flex items-center gap-2">
          {completed ? (
            <span className="font-mono text-[9px] font-bold text-accent bg-white px-2.5 py-1.5 rounded-full uppercase tracking-wide border border-accent-light">
              Firmada
            </span>
          ) : (
            <span className="font-mono text-[10px] text-mute bg-white px-2.5 py-1.5 rounded-full border border-rule">
              {myScoresCount} / {holesCount} HOYOS
            </span>
          )}
          {shareButton}
        </div>
      </div>

      {/* Mini info bar — morph target of the round cards in home/stats */}
      <HeroCard className="p-4 mb-2" orbSize={170} style={{ viewTransitionName: 'round-card' }}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-1.5">
              {modes.map(m => (
                <span
                  key={m}
                  className="rounded-full bg-white/10 px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-wide text-white/65"
                >
                  {modeLabel(m)}
                </span>
              ))}
            </div>
            <h1 className="truncate text-[22px] font-black leading-tight tracking-tight text-white">{courseName}</h1>
            <div className="mt-3 flex items-center gap-3">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/12">
                <div
                  className="h-full rounded-full bg-accent transition-all duration-300"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <span className="font-mono text-[10px] font-bold text-white/65">{progressPct}%</span>
            </div>
          </div>
          {leader && (
            <div className="shrink-0 text-right">
              <p className="font-mono text-[9px] uppercase tracking-wide text-white/45">Líder</p>
              <p className="font-mono text-[32px] font-black leading-none text-white">{leader.total}</p>
              <p className="font-mono text-[12px] font-black" style={{ color: scoreDeltaColor(leader.delta) }}>
                {scoreDeltaLabel(leader.delta)}
              </p>
            </div>
          )}
        </div>

        {!completed && (
          <div className="mt-3 flex items-center justify-between gap-2 border-t border-white/10 pt-3">
            <div className="flex -space-x-1.5">
              {players.slice(0, 5).map(p => (
                <div key={`${p.id}-${p.name}`} className="rounded-full ring-2 ring-ink">
                  <Avatar name={p.name} src={p.avatar_url} size={28} />
                </div>
              ))}
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <BetControl roundId={roundId} customBet={customBet} />
              <EditPlayersControl
                roundId={roundId}
                myId={myId}
                players={players}
                allProfiles={allProfiles}
                isPractice={isPractice}
                isActive={isActive}
              />
            </div>
          </div>
        )}

        {/* Live score strip: total + over/under par through the holes played */}
        <div className="mt-3 grid grid-cols-2 gap-2">
          {players.map(p => {
            const total = getTotal(p.id)
            const delta = getDelta(p.id)
            return (
              <div key={p.id} className="flex min-w-0 items-center gap-2 rounded-[14px] bg-white/9 px-2.5 py-2">
                <PlayerLink profileId={p.is_guest ? null : p.id}>
                  <Avatar name={p.name} src={p.avatar_url} size={28} />
                </PlayerLink>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] font-bold text-white/75">{p.name}</p>
                  {total > 0 ? (
                    <div className="flex items-baseline gap-1.5">
                      <span className="font-mono text-[18px] font-black text-white leading-none">{total}</span>
                      <span className="font-mono text-[11px] font-bold" style={{ color: scoreDeltaColor(delta) }}>
                        {scoreDeltaLabel(delta)}
                      </span>
                    </div>
                  ) : (
                    <span className="text-white/35 text-[13px] font-mono">—</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </HeroCard>

      {/* Mode tabs — the dark pill slides to the active tab */}
      {availableModes.length > 1 && (
        <Segmented options={availableModes} value={viewMode} onChange={setViewMode} className="mb-2" />
      )}

      {/* Matchplay live result */}
      {(viewMode === 'matchplay_hcp' || viewMode === 'matchplay') && matchplayResult && (
        <div className="bg-white rounded-btn px-4 py-3 border border-rule mb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PlayerLink profileId={matchplayResult.a.is_guest ? null : matchplayResult.a.id}>
                <Avatar name={matchplayResult.a.name} src={matchplayResult.a.avatar_url} size={32} />
              </PlayerLink>
              <span className="font-bold text-[13px] text-ink">{matchplayResult.a.name.split(' ')[0]}</span>
            </div>
            <div className="text-center px-4">
              <p className="font-mono text-[20px] font-black text-ink">{matchplayResult.label}</p>
              {matchplayResult.leader && (
                <p className="font-mono text-[9px] text-mute uppercase">
                  {matchplayResult.leader.name.split(' ')[0]} gana
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-[13px] text-ink">{matchplayResult.b.name.split(' ')[0]}</span>
              <PlayerLink profileId={matchplayResult.b.is_guest ? null : matchplayResult.b.id}>
                <Avatar name={matchplayResult.b.name} src={matchplayResult.b.avatar_url} size={32} />
              </PlayerLink>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

type BottomCTAProps = {
  allDone: boolean
  nextHole: Hole | undefined
  completed: boolean
  signed: boolean
  saving: boolean
  customBet: string
  players: Player[]
  getTotal: (pid: string) => number
  onSign: () => void
  onScoreNext: (holeNumber: number) => void
}

function BottomCTA({
  allDone,
  nextHole,
  completed,
  signed,
  saving,
  customBet,
  players,
  getTotal,
  onSign,
  onScoreNext,
}: BottomCTAProps) {
  if (completed && !signed) return null
  return (
    <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] px-[14px] pb-8 pt-4 bg-gradient-to-t from-paper to-transparent">
      {completed ? (
        <>
          <div className="bg-accent-light rounded-btn px-4 py-3 mb-2 flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path
                d="M5 13l4 4L19 7"
                stroke="#1f8a5b"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="text-accent font-semibold text-[13px]">Ronda firmada y guardada</span>
          </div>
          {/* Apuesta — si existe en notes */}
          {customBet && (
            <div className="bg-amber-light border-2 border-amber rounded-btn px-4 py-3 mb-2">
              <p className="font-mono text-[9px] text-amber-dark uppercase tracking-wide mb-1">Apuesta de la ronda</p>
              <p className="font-bold text-[15px] text-ink">{customBet}</p>
              {/* Winner */}
              {(() => {
                const sorted = players
                  .flatMap(p => {
                    const total = getTotal(p.id)
                    return total > 0 ? [{ ...p, total }] : []
                  })
                  .toSorted((a, b) => a.total - b.total)
                if (sorted.length >= 2 && sorted[0].total < sorted[1].total) {
                  const loser = sorted[sorted.length - 1]
                  return (
                    <p className="text-[13px] text-amber-dark mt-1 font-semibold">{loser.name}, te toca a ti. 😏</p>
                  )
                }
                return null
              })()}
            </div>
          )}
        </>
      ) : allDone ? (
        <button
          type="button"
          onClick={onSign}
          disabled={saving}
          className="w-full flex items-center justify-between px-5 py-4 rounded-full font-bold text-[14px] transition active:scale-[0.98] disabled:opacity-60"
          style={{ backgroundColor: '#e8b75a', color: '#0e1a16' }}
        >
          <span>Firmar y guardar ronda</span>
          <span className="bg-ink text-white text-[12px] font-bold px-3 py-1.5 rounded-full">
            {saving ? '…' : '✓ FIRMAR'}
          </span>
        </button>
      ) : nextHole ? (
        <button
          type="button"
          onClick={() => onScoreNext(nextHole.hole_number)}
          className="flex items-center justify-between w-full px-5 py-4 rounded-full font-bold text-[14px] text-white"
          style={{ backgroundColor: '#0e1a16' }}
        >
          <div className="text-left">
            <p className="font-mono text-[9px] text-white/50 uppercase tracking-wide">Siguiente</p>
            <p className="text-[15px] font-black">
              Hoyo {nextHole.hole_number} · par {nextHole.par}
            </p>
          </div>
          <span className="btn-glow text-white text-[12px] font-black px-3 py-1.5 rounded-full">+ ANOTAR</span>
        </button>
      ) : null}
    </div>
  )
}

/** Server scores with the offline-pending holes layered on top, so the card
 *  reflects everything the user entered, with or without coverage. */
function mergePendingScores(serverScores: Score[], pendingRound: PendingHole[]): Score[] {
  if (pendingRound.length === 0) return serverScores
  const byKey = new Map(serverScores.map((s, i) => [`${s.profile_id}:${s.hole_number}`, i]))
  const merged = [...serverScores]
  for (const p of pendingRound) {
    for (const e of p.scores) {
      const row: Score = {
        profile_id: e.profileId,
        hole_number: p.hole_number,
        strokes: e.strokes,
        putts: e.putts,
        gir: e.gir,
        fairway: e.fairway,
        penalties: e.penalties,
        in_bunker: e.in_bunker,
      }
      const i = byKey.get(`${row.profile_id}:${row.hole_number}`)
      if (i != null) merged[i] = row
      else merged.push(row)
    }
  }
  return merged
}

/** Amber notice shown while some holes are saved only on this device. */
function PendingSyncBanner({ count }: { count: number }) {
  if (count === 0) return null
  return (
    <div className="flex items-center gap-2.5 rounded-field bg-amber-light px-4 py-2.5">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="flex-shrink-0">
        <path d="M21 12a9 9 0 1 1-2.64-6.36" stroke="#9b6e1a" strokeWidth="2.2" strokeLinecap="round" />
        <path d="M21 3v6h-6" stroke="#9b6e1a" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <p className="text-[12px] font-semibold text-amber-dark">
        {count === 1
          ? '1 hoyo guardado sin conexión — se sincronizará automáticamente'
          : `${count} hoyos guardados sin conexión — se sincronizarán automáticamente`}
      </p>
    </div>
  )
}

type CelebrationProps = {
  holes: Hole[]
  myId: string
  getScore: (pid: string, h: number) => number | null
  myTotal: number
  deltaStr: string
}

// Deterministic pseudo-random per confetti piece (Math.random is off-limits with the compiler).
const rnd = (i: number, salt: number) => {
  const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453
  return x - Math.floor(x)
}

/** Full-screen confetti overlay shown right after signing the round. */
function Celebration({ holes, myId, getScore, myTotal, deltaStr }: CelebrationProps) {
  const myDeltas = holes.flatMap(h => {
    const s = getScore(myId, h.hole_number)
    return s ? [s - h.par] : []
  })
  const eagles = myDeltas.filter(d => d <= -2).length
  const birdies = myDeltas.filter(d => d === -1).length
  const pars = myDeltas.filter(d => d === 0).length
  const highlights = [
    eagles > 0 && `🦅 ${eagles} eagle${eagles > 1 ? 's' : ''}`,
    birdies > 0 && `🐦 ${birdies} birdie${birdies > 1 ? 's' : ''}`,
    pars > 0 && `${pars} par${pars > 1 ? 'es' : ''}`,
  ]
    .filter(Boolean)
    .join(' · ')
  const colors = ['#1f8a5b', '#e8b75a', '#2a6fdb', '#c6432d', '#9bc9a3', '#ffffff']
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-ink overflow-hidden">
      <style>{`
        @keyframes summary-pop { from { transform: scale(0.6); opacity: 0 } to { transform: scale(1); opacity: 1 } }
        @keyframes confetti-fall {
          from { transform: translateY(-6vh) rotate(0deg); opacity: 1 }
          85%  { opacity: 1 }
          to   { transform: translateY(108vh) rotate(660deg); opacity: 0 }
        }
      `}</style>
      {Array.from({ length: 44 }, (_, i) => (
        <div
          key={i}
          className="absolute top-0 rounded-[2px]"
          style={{
            left: `${rnd(i, 1) * 100}%`,
            width: 5 + rnd(i, 2) * 5,
            height: 9 + rnd(i, 3) * 7,
            backgroundColor: colors[i % colors.length],
            animation: `confetti-fall ${1.7 + rnd(i, 4) * 1.2}s ${rnd(i, 5) * 0.7}s cubic-bezier(0.25, 0.6, 0.45, 1) both`,
          }}
        />
      ))}
      <div className="text-[80px]" style={{ animation: 'summary-pop 0.5s cubic-bezier(0.16, 1, 0.3, 1) both' }}>
        &#9971;
      </div>
      <p className="text-white text-[28px] font-black mt-4">Ronda firmada!</p>
      <p className="text-white/60 text-[14px] mt-2">
        {myTotal} golpes · {deltaStr}
      </p>
      {highlights && <p className="text-white/80 text-[14px] font-semibold mt-3">{highlights}</p>}
    </div>
  )
}

function TarjetaPage() {
  const [searchParams] = useSearchParams()
  const roundId = searchParams.get('round') ?? ''

  const me = useQuery(api.profiles.me)
  const data = useQuery(api.rounds.get, roundId ? { roundId: roundId as Id<'rounds'> } : 'skip')
  const allProfiles = useQuery(api.players.all)

  const [viewMode, setViewMode] = useState<ViewMode>('stroke')
  const [editHole, setEditHole] = useState<number | null>(null)
  // Sign-flow state grouped so each transition is one update (saving → celebrating → signed).
  const [signFlow, setSignFlow] = useState({ saving: false, signed: false, celebrating: false })
  const { saving, signed, celebrating } = signFlow
  const finalizeMut = useMutation(api.rounds.finalize)

  const myId = me?._id ?? ''

  // Derived data from the single rounds.get query
  const courseName = data?.course?.name ?? ''
  const holeMode = data?.round.notes ?? 'all'
  const notesVal = data?.round.notes ?? ''
  const isPractice = !!data?.round.is_practice
  const isActive = data?.round.status === 'active'
  const completed = data?.round.status === 'completed' || signed
  const allHoles: Hole[] = (data?.holes ?? []).map(h => ({
    hole_number: h.hole_number,
    par: h.par,
    stroke_index: h.stroke_index,
  }))
  const players: Player[] = (data?.players ?? []).map(p => ({
    id: p.profileId ?? '',
    name: p.name ?? 'Inv',
    course_handicap: p.course_handicap ?? 0,
    is_guest: p.is_guest,
    avatar_url: p.avatar_url ?? null,
  }))
  // Holes saved offline (pending sync) overlay the server scores so the card
  // reflects everything the user entered, with or without coverage.
  const pendingMap = useSelector(pendingHoles$)
  const pendingRound = pendingForRound(pendingMap ?? {}, roundId)
  const serverScores: Score[] = (data?.scores ?? []).map(s => ({
    profile_id: s.profileId,
    hole_number: s.hole_number,
    strokes: s.strokes ?? null,
    putts: s.putts ?? null,
    gir: s.gir ?? null,
    fairway: s.fairway ?? null,
    penalties: s.penalties ?? null,
    in_bunker: s.in_bunker ?? null,
  }))
  const scores = mergePendingScores(serverScores, pendingRound)
  const modes = (data?.modes ?? []).length ? (data?.modes ?? []) : ['stroke']

  // Bet input value: derived from notes (the live-edited value lives inside BetControl)
  const customBet = ['all', 'front', 'back', '9_once', '9_twice'].includes(notesVal) ? '' : notesVal

  const loading = data === undefined || me === undefined

  // Filtered holes based on holeMode
  const holes: Hole[] = (() => {
    if (holeMode === 'front') return allHoles.filter(h => h.hole_number <= 9)
    if (holeMode === 'back') return allHoles.filter(h => h.hole_number >= 10)
    if (holeMode === '9_once') return allHoles.filter(h => h.hole_number <= 9)
    if (holeMode === '9_twice') {
      // First 9 + second 9 mapped to same holes
      const nine = allHoles.filter(h => h.hole_number <= 9)
      return [...nine, ...nine.map(h => ({ ...h, hole_number: h.hole_number + 9 }))]
    }
    return allHoles
  })()

  const getScore = (pid: string, h: number) =>
    // Each displayed hole (incl. 10-18 in 9_twice) has its own stored score.
    scores.find(s => s.profile_id === pid && s.hole_number === h)?.strokes ?? null
  const getTotal = (pid: string) =>
    holes.reduce((a, h) => {
      const s = getScore(pid, h.hole_number)
      return s ? a + s : a
    }, 0)
  /** Over/under par across the holes the player has scored ("vas +3"). */
  const getDelta = (pid: string) =>
    holes.reduce((a, h) => {
      const s = getScore(pid, h.hole_number)
      return s ? a + (s - h.par) : a
    }, 0)

  const myScores = holes.filter(h => getScore(myId, h.hole_number) != null).map(h => h.hole_number)
  const nextHole = holes.find(h => !myScores.includes(h.hole_number))
  const allDone = myScores.length >= holes.length

  // Groups: for 9_twice split at 9, else split at 9
  const front = holeMode === 'back' ? holes : holes.filter(h => h.hole_number <= 9)
  const back = holeMode === 'back' ? [] : holes.filter(h => h.hole_number > 9)
  const groups = back.length > 0 ? [front, back] : [front]

  // Mode tabs available
  const availableModes: { key: ViewMode; label: string }[] = [
    { key: 'stroke', label: 'Stroke' },
    ...(modes.includes('stableford') ? [{ key: 'stableford' as ViewMode, label: 'Stableford' }] : []),
    ...(modes.includes('matchplay_hcp') ? [{ key: 'matchplay_hcp' as ViewMode, label: 'Matchplay' }] : []),
    ...(modes.includes('matchplay') ? [{ key: 'matchplay' as ViewMode, label: 'Matchplay' }] : []),
    ...(modes.includes('bbb') ? [{ key: 'bbb' as ViewMode, label: 'BBB' }] : []),
    ...(modes.includes('wolf') ? [{ key: 'wolf' as ViewMode, label: 'Wolf' }] : []),
    ...(players.length >= 3 ? [{ key: 'clasificacion' as ViewMode, label: 'Clasificación' }] : []),
  ]

  // Clasificación general (stroke play)
  const realPar = holes.reduce((a, h) => a + h.par, 0)
  const ranking = players.toSorted((a, b) => (getTotal(a.id) || 999) - (getTotal(b.id) || 999))

  async function handleSign() {
    // Signing computes totals and WHS differentials server-side — every hole
    // must have reached Convex first, or the round would close incomplete.
    if (pendingRound.length > 0 || !navigator.onLine) {
      alert('Hay hoyos guardados sin conexión todavía por sincronizar. Conéctate a internet y vuelve a intentarlo.')
      return
    }
    setSignFlow(f => ({ ...f, saving: true }))
    await finalizeMut({ round_id: roundId as Id<'rounds'> })
    setSignFlow(f => ({ ...f, saving: false, celebrating: true }))
    setTimeout(() => {
      setSignFlow(f => ({ ...f, celebrating: false, signed: true }))
    }, 2600)
  }

  // Matchplay: net winner of a hole (null = tied, unscored, or <2 players).
  function holeWinner(holeNumber: number): Player | null {
    if (players.length < 2) return null
    const [a, b] = players
    const h = holes.find(x => x.hole_number === holeNumber)
    if (!h) return null
    const sa = getScore(a.id, holeNumber)
    const sb = getScore(b.id, holeNumber)
    if (!sa || !sb) return null
    const rec = modes.includes('matchplay_hcp')
      ? strokesReceived(Math.abs(a.course_handicap - b.course_handicap), h.stroke_index)
      : 0
    const netA = sa - (a.course_handicap > b.course_handicap ? rec : 0)
    const netB = sb - (b.course_handicap > a.course_handicap ? rec : 0)
    if (netA < netB) return a
    if (netB < netA) return b
    return null
  }

  // Matchplay: cumulative state after each scored hole (for the MATCH row).
  const matchState = (() => {
    const map = new Map<number, { n: number; leader: Player | null }>()
    if (players.length < 2) return map
    const [a, b] = players
    let state = 0
    for (const h of holes) {
      const w = holeWinner(h.hole_number)
      if (w?.id === a.id) state++
      else if (w?.id === b.id) state--
      if (getScore(a.id, h.hole_number) && getScore(b.id, h.hole_number)) {
        map.set(h.hole_number, { n: Math.abs(state), leader: state === 0 ? null : state > 0 ? a : b })
      }
    }
    return map
  })()

  // Matchplay calculation
  const matchplayResult = (() => {
    if (players.length < 2) return null
    const [a, b] = players
    let state = 0
    for (const h of holes) {
      const w = holeWinner(h.hole_number)
      if (w?.id === a.id) state++
      else if (w?.id === b.id) state--
    }
    const label = state === 0 ? 'AS' : state > 0 ? `${state} UP` : `${-state} UP`
    const leader = state === 0 ? null : state > 0 ? a : b
    return { state, label, leader, a, b }
  })()

  if (loading) return SPINNER

  const myTotal = getTotal(myId) || (players[0] ? getTotal(players[0].id) : 0)
  const myDelta = myTotal && realPar > 0 ? myTotal - realPar : 0
  const celebrationDeltaStr = myDelta > 0 ? `+${myDelta}` : myDelta === 0 ? 'E' : `${myDelta}`

  return (
    <div className="min-h-screen bg-paper pb-32">
      {celebrating && (
        <Celebration holes={holes} myId={myId} getScore={getScore} myTotal={myTotal} deltaStr={celebrationDeltaStr} />
      )}

      {/* Header */}
      <ScorecardHeader
        roundId={roundId}
        myId={myId}
        courseName={courseName}
        modes={modes}
        players={players}
        customBet={customBet}
        allProfiles={allProfiles}
        isPractice={isPractice}
        isActive={isActive}
        completed={completed}
        myScoresCount={myScores.length}
        holesCount={holes.length}
        getTotal={getTotal}
        getDelta={getDelta}
        viewMode={viewMode}
        setViewMode={setViewMode}
        matchplayResult={matchplayResult}
        availableModes={availableModes}
        shareButton={
          <ShareScorecardButton
            roundId={roundId}
            courseName={courseName}
            dateLabel={(data?.round.date ?? '').split('-').reverse().join('/')}
            holesLabel={`${holes.length} hoyos`}
            groups={groups}
            players={players}
            getScore={getScore}
          />
        }
      />

      {/* Scorecard */}
      <div className="px-[14px] space-y-2">
        <PendingSyncBanner count={pendingRound.length} />
        {viewMode === 'clasificacion' ? (
          <Clasificacion ranking={ranking} getTotal={getTotal} realPar={realPar} />
        ) : (
          <>
            {groups.map((group, gi) => (
              <ScoreTable
                key={group[0]?.hole_number ?? gi}
                group={group}
                gi={gi}
                groupsCount={groups.length}
                players={players}
                viewMode={viewMode}
                getScore={getScore}
                matchState={matchState}
                onEditHole={completed ? undefined : setEditHole}
              />
            ))}

            {/* Legend */}
            <ScoreLegend viewMode={viewMode} />
          </>
        )}

        {/* Stats of the finished round */}
        {completed && <RoundStats players={players} scores={scores} holes={holes} myId={myId} />}
      </div>

      {/* CTA */}
      <BottomCTA
        allDone={allDone}
        nextHole={nextHole}
        completed={completed}
        signed={signed}
        saving={saving}
        customBet={customBet}
        players={players}
        getTotal={getTotal}
        onSign={handleSign}
        onScoreNext={setEditHole}
      />

      {/* Hole scoring bottom sheet */}
      {!completed && (
        <HoleSheet
          roundId={roundId}
          holeNumber={editHole}
          onClose={() => setEditHole(null)}
          onChangeHole={setEditHole}
          onFinish={() => setEditHole(null)}
        />
      )}
    </div>
  )
}

export default function Page() {
  return (
    <Suspense fallback={SPINNER}>
      <TarjetaPage />
    </Suspense>
  )
}
