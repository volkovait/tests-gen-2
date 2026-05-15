/**
 * Seeds public.lesson_generation_references from ref/lesson-generation-references/*.bundle.json
 * using the Supabase service role (required: bypasses RLS; there are no insert policies for users).
 *
 * Env: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL, and SUPABASE_SERVICE_ROLE_KEY.
 * Reads `.env` and `.env.local` from the repo root (same as Next.js order: base then local overlay).
 * Optional: merge lessons.spec_json into the reference when example_lesson_id is set in the bundle.
 *
 * Usage:
 *   pnpm seed:generation-references
 *   pnpm seed:generation-references -- path/to/custom.bundle.json
 */

import { readFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

import {
  lessonGenerationReferenceBundleSchema,
  type LessonGenerationReferenceBundle,
} from '../lib/lesson-generation/reference-bundle'

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(here, '..')

function parseEnvFileContent(content: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const rawLine of content.split('\n')) {
    const trimmed = rawLine.trim()
    if (trimmed === '' || trimmed.startsWith('#')) {
      continue
    }
    const withoutExport = trimmed.startsWith('export ')
      ? trimmed.slice('export '.length).trim()
      : trimmed
    const equalsIndex = withoutExport.indexOf('=')
    if (equalsIndex === -1) {
      continue
    }
    const key = withoutExport.slice(0, equalsIndex).trim()
    let value = withoutExport.slice(equalsIndex + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    out[key] = value
  }
  return out
}

/** Same layering as Next: `.env` then `.env.local` overrides. Shell env wins over files. */
async function loadEnvFilesFromDirectory(directory: string): Promise<void> {
  const fromFiles: Record<string, string> = {}
  for (const fileName of ['.env', '.env.local']) {
    let content: string
    try {
      content = await readFile(join(directory, fileName), 'utf8')
    } catch {
      continue
    }
    Object.assign(fromFiles, parseEnvFileContent(content))
  }
  for (const [key, value] of Object.entries(fromFiles)) {
    if (process.env[key] === undefined) {
      process.env[key] = value
    }
  }
}

function getSupabaseUrl(): string {
  const fromEnv =
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? ''
  if (!fromEnv) {
    throw new Error(
      'Set NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL for the seed script.',
    )
  }
  return fromEnv
}

function getServiceRoleKey(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
  if (!key) {
    throw new Error('Set SUPABASE_SERVICE_ROLE_KEY for the seed script.')
  }
  return key
}

async function loadDefaultBundlePath(): Promise<string> {
  return join(
    repoRoot,
    'ref',
    'lesson-generation-references',
    'run-2026-05-12_20-42-35.bundle.json',
  )
}

async function readBundleFromPath(bundlePath: string): Promise<LessonGenerationReferenceBundle> {
  const raw = await readFile(bundlePath, 'utf8')
  const parsed: unknown = JSON.parse(raw)
  return lessonGenerationReferenceBundleSchema.parse(parsed)
}

async function fetchSpecJsonForLesson(
  supabase: SupabaseClient,
  lessonId: string,
): Promise<unknown | null> {
  const { data, error } = await supabase
    .from('lessons')
    .select('spec_json')
    .eq('id', lessonId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }
  const row = data as { spec_json: unknown } | null
  return row?.spec_json ?? null
}

async function main(): Promise<void> {
  await loadEnvFilesFromDirectory(repoRoot)

  const bundlePath =
    process.argv.slice(2).find((argument) => !argument.startsWith('-')) ??
    (await loadDefaultBundlePath())

  const resolvedBundlePath = resolve(bundlePath)
  const bundle = await readBundleFromPath(resolvedBundlePath)

  const supabase = createClient(getSupabaseUrl(), getServiceRoleKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  let specJson: unknown | null = null
  if (bundle.example_lesson_id) {
    specJson = await fetchSpecJsonForLesson(supabase, bundle.example_lesson_id)
    if (specJson === null || specJson === undefined) {
      console.warn(
        `lessons.spec_json missing for example_lesson_id=${bundle.example_lesson_id}; storing reference without spec_json.`,
      )
    }
  }

  const metrics = bundle.metrics ?? {}
  const row = {
    slug: bundle.slug,
    title: bundle.title,
    description: bundle.description ?? null,
    generation_mode: bundle.generation_mode ?? null,
    source_local_run_folder: bundle.source_local_run_folder ?? null,
    steps: bundle.steps,
    spec_json: specJson,
    metrics,
    example_lesson_id: bundle.example_lesson_id ?? null,
  }

  const { error } = await supabase.from('lesson_generation_references').upsert(row, {
    onConflict: 'slug',
  })

  if (error) {
    throw new Error(error.message)
  }

  console.log(`Upserted lesson_generation_references slug=${bundle.slug}`)
}

main().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
