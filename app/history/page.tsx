import { createClient } from "@/lib/supabase/server"
import { isAuthDisabled } from "@/lib/auth/auth-disabled"
import { redirect } from "next/navigation"
import Link from "next/link"
import { AppShell } from "@/components/app-shell"
import { HistoryLessonCard } from "@/components/history/history-lesson-card"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowLeft, Plus, Sparkles } from "lucide-react"
import { LABELS } from "@/lib/consts"

function formatDate(dateString: string) {
  const date = new Date(dateString)
  return date.toLocaleString("ru-RU", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export default async function HistoryPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!isAuthDisabled() && !user) {
    redirect("/auth/login")
  }

  const userId = user?.id ?? null

  const lessonsRes =
    userId !== null
      ? await supabase
          .from("lessons")
          .select("id, title, source_type, source_filename, created_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
      : { data: [], error: null as null }

  const lessonsList = lessonsRes.error ? [] : lessonsRes.data ?? []

  return (
    <AppShell active="history">
      <main className="container mx-auto max-w-4xl px-4 py-8">
        <div className="mb-6 md:hidden">
          <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <ArrowLeft className="h-4 w-4" />
            {LABELS.HISTORY_BACK_DASHBOARD}
          </Link>
        </div>

        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="mb-2 font-serif text-3xl font-bold text-primary">{LABELS.NAV_HISTORY_TESTS}</h1>
            <p className="text-muted-foreground">{LABELS.HISTORY_SUBTITLE}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="secondary">
              <Link href="/create">{LABELS.HISTORY_NEW_LESSON}</Link>
            </Button>
            <Button asChild>
              <Link href="/upload">
                <Plus className="mr-2 h-4 w-4" />
                {LABELS.HISTORY_FILE_BUTTON}
              </Link>
            </Button>
          </div>
        </div>

        {lessonsList.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Sparkles className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
              <h3 className="mb-2 text-lg font-semibold">{LABELS.HISTORY_LESSONS_EMPTY_TITLE}</h3>
              <p className="mb-4 text-muted-foreground">{LABELS.HISTORY_LESSONS_EMPTY_DESC}</p>
              <div className="flex flex-wrap justify-center gap-2">
                <Button asChild>
                  <Link href="/create">{LABELS.HISTORY_CHAT_SHORT}</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/upload">{LABELS.HISTORY_UPLOAD_SHORT}</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {lessonsList.map((lesson) => (
              <HistoryLessonCard
                key={lesson.id}
                lessonId={lesson.id}
                title={lesson.title}
                sourceType={lesson.source_type}
                sourceFilename={lesson.source_filename}
                createdAtLabel={formatDate(lesson.created_at)}
              />
            ))}
          </div>
        )}
      </main>
    </AppShell>
  )
}
