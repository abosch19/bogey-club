export type Profile = {
  id: string; name: string; handicap_index: number; avatar_color: string; created_at: string
}
export type Course = {
  id: string; name: string; holes_count: number; slope: number; course_rating: number; par: number
}
export type Hole = {
  id: string; course_id: string; hole_number: number; par: number; stroke_index: number; distance_m?: number
}
export type Round = {
  id: string; course_id: string; date: string; status: 'active'|'completed'; created_by: string; is_practice: boolean
}
export type RoundPlayer = {
  id: string; round_id: string; profile_id?: string; guest_id?: string; is_guest: boolean; course_handicap: number
}
export type Score = {
  id: string; round_id: string; profile_id: string; hole_number: number
  strokes?: number; putts?: number; fairway?: boolean; gir?: boolean; penalties?: number; in_bunker?: boolean
}
export type GuestPlayer = {
  id: string; name: string; handicap_index: number; created_by: string
}
export type League = {
  id: string; name: string; created_by: string; total_rounds: number; mode: string; active: boolean
}
export type LeaguePlayer = {
  id: string; league_id: string; profile_id: string; is_admin: boolean
}
export type LeagueStanding = {
  id: string; league_id: string; profile_id: string; total_points: number; rounds_played: number; wins: number
}
export type GameMode = 'stroke' | 'matchplay' | 'matchplay_hcp' | 'stableford' | 'wolf' | 'bbb'
