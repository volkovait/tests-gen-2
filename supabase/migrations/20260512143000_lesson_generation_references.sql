-- Curated «golden» generation runs: timeline steps + optional spec snapshot for prompts / QA / analytics.
-- Rows are inserted with the Supabase service role (bypasses RLS) or via SQL Editor as postgres.

create table if not exists public.lesson_generation_references (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text,
  generation_mode text check (generation_mode in ('ready_material', 'raw_material')),
  source_local_run_folder text,
  steps jsonb not null default '[]'::jsonb,
  spec_json jsonb,
  metrics jsonb not null default '{}'::jsonb,
  example_lesson_id uuid references public.lessons (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists lesson_generation_references_created_idx
  on public.lesson_generation_references (created_at desc);

comment on table public.lesson_generation_references is
  'Curated successful lesson-generation traces (steps timeline, optional spec_json snapshot). Seeded from ref/lesson-generation-references/*.bundle.json via pnpm seed:generation-references.';

alter table public.lesson_generation_references enable row level security;

drop policy if exists "lesson_generation_references_select_authenticated"
  on public.lesson_generation_references;
create policy "lesson_generation_references_select_authenticated"
  on public.lesson_generation_references
  for select
  to authenticated
  using (true);

-- Mutations only from backend / SQL Editor (service role bypasses RLS; authenticated has no write policies).
