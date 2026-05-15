import type { SupabaseClient } from '@supabase/supabase-js'

export type LessonGenerationRunRow = {
  id: string
  user_id: string
  thread_id: string
  status: string
  phase: string
  mode: string
  lesson_id: string | null
  error_code: string | null
  error_message: string | null
  title: string | null
  payload: Record<string, unknown>
}

export async function insertLessonGenerationRun(
  supabase: SupabaseClient,
  input: {
    /** Явный id сессии (совпадает с thread_id в LangGraph). Если не передан — генерирует БД. */
    runId?: string
    userId: string
    threadId: string
    mode: 'ready_material' | 'raw_material'
    title: string | null
    payload?: Record<string, unknown>
  },
): Promise<{ runId: string }> {
  const { data, error } = await supabase
    .from('lesson_generation_runs')
    .insert({
      ...(input.runId ? { id: input.runId } : {}),
      user_id: input.userId,
      thread_id: input.threadId,
      mode: input.mode,
      status: 'running',
      phase: 'init',
      title: input.title,
      payload: input.payload ?? {},
    })
    .select('id')
    .single()

  if (error) {
    throw new Error(error.message)
  }
  if (!data?.id) {
    throw new Error('lesson_generation_runs insert returned no id')
  }
  return { runId: data.id as string }
}

export async function updateLessonGenerationRun(
  supabase: SupabaseClient,
  input: {
    runId: string
    userId: string
    status?: 'running' | 'interrupted' | 'failed' | 'completed'
    phase?: string
    mode?: 'ready_material' | 'raw_material'
    lessonId?: string | null
    errorCode?: string | null
    errorMessage?: string | null
    payloadPatch?: Record<string, unknown>
  },
): Promise<void> {
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (input.status !== undefined) patch.status = input.status
  if (input.phase !== undefined) patch.phase = input.phase
  if ('mode' in input && input.mode !== undefined) {
    patch.mode = input.mode
  }
  if (input.lessonId !== undefined) patch.lesson_id = input.lessonId
  if (input.errorCode !== undefined) patch.error_code = input.errorCode
  if (input.errorMessage !== undefined) patch.error_message = input.errorMessage

  if (input.payloadPatch && Object.keys(input.payloadPatch).length > 0) {
    const { data: current } = await supabase
      .from('lesson_generation_runs')
      .select('payload')
      .eq('id', input.runId)
      .eq('user_id', input.userId)
      .maybeSingle()
    const prev = (current?.payload as Record<string, unknown> | undefined) ?? {}
    patch.payload = { ...prev, ...input.payloadPatch }
  }

  const { error } = await supabase
    .from('lesson_generation_runs')
    .update(patch)
    .eq('id', input.runId)
    .eq('user_id', input.userId)

  if (error) {
    throw new Error(error.message)
  }
}

export async function fetchLessonGenerationRun(
  supabase: SupabaseClient,
  input: { runId: string; userId: string },
): Promise<LessonGenerationRunRow | null> {
  const { data, error } = await supabase
    .from('lesson_generation_runs')
    .select('id, user_id, thread_id, status, phase, mode, lesson_id, error_code, error_message, title, payload')
    .eq('id', input.runId)
    .eq('user_id', input.userId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }
  if (!data) return null
  return data as LessonGenerationRunRow
}

export async function appendLessonGenerationEvent(
  supabase: SupabaseClient,
  input: {
    runId: string
    emoji: string
    title: string
    detail?: string
    nodeId?: string
    payload?: Record<string, unknown>
  },
): Promise<{ seq: number }> {
  const { data: lastRow } = await supabase
    .from('lesson_generation_events')
    .select('seq')
    .eq('run_id', input.runId)
    .order('seq', { ascending: false })
    .limit(1)
    .maybeSingle()

  const nextSeq = typeof lastRow?.seq === 'number' ? lastRow.seq + 1 : 1

  const { error } = await supabase.from('lesson_generation_events').insert({
    run_id: input.runId,
    seq: nextSeq,
    emoji: input.emoji,
    title: input.title,
    detail: input.detail ?? null,
    node_id: input.nodeId ?? null,
    payload: input.payload ?? {},
  })

  if (error) {
    throw new Error(error.message)
  }

  return { seq: nextSeq }
}

export async function listLessonGenerationEvents(
  supabase: SupabaseClient,
  input: { runId: string; userId: string; afterSeq?: number },
): Promise<
  Array<{
    seq: number
    emoji: string
    title: string
    detail: string | null
    node_id: string | null
    created_at: string
  }>
> {
  const run = await fetchLessonGenerationRun(supabase, { runId: input.runId, userId: input.userId })
  if (!run) return []

  let query = supabase
    .from('lesson_generation_events')
    .select('seq, emoji, title, detail, node_id, created_at')
    .eq('run_id', input.runId)
    .order('seq', { ascending: true })

  if (input.afterSeq !== undefined) {
    query = query.gt('seq', input.afterSeq)
  }

  const { data, error } = await query
  if (error) {
    throw new Error(error.message)
  }
  return (data ?? []) as Array<{
    seq: number
    emoji: string
    title: string
    detail: string | null
    node_id: string | null
    created_at: string
  }>
}
