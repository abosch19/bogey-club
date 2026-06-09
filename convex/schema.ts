import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'
import { authTables } from '@convex-dev/auth/server'

// Field naming convention:
//  - Document references use camelCase + Id suffix (courseId, roundId, profileId…)
//  - Value fields keep the snake_case names used by src/lib/types.ts & golf.ts
//  - supabaseId holds the old Postgres UUID, used only for data migration mapping.

export default defineSchema({
  // Convex Auth managed tables (users, authAccounts, authSessions, …)
  ...authTables,

  profiles: defineTable({
    userId: v.optional(v.id('users')),
    email: v.optional(v.string()),
    name: v.string(),
    last_name: v.optional(v.string()),
    handicap_index: v.number(),
    handicap_index_pp: v.optional(v.number()),
    supabaseId: v.optional(v.string()),
  })
    .index('by_userId', ['userId'])
    .index('by_email', ['email'])
    .index('by_supabaseId', ['supabaseId']),

  courses: defineTable({
    name: v.string(),
    location: v.optional(v.union(v.string(), v.null())),
    holes_count: v.number(),
    slope: v.number(),
    course_rating: v.number(),
    par: v.number(),
    active: v.boolean(),
    record_score: v.optional(v.union(v.number(), v.null())),
    record_holder_id: v.optional(v.union(v.id('profiles'), v.null())),
    record_date: v.optional(v.union(v.string(), v.null())),
    supabaseId: v.optional(v.string()),
  }).index('by_supabaseId', ['supabaseId']),

  holes: defineTable({
    courseId: v.id('courses'),
    hole_number: v.number(),
    par: v.number(),
    stroke_index: v.number(),
    distance_m: v.optional(v.union(v.number(), v.null())),
    supabaseId: v.optional(v.string()),
  })
    .index('by_course', ['courseId'])
    .index('by_supabaseId', ['supabaseId']),

  rounds: defineTable({
    courseId: v.id('courses'),
    date: v.string(),
    status: v.union(v.literal('active'), v.literal('completed')),
    createdBy: v.optional(v.union(v.id('profiles'), v.null())),
    is_practice: v.boolean(),
    notes: v.optional(v.union(v.string(), v.null())),
    supabaseId: v.optional(v.string()),
  })
    .index('by_status', ['status'])
    .index('by_supabaseId', ['supabaseId']),

  round_players: defineTable({
    roundId: v.id('rounds'),
    profileId: v.optional(v.union(v.id('profiles'), v.null())),
    guestId: v.optional(v.union(v.id('guest_players'), v.null())),
    is_guest: v.boolean(),
    course_handicap: v.number(),
    supabaseId: v.optional(v.string()),
  })
    .index('by_round', ['roundId'])
    .index('by_profile', ['profileId'])
    .index('by_round_and_profile', ['roundId', 'profileId'])
    .index('by_supabaseId', ['supabaseId']),

  scores: defineTable({
    roundId: v.id('rounds'),
    profileId: v.id('profiles'),
    hole_number: v.number(),
    strokes: v.optional(v.union(v.number(), v.null())),
    putts: v.optional(v.union(v.number(), v.null())),
    fairway: v.optional(v.union(v.boolean(), v.null())),
    gir: v.optional(v.union(v.boolean(), v.null())),
    penalties: v.optional(v.union(v.number(), v.null())),
    in_bunker: v.optional(v.union(v.boolean(), v.null())),
    supabaseId: v.optional(v.string()),
  })
    .index('by_round', ['roundId'])
    .index('by_round_and_hole', ['roundId', 'hole_number'])
    .index('by_profile', ['profileId'])
    .index('by_round_profile_hole', ['roundId', 'profileId', 'hole_number']),

  guest_players: defineTable({
    name: v.string(),
    handicap_index: v.number(),
    createdBy: v.optional(v.union(v.id('profiles'), v.null())),
    supabaseId: v.optional(v.string()),
  }).index('by_supabaseId', ['supabaseId']),

  round_modes: defineTable({
    roundId: v.id('rounds'),
    mode: v.string(),
    is_primary: v.boolean(),
    supabaseId: v.optional(v.string()),
  }).index('by_round', ['roundId']),

  leagues: defineTable({
    name: v.string(),
    createdBy: v.optional(v.union(v.id('profiles'), v.null())),
    total_rounds: v.number(),
    mode: v.string(),
    active: v.boolean(),
    supabaseId: v.optional(v.string()),
  }).index('by_supabaseId', ['supabaseId']),

  league_players: defineTable({
    leagueId: v.id('leagues'),
    profileId: v.id('profiles'),
    is_admin: v.boolean(),
    supabaseId: v.optional(v.string()),
  })
    .index('by_league', ['leagueId'])
    .index('by_profile', ['profileId'])
    .index('by_league_and_profile', ['leagueId', 'profileId']),

  league_standings: defineTable({
    leagueId: v.id('leagues'),
    profileId: v.id('profiles'),
    total_points: v.number(),
    rounds_played: v.number(),
    wins: v.number(),
    supabaseId: v.optional(v.string()),
  })
    .index('by_league', ['leagueId'])
    .index('by_league_and_profile', ['leagueId', 'profileId']),

  league_rounds: defineTable({
    leagueId: v.id('leagues'),
    roundId: v.id('rounds'),
    round_number: v.number(),
    played_at: v.string(),
    supabaseId: v.optional(v.string()),
  })
    .index('by_league', ['leagueId'])
    .index('by_round', ['roundId']),

  whs_differentials: defineTable({
    profileId: v.id('profiles'),
    roundId: v.optional(v.union(v.id('rounds'), v.null())),
    adjusted_gross_score: v.number(),
    course_rating: v.number(),
    slope: v.number(),
    differential: v.number(),
    is_counting: v.boolean(),
    is_pp: v.optional(v.boolean()),
    played_at: v.string(),
  })
    .index('by_profile', ['profileId'])
    .index('by_profile_and_round', ['profileId', 'roundId']),

  tournaments: defineTable({
    name: v.string(),
    courseId: v.id('courses'),
    mode: v.string(),
    createdBy: v.optional(v.union(v.id('profiles'), v.null())),
    status: v.string(),
    date: v.string(),
    supabaseId: v.optional(v.string()),
  }).index('by_supabaseId', ['supabaseId']),

  tournament_players: defineTable({
    tournamentId: v.id('tournaments'),
    profileId: v.optional(v.union(v.id('profiles'), v.null())),
    group_number: v.number(),
    supabaseId: v.optional(v.string()),
  }).index('by_tournament', ['tournamentId']),

  tournament_groups: defineTable({
    tournamentId: v.id('tournaments'),
    group_number: v.number(),
    roundId: v.id('rounds'),
    supabaseId: v.optional(v.string()),
  })
    .index('by_tournament', ['tournamentId'])
    .index('by_round', ['roundId']),
})
