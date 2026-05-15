import { notFound, redirect } from 'next/navigation'
import { AppShell } from '@/components/app-shell'
import { isAuthDisabled } from '@/lib/auth/auth-disabled'
import { createClient } from '@/lib/supabase/server'
import { parseValidationWarningsFromLessonMeta } from '@/lib/lessons/lesson-partial-validation-meta'
import type { LessonSourceType } from '@/lib/lessons/save-lesson'
import { LearnViewClient } from './learn-view-client'

function parseLessonSourceType(raw: string | null | undefined): LessonSourceType {
  if (raw === 'pdf' || raw === 'image' || raw === 'chat') {
    return raw
  }
  return 'chat'
}

export default async function LearnViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!isAuthDisabled() && !user) {
    redirect(`/auth/login?next=${encodeURIComponent(`/learn/${id}/view`)}`)
  }

  const { data: lesson } = await supabase
    .from('lessons')
    .select('id, title, source_type, meta')
    .eq('id', id)
    .maybeSingle()
  if (!lesson) {
    notFound()
  }

  const sourceType = parseLessonSourceType(
    typeof lesson.source_type === 'string' ? lesson.source_type : undefined,
  )
  const validationWarnings = parseValidationWarningsFromLessonMeta(lesson.meta)
  const lessonTitle = typeof lesson.title === 'string' && lesson.title.trim().length > 0 ? lesson.title : 'Тест'

  return (
    <AppShell>
      <LearnViewClient
        lessonId={lesson.id}
        lessonTitle={lessonTitle}
        sourceType={sourceType}
        validationWarnings={validationWarnings}
      />
    </AppShell>
  )
}
