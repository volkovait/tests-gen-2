import { notFound, redirect } from 'next/navigation'
import { AppShell } from '@/components/app-shell'
import { createClient } from '@/lib/supabase/server'
import { LearnViewClient } from './learn-view-client'

export default async function LearnViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect(`/auth/login?next=${encodeURIComponent(`/learn/${id}/view`)}`)
  }

  const { data: lesson } = await supabase.from('lessons').select('id, title').eq('id', id).maybeSingle()
  if (!lesson) {
    notFound()
  }

  return (
    <AppShell>
      <LearnViewClient lessonId={lesson.id} lessonTitle={lesson.title} />
    </AppShell>
  )
}
