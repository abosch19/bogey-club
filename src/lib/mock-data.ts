export const PLAYERS = [
  { id: 'marcos', name: 'Marcos', initials: 'M', color: '#1f8a5b', hcp: 18.2 },
  { id: 'javi',   name: 'Javi',   initials: 'J', color: '#2a6fdb', hcp: 14.6 },
  { id: 'adri',   name: 'Adri',   initials: 'A', color: '#e8b75a', hcp: 22.4 },
  { id: 'carlos', name: 'Carlos', initials: 'C', color: '#e05a5a', hcp: 11.0 },
]

export const COURSE = {
  name: 'Real Club de Golf Sotogrande',
  shortName: 'Sotogrande',
  location: 'San Roque, Cádiz',
  holes: 18,
  par: 72,
  cr: 73.1,
  slope: 138,
  date: '2024-06-01',
  tee: 'Amarillo',
}

// Par values for each hole at Sotogrande
export const HOLE_PARS = [4, 5, 4, 4, 3, 5, 4, 3, 4, 4, 4, 5, 3, 4, 4, 3, 5, 4]
// Handicap stroke index for each hole
export const HOLE_SI   = [7, 15, 1, 11, 17, 5, 9, 13, 3, 8, 12, 4, 18, 6, 2, 16, 10, 14]
// Distances (meters, yellow tee)
export const HOLE_DIST = [355, 480, 390, 340, 165, 510, 360, 145, 410, 375, 340, 495, 155, 385, 420, 175, 500, 370]

export const ROUND = {
  id: 'round-001',
  course: COURSE,
  date: '1 jun 2024',
  mode: 'Stableford',
  currentHole: 7,
  scores: {
    marcos: [5, 6, 5, 5, 3, 6, 5, null, null, null, null, null, null, null, null, null, null, null],
    javi:   [4, 5, 4, 4, 3, 5, 4, null, null, null, null, null, null, null, null, null, null, null],
    adri:   [6, 7, 5, 5, 4, 6, 6, null, null, null, null, null, null, null, null, null, null, null],
    carlos: [4, 5, 4, 4, 3, 5, 5, null, null, null, null, null, null, null, null, null, null, null],
  } as Record<string, (number | null)[]>,
}

export const MODES = [
  { id: 'stroke',    name: 'Stroke Play',        icon: 'target',     desc: 'Total golpes, sin handicap' },
  { id: 'stableford',name: 'Stableford',          icon: 'star',       desc: 'Puntos por hoyo con hcp' },
  { id: 'matchplay', name: 'Match Play',          icon: 'swords',     desc: 'Hoyo a hoyo sin hcp' },
  { id: 'wolf',      name: 'Wolf',                icon: 'shield',     desc: 'Juego de alianzas por hoyo' },
  { id: 'bbb',       name: 'Better Ball Betterball', icon: 'users',  desc: 'Mejor bola en equipo' },
  { id: 'mphcp',     name: 'Matchplay c/Hcp',    icon: 'percent',    desc: 'Match play con diferencia hcp' },
]

export const LIGA = {
  name: 'Liga Amigos 2024',
  season: '2024',
  rounds: 8,
  roundsPlayed: 5,
  standings: [
    { player: PLAYERS[1], pts: 72, rounds: 5, pos: 1, trend: 'up' },
    { player: PLAYERS[3], pts: 65, rounds: 5, pos: 2, trend: 'same' },
    { player: PLAYERS[0], pts: 58, rounds: 5, pos: 3, trend: 'down' },
    { player: PLAYERS[2], pts: 41, rounds: 5, pos: 4, trend: 'up' },
  ],
}

export const FEED = [
  {
    id: 'f1',
    player: PLAYERS[1],
    action: 'completó una ronda',
    detail: '78 golpes · Valderrama',
    time: 'hace 2h',
    score: 78,
    par: 71,
  },
  {
    id: 'f2',
    player: PLAYERS[3],
    action: 'logró un birdie en hoyo 9',
    detail: 'Sotogrande · Par 4',
    time: 'hace 5h',
    score: null,
    par: null,
  },
  {
    id: 'f3',
    player: PLAYERS[2],
    action: 'mejoró su handicap',
    detail: '22.4 → 21.8',
    time: 'ayer',
    score: null,
    par: null,
  },
]

export const WHS_ROUNDS = [
  { date: '01 jun', course: 'Sotogrande', score: 92, cr: 73.1, slope: 138, diff: 16.2, counting: true },
  { date: '18 may', course: 'Valderrama', score: 95, cr: 75.6, slope: 147, diff: 17.3, counting: true },
  { date: '05 may', course: 'La Reserva',  score: 89, cr: 71.2, slope: 131, diff: 16.0, counting: true },
  { date: '20 abr', course: 'Sotogrande', score: 93, cr: 73.1, slope: 138, diff: 17.1, counting: true },
  { date: '08 abr', course: 'Real Club',   score: 91, cr: 72.4, slope: 135, diff: 16.8, counting: true },
  { date: '25 mar', course: 'Sotogrande', score: 94, cr: 73.1, slope: 138, diff: 18.0, counting: true },
  { date: '12 mar', course: 'Valderrama', score: 98, cr: 75.6, slope: 147, diff: 19.4, counting: true },
  { date: '01 mar', course: 'La Reserva',  score: 90, cr: 71.2, slope: 131, diff: 16.5, counting: true },
  { date: '15 feb', course: 'Real Club',   score: 96, cr: 72.4, slope: 135, diff: 20.1, counting: false },
  { date: '02 feb', course: 'Sotogrande', score: 99, cr: 73.1, slope: 138, diff: 21.8, counting: false },
]
