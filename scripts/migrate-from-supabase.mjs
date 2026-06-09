#!/usr/bin/env node
// Export all Boggey-Club data from Supabase into migration-data.json, ready to
// import into Convex with:  npx convex run migrate:importAll "$(cat migration-data.json)"
//
// Requires the Supabase SERVICE ROLE key (reads RLS-protected tables + auth users):
//   SUPABASE_URL=... SUPABASE_SERVICE_KEY=... node scripts/migrate-from-supabase.mjs
// (SUPABASE_URL defaults to the project's NEXT_PUBLIC_SUPABASE_URL.)

import { writeFileSync } from 'node:fs'

const URL = process.env.SUPABASE_URL || 'https://qkscbeiaxflcidojlwvk.supabase.co'
const KEY = process.env.SUPABASE_SERVICE_KEY
if (!KEY) {
  console.error('✖ Falta SUPABASE_SERVICE_KEY (service role). Ábrelo en Supabase → Project Settings → API.')
  process.exit(1)
}

const headers = { apikey: KEY, Authorization: `Bearer ${KEY}` }

const TABLES = [
  'profiles', 'courses', 'holes', 'rounds', 'round_players', 'scores',
  'guest_players', 'round_modes', 'leagues', 'league_players',
  'league_standings', 'league_rounds', 'tournaments', 'tournament_players',
  'tournament_groups',
]

async function fetchTable(name) {
  const res = await fetch(`${URL}/rest/v1/${name}?select=*`, { headers })
  if (!res.ok) {
    console.warn(`  ! ${name}: ${res.status} ${res.statusText} (omitida)`)
    return []
  }
  return res.json()
}

async function fetchEmails() {
  const map = {}
  let page = 1
  for (;;) {
    const res = await fetch(`${URL}/auth/v1/admin/users?per_page=200&page=${page}`, { headers })
    if (!res.ok) {
      console.warn(`  ! auth users: ${res.status} ${res.statusText} (sin emails)`)
      break
    }
    const body = await res.json()
    const users = body.users ?? body ?? []
    for (const u of users) if (u.id && u.email) map[u.id] = u.email
    if (users.length < 200) break
    page++
  }
  return map
}

const data = {}
for (const t of TABLES) {
  data[t] = await fetchTable(t)
  console.log(`  ✓ ${t}: ${data[t].length}`)
}

const emails = await fetchEmails()
for (const pr of data.profiles ?? []) if (emails[pr.id]) pr.email = emails[pr.id]
console.log(`  ✓ emails: ${Object.keys(emails).length}`)

writeFileSync('migration-data.json', JSON.stringify({ data }))
console.log('\n→ migration-data.json escrito.')
console.log('  Importar (limpio):')
console.log('    npx convex run migrate:wipeAll')
console.log('    npx convex run migrate:importAll "$(cat migration-data.json)"')
