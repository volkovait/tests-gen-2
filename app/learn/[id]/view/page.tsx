import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { AppShell } from '@/components/app-shell'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/server'
import { ExternalLink } from 'lucide-react'
import { LABELS } from '@/lib/consts'

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

  const docUrl = `/learn/${id}/document`

  return (
    <AppShell active="dashboard">
      <main className="min-h-[calc(100vh-4rem)] bg-[#EFE2BA] px-4 py-8">
        <div className="container mx-auto max-w-6xl">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border-2 border-[#C5CBE3] bg-white px-4 py-4 shadow-sm">
            <div>
              <h1 className="font-serif text-2xl font-bold text-[#4056A1] md:text-3xl">{lesson.title}</h1>
              <p className="mt-1 text-sm text-[#333333]/80">{LABELS.LEARN_VIEW_SUBTITLE}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" asChild className="border-2 border-[#4056A1] text-[#4056A1]">
                <Link href="/dashboard">{LABELS.LEARN_VIEW_TO_CABINET}</Link>
              </Button>
              <Button
                size="sm"
                asChild
                className="bg-[#D79922] text-white hover:bg-[#c2891c]"
              >
                <a href={docUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                  {LABELS.LEARN_VIEW_NEW_TAB}
                </a>
              </Button>
            </div>
          </div>
          <iframe
            title={lesson.title}
            className="w-full min-h-[calc(100vh-14rem)] rounded-xl border-2 border-[#4056A1] bg-white shadow-md"
            sandbox="allow-scripts allow-same-origin allow-forms allow-modals"
            src={docUrl}
          />
        </div>
      </main>
    </AppShell>
  )
}
