-- Lingua-Bloom: interactive HTML lessons + progress (run in Supabase SQL editor if migrations CLI is unused)

create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  source_type text not null check (source_type in ('pdf', 'image', 'chat')),
  source_filename text,
  html_body text not null,
  content_version int not null default 1,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists lessons_user_id_created_at_idx on public.lessons (user_id, created_at desc);

alter table public.lessons enable row level security;

drop policy if exists "lessons_select_own" on public.lessons;
create policy "lessons_select_own" on public.lessons for select using (auth.uid() = user_id);

drop policy if exists "lessons_insert_own" on public.lessons;
create policy "lessons_insert_own" on public.lessons for insert with check (auth.uid() = user_id);

drop policy if exists "lessons_update_own" on public.lessons;
create policy "lessons_update_own" on public.lessons for update using (auth.uid() = user_id);

drop policy if exists "lessons_delete_own" on public.lessons;
create policy "lessons_delete_own" on public.lessons for delete using (auth.uid() = user_id);

create table if not exists public.lesson_attempts (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  score int,
  total_questions int,
  percentage numeric(5, 2),
  payload jsonb not null default '{}'::jsonb,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists lesson_attempts_user_idx on public.lesson_attempts (user_id, created_at desc);

alter table public.lesson_attempts enable row level security;

drop policy if exists "lesson_attempts_select_own" on public.lesson_attempts;
create policy "lesson_attempts_select_own" on public.lesson_attempts for select using (auth.uid() = user_id);

drop policy if exists "lesson_attempts_insert_own" on public.lesson_attempts;
create policy "lesson_attempts_insert_own" on public.lesson_attempts for insert with check (auth.uid() = user_id);

drop policy if exists "lesson_attempts_update_own" on public.lesson_attempts;
create policy "lesson_attempts_update_own" on public.lesson_attempts for update using (auth.uid() = user_id);

drop policy if exists "lesson_attempts_delete_own" on public.lesson_attempts;
create policy "lesson_attempts_delete_own" on public.lesson_attempts for delete using (auth.uid() = user_id);

create table if not exists public.user_progress (
  user_id uuid primary key references auth.users (id) on delete cascade,
  lessons_completed int not null default 0,
  streak_days int not null default 0,
  xp int not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.user_progress enable row level security;

drop policy if exists "user_progress_select_own" on public.user_progress;
create policy "user_progress_select_own" on public.user_progress for select using (auth.uid() = user_id);

drop policy if exists "user_progress_insert_own" on public.user_progress;
create policy "user_progress_insert_own" on public.user_progress for insert with check (auth.uid() = user_id);

drop policy if exists "user_progress_update_own" on public.user_progress;
create policy "user_progress_update_own" on public.user_progress for update using (auth.uid() = user_id);

create table if not exists public.achievements (
  id text primary key,
  title text not null,
  description text not null,
  threshold_xp int not null default 0
);

create table if not exists public.user_achievements (
  user_id uuid not null references auth.users (id) on delete cascade,
  achievement_id text not null references public.achievements (id) on delete cascade,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, achievement_id)
);

alter table public.user_achievements enable row level security;

drop policy if exists "user_achievements_select_own" on public.user_achievements;
create policy "user_achievements_select_own" on public.user_achievements for select using (auth.uid() = user_id);

drop policy if exists "user_achievements_insert_own" on public.user_achievements;
create policy "user_achievements_insert_own" on public.user_achievements for insert with check (auth.uid() = user_id);

insert into public.achievements (id, title, description, threshold_xp)
values
  ('first_lesson', 'Первый росток', 'Создан первый интерактивный тест', 0),
  ('explorer', 'Исследователь', 'Набрано 100 XP', 100)
on conflict (id) do nothing;

alter table public.achievements enable row level security;

drop policy if exists "achievements_select_all" on public.achievements;
create policy "achievements_select_all" on public.achievements for select using (true);
