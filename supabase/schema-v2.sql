-- Guest players (no account)
create table public.guest_players (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  handicap_index decimal(4,1) default 36.0,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now()
);
alter table public.guest_players enable row level security;
create policy "Users can manage own guests" on public.guest_players for all using (auth.uid() = created_by);
create policy "Anyone can view guests" on public.guest_players for select using (true);

-- Round modes (which modes are active per round)
create table public.round_modes (
  id uuid primary key default uuid_generate_v4(),
  round_id uuid references public.rounds(id) on delete cascade,
  mode text not null check (mode in ('stroke','matchplay','matchplay_hcp','stableford','wolf','bbb')),
  is_primary boolean default false
);
alter table public.round_modes enable row level security;
create policy "Anyone can view round modes" on public.round_modes for select using (true);
create policy "Authenticated can manage round modes" on public.round_modes for all using (auth.role() = 'authenticated');

-- Add columns to rounds
alter table public.rounds add column if not exists is_practice boolean default false;
alter table public.rounds add column if not exists notes text;

-- Add guest support to round_players
alter table public.round_players add column if not exists guest_id uuid references public.guest_players(id);
alter table public.round_players add column if not exists is_guest boolean default false;

-- Add more detail to scores
alter table public.scores add column if not exists in_bunker boolean default false;

-- Leagues
create table public.leagues (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  created_by uuid references public.profiles(id),
  total_rounds int not null default 10,
  mode text not null default 'stableford',
  active boolean default true,
  created_at timestamptz default now()
);
alter table public.leagues enable row level security;
create policy "Anyone can view leagues" on public.leagues for select using (true);
create policy "Authenticated can create leagues" on public.leagues for insert with check (auth.uid() = created_by);
create policy "Creator can update leagues" on public.leagues for update using (auth.uid() = created_by);

-- League players
create table public.league_players (
  id uuid primary key default uuid_generate_v4(),
  league_id uuid references public.leagues(id) on delete cascade,
  profile_id uuid references public.profiles(id),
  is_admin boolean default false,
  joined_at timestamptz default now(),
  unique(league_id, profile_id)
);
alter table public.league_players enable row level security;
create policy "Anyone can view league players" on public.league_players for select using (true);
create policy "Authenticated can join leagues" on public.league_players for insert with check (auth.uid() = profile_id);
create policy "Admins can manage league players" on public.league_players for all using (auth.role() = 'authenticated');

-- League rounds (rounds that count for a league)
create table public.league_rounds (
  id uuid primary key default uuid_generate_v4(),
  league_id uuid references public.leagues(id) on delete cascade,
  round_id uuid references public.rounds(id) on delete cascade,
  round_number int not null,
  played_at date default current_date,
  unique(league_id, round_id)
);
alter table public.league_rounds enable row level security;
create policy "Anyone can view league rounds" on public.league_rounds for select using (true);
create policy "Authenticated can manage league rounds" on public.league_rounds for all using (auth.role() = 'authenticated');

-- League standings (cumulative)
create table public.league_standings (
  id uuid primary key default uuid_generate_v4(),
  league_id uuid references public.leagues(id) on delete cascade,
  profile_id uuid references public.profiles(id),
  total_points int default 0,
  rounds_played int default 0,
  wins int default 0,
  updated_at timestamptz default now(),
  unique(league_id, profile_id)
);
alter table public.league_standings enable row level security;
create policy "Anyone can view standings" on public.league_standings for select using (true);
create policy "Authenticated can manage standings" on public.league_standings for all using (auth.role() = 'authenticated');
