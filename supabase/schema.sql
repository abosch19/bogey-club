-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Profiles (extends auth.users)
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  name text not null,
  handicap_index decimal(4,1) not null default 54.0,
  avatar_color text default '#2a6fdb',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS
alter table public.profiles enable row level security;
create policy "Users can view all profiles" on public.profiles for select using (true);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = id);

-- Courses
create table public.courses (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  location text,
  holes_count int not null default 18,
  slope int default 113,
  course_rating decimal(4,1) default 72.0,
  par int default 72,
  active boolean default true,
  created_at timestamptz default now()
);

alter table public.courses enable row level security;
create policy "Anyone can view courses" on public.courses for select using (true);
create policy "Authenticated users can manage courses" on public.courses for all using (auth.role() = 'authenticated');

-- Holes
create table public.holes (
  id uuid primary key default uuid_generate_v4(),
  course_id uuid references public.courses(id) on delete cascade,
  hole_number int not null,
  par int not null,
  stroke_index int not null,
  distance_m int,
  unique(course_id, hole_number)
);

alter table public.holes enable row level security;
create policy "Anyone can view holes" on public.holes for select using (true);
create policy "Authenticated users can manage holes" on public.holes for all using (auth.role() = 'authenticated');

-- Rounds
create table public.rounds (
  id uuid primary key default uuid_generate_v4(),
  course_id uuid references public.courses(id),
  date date default current_date,
  status text default 'active' check (status in ('active', 'completed')),
  created_by uuid references public.profiles(id),
  created_at timestamptz default now()
);

alter table public.rounds enable row level security;
create policy "Users can view rounds they participate in" on public.rounds for select using (
  auth.uid() = created_by or
  exists (select 1 from public.round_players where round_id = id and profile_id = auth.uid())
);
create policy "Users can create rounds" on public.rounds for insert with check (auth.uid() = created_by);
create policy "Round creator can update" on public.rounds for update using (auth.uid() = created_by);

-- Round Players
create table public.round_players (
  id uuid primary key default uuid_generate_v4(),
  round_id uuid references public.rounds(id) on delete cascade,
  profile_id uuid references public.profiles(id),
  course_handicap int default 0,
  unique(round_id, profile_id)
);

alter table public.round_players enable row level security;
create policy "Anyone in the round can view players" on public.round_players for select using (true);
create policy "Users can join rounds" on public.round_players for insert with check (auth.uid() = profile_id);

-- Scores
create table public.scores (
  id uuid primary key default uuid_generate_v4(),
  round_id uuid references public.rounds(id) on delete cascade,
  profile_id uuid references public.profiles(id),
  hole_number int not null,
  strokes int,
  putts int default 0,
  fairway boolean,
  gir boolean default false,
  penalties int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(round_id, profile_id, hole_number)
);

alter table public.scores enable row level security;
create policy "Round participants can view scores" on public.scores for select using (true);
create policy "Users can manage own scores" on public.scores for all using (auth.uid() = profile_id);

-- WHS Differentials
create table public.whs_differentials (
  id uuid primary key default uuid_generate_v4(),
  profile_id uuid references public.profiles(id) on delete cascade,
  round_id uuid references public.rounds(id),
  adjusted_gross_score int not null,
  course_rating decimal(4,1) not null,
  slope int not null,
  differential decimal(5,2) not null,
  is_counting boolean default false,
  played_at date not null,
  created_at timestamptz default now()
);

alter table public.whs_differentials enable row level security;
create policy "Users can view own differentials" on public.whs_differentials for select using (auth.uid() = profile_id);
create policy "Users can insert own differentials" on public.whs_differentials for insert with check (auth.uid() = profile_id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
