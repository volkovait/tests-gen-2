-- Lesson generation runs (LangGraph thread + UI), events log, assets, lineage; lessons.spec_json

create table if not exists public.lesson_generation_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  thread_id text not null unique,
  status text not null check (status in ('running', 'interrupted', 'failed', 'completed')) default 'running',
  phase text not null default 'init',
  mode text not null check (mode in ('ready_material', 'raw_material')),
  lesson_id uuid references public.lessons (id) on delete set null,
  error_code text,
  error_message text,
  title text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists lesson_generation_runs_user_created_idx
  on public.lesson_generation_runs (user_id, created_at desc);

alter table public.lesson_generation_runs enable row level security;

drop policy if exists "lesson_generation_runs_select_own" on public.lesson_generation_runs;
create policy "lesson_generation_runs_select_own" on public.lesson_generation_runs
  for select using (auth.uid() = user_id);

drop policy if exists "lesson_generation_runs_insert_own" on public.lesson_generation_runs;
create policy "lesson_generation_runs_insert_own" on public.lesson_generation_runs
  for insert with check (auth.uid() = user_id);

drop policy if exists "lesson_generation_runs_update_own" on public.lesson_generation_runs;
create policy "lesson_generation_runs_update_own" on public.lesson_generation_runs
  for update using (auth.uid() = user_id);

drop policy if exists "lesson_generation_runs_delete_own" on public.lesson_generation_runs;
create policy "lesson_generation_runs_delete_own" on public.lesson_generation_runs
  for delete using (auth.uid() = user_id);

create table if not exists public.lesson_generation_events (
  id bigserial primary key,
  run_id uuid not null references public.lesson_generation_runs (id) on delete cascade,
  seq bigint not null,
  emoji text not null default '',
  title text not null,
  detail text,
  node_id text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (run_id, seq)
);

create index if not exists lesson_generation_events_run_seq_idx
  on public.lesson_generation_events (run_id, seq);

alter table public.lesson_generation_events enable row level security;

drop policy if exists "lesson_generation_events_select_own" on public.lesson_generation_events;
create policy "lesson_generation_events_select_own" on public.lesson_generation_events
  for select using (
    exists (
      select 1 from public.lesson_generation_runs r
      where r.id = lesson_generation_events.run_id and r.user_id = auth.uid()
    )
  );

drop policy if exists "lesson_generation_events_insert_own" on public.lesson_generation_events;
create policy "lesson_generation_events_insert_own" on public.lesson_generation_events
  for insert with check (
    exists (
      select 1 from public.lesson_generation_runs r
      where r.id = lesson_generation_events.run_id and r.user_id = auth.uid()
    )
  );

create table if not exists public.lesson_material_assets (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.lesson_generation_runs (id) on delete cascade,
  kind text not null check (kind in ('relevant', 'raw')),
  filename text,
  mime_type text,
  extracted_text text,
  created_at timestamptz not null default now()
);

create index if not exists lesson_material_assets_run_idx on public.lesson_material_assets (run_id);

alter table public.lesson_material_assets enable row level security;

drop policy if exists "lesson_material_assets_select_own" on public.lesson_material_assets;
create policy "lesson_material_assets_select_own" on public.lesson_material_assets
  for select using (
    exists (
      select 1 from public.lesson_generation_runs r
      where r.id = lesson_material_assets.run_id and r.user_id = auth.uid()
    )
  );

drop policy if exists "lesson_material_assets_insert_own" on public.lesson_material_assets;
create policy "lesson_material_assets_insert_own" on public.lesson_material_assets
  for insert with check (
    exists (
      select 1 from public.lesson_generation_runs r
      where r.id = lesson_material_assets.run_id and r.user_id = auth.uid()
    )
  );

create table if not exists public.lesson_lineage (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  source_lesson_id uuid references public.lessons (id) on delete set null,
  transform_kind text check (transform_kind in ('copy_edit', 'regenerate_section')),
  instruction_snapshot text,
  created_at timestamptz not null default now()
);

create index if not exists lesson_lineage_lesson_idx on public.lesson_lineage (lesson_id);

alter table public.lesson_lineage enable row level security;

drop policy if exists "lesson_lineage_select_own" on public.lesson_lineage;
create policy "lesson_lineage_select_own" on public.lesson_lineage
  for select using (
    exists (select 1 from public.lessons l where l.id = lesson_lineage.lesson_id and l.user_id = auth.uid())
  );

drop policy if exists "lesson_lineage_insert_own" on public.lesson_lineage;
create policy "lesson_lineage_insert_own" on public.lesson_lineage
  for insert with check (
    exists (select 1 from public.lessons l where l.id = lesson_lineage.lesson_id and l.user_id = auth.uid())
  );

alter table public.lessons
  add column if not exists spec_json jsonb,
  add column if not exists generation_run_id uuid references public.lesson_generation_runs (id) on delete set null;

create index if not exists lessons_generation_run_id_idx on public.lessons (generation_run_id);
