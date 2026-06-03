export type Profile = {
  id: string
  name: string
  handicap_index: number
  avatar_color: string
  created_at: string
}

export type Course = {
  id: string
  name: string
  location: string | null
  holes_count: number
  slope: number
  course_rating: number
  par: number
  active: boolean
  record_score: number | null
  record_holder_id: string | null
  record_date: string | null
}

export type Hole = {
  id: string
  course_id: string
  hole_number: number
  par: number
  stroke_index: number
  distance_m: number | null
}

export type Round = {
  id: string
  course_id: string
  date: string
  status: 'active' | 'completed'
  created_by: string
  is_practice: boolean
  notes: string | null
  created_at: string
}

export type RoundPlayer = {
  id: string
  round_id: string
  profile_id: string | null
  guest_id: string | null
  is_guest: boolean
  course_handicap: number
}

export type GuestPlayer = {
  id: string
  name: string
  handicap_index: number
  created_by: string
}

export type Score = {
  id: string
  round_id: string
  profile_id: string
  hole_number: number
  strokes: number | null
  putts: number | null
  fairway: boolean | null
  gir: boolean | null
  penalties: number | null
  in_bunker: boolean | null
}

export type WhdsDifferential = {
  id: string
  profile_id: string
  round_id: string
  adjusted_gross_score: number
  course_rating: number
  slope: number
  differential: number
  is_counting: boolean
  played_at: string
}

export type League = {
  id: string
  name: string
  created_by: string
  total_rounds: number
  mode: GameMode
  active: boolean
  created_at: string
}

export type LeaguePlayer = {
  id: string
  league_id: string
  profile_id: string
  is_admin: boolean
}

export type LeagueStanding = {
  id: string
  league_id: string
  profile_id: string
  total_points: number
  rounds_played: number
  wins: number
}

export type GameMode = 'stroke' | 'matchplay' | 'matchplay_hcp' | 'stableford' | 'wolf' | 'bbb'

export const GAME_MODES: { id: GameMode; name: string; desc: string; players: string; icon: string; color: string }[] = [
  { id: 'stroke',       name: 'Stroke Play',        desc: 'Suma de golpes. Gana quien menos haga.',                        players: '1–4', icon: 'flag',   color: '#1f8a5b' },
  { id: 'matchplay',    name: 'Matchplay',           desc: 'Gana el hoyo quien menos golpes haga. Sin hándicap.',           players: '2',   icon: 'swords', color: '#2a6fdb' },
  { id: 'matchplay_hcp',name: 'Matchplay c/ Hcp',   desc: 'Como matchplay pero con golpes de ventaja por hándicap.',       players: '2',   icon: 'swords', color: '#7a3fc4' },
  { id: 'stableford',   name: 'Stableford',          desc: 'Puntos por hoyo según tu neto. Premia la regularidad.',         players: '1–4', icon: 'star',   color: '#d4a24a' },
  { id: 'wolf',         name: 'Wolf',                desc: 'Cada hoyo un lobo elige pareja o va solo a por todas.',         players: '4',   icon: 'wolf',   color: '#c6432d' },
  { id: 'bbb',          name: 'Bingo Bango Bongo',   desc: '3 puntos por hoyo: 1º en green, más cerca, 1º en meter.',       players: '3–4', icon: 'target', color: '#0f9c7a' },
]
