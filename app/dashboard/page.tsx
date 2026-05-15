import { createClient } from "@/lib/supabase/server"
import { isAuthDisabled } from "@/lib/auth/auth-disabled"
import { redirect } from "next/navigation"
import Link from "next/link"
import { AppShell } from "@/components/app-shell"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowRight, History, MessageCircle, Plus } from "lucide-react"
import { LABELS } from "@/lib/consts"

export default async function DashboardPage() {
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
          .select("id, title, source_type, created_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(8)
      : { data: [] as const, error: null as null }

  const recentLessons = lessonsRes.error ? [] : lessonsRes.data ?? []

  const profileRes =
    userId !== null
      ? await supabase.from("profiles").select("display_name").eq("id", userId).single()
      : { data: null as { display_name?: string | null } | null }
  const displayName =
    user !== null
      ? profileRes.data?.display_name || user.email?.split("@")[0] || LABELS.DEFAULT_STUDENT_NAME
      : "Гость"

  return (
    <AppShell active="dashboard">
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="mb-2 font-serif text-3xl font-bold text-primary">
            {LABELS.DASHBOARD_WELCOME_BACK.replace("{name}", displayName)}
          </h1>
          <p className="text-muted-foreground">{LABELS.DASHBOARD_SUBTITLE}</p>
        </div>

        <div className="mb-10 grid gap-4 md:grid-cols-3">
          <Card className="border-[#C5CBE3] bg-card transition-shadow hover:shadow-xl">
            <CardContent className="p-6">
              <Link href="/create" className="flex items-center justify-between gap-2">
                <div>
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/15">
                    <MessageCircle className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="mb-1 font-serif text-lg font-semibold text-foreground">{LABELS.CHAT_WITH_AI}</h3>
                  <p className="text-sm text-muted-foreground">{LABELS.DASHBOARD_CARD_CHAT_DESC}</p>
                </div>
                <ArrowRight className="h-6 w-6 shrink-0 text-primary" />
              </Link>
            </CardContent>
          </Card>

          <Card className="border-[#C5CBE3] bg-card transition-shadow hover:shadow-xl">
            <CardContent className="p-6">
              <Link href="/upload" className="flex items-center justify-between gap-2">
                <div>
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-[var(--lb-gold)]/20">
                    <Plus className="h-6 w-6 text-[var(--lb-gold)]" />
                  </div>
                  <h3 className="mb-1 font-serif text-lg font-semibold text-foreground">{LABELS.DASHBOARD_CARD_UPLOAD_TITLE}</h3>
                  <p className="text-sm text-muted-foreground">{LABELS.DASHBOARD_CARD_UPLOAD_DESC}</p>
                </div>
                <ArrowRight className="h-6 w-6 shrink-0 text-primary" />
              </Link>
            </CardContent>
          </Card>

          <Card className="border-[#C5CBE3] bg-card transition-shadow hover:shadow-xl">
            <CardContent className="p-6">
              <Link href="/history" className="flex items-center justify-between gap-2">
                <div>
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <History className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="mb-1 font-serif text-lg font-semibold text-foreground">{LABELS.DASHBOARD_CARD_HISTORY_TITLE}</h3>
                  <p className="text-sm text-muted-foreground">{LABELS.DASHBOARD_CARD_HISTORY_DESC}</p>
                </div>
                <ArrowRight className="h-6 w-6 shrink-0 text-primary" />
              </Link>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4">
            <div>
              <CardTitle className="font-serif">{LABELS.DASHBOARD_LESSONS_TITLE}</CardTitle>
              <CardDescription>{LABELS.DASHBOARD_LESSONS_DESC}</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/history">{LABELS.DASHBOARD_ALL_HISTORY}</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentLessons.length === 0 ? (
              <div className="py-8 text-center">
                <p className="mb-4 text-muted-foreground">{LABELS.DASHBOARD_LESSONS_EMPTY}</p>
                <div className="flex flex-wrap justify-center gap-2">
                  <Button asChild size="sm">
                    <Link href="/create">{LABELS.DASHBOARD_LESSONS_CHAT_SHORT}</Link>
                  </Button>
                  <Button asChild size="sm" variant="secondary">
                    <Link href="/upload">{LABELS.DASHBOARD_LESSONS_FILE_SHORT}</Link>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {recentLessons.map((lesson) => (
                  <Link
                    key={lesson.id}
                    href={`/learn/${lesson.id}/view`}
                    className="flex items-center justify-between rounded-lg border border-border p-3 transition-colors hover:bg-muted/40"
                  >
                    <div>
                      <p className="font-medium text-foreground">{lesson.title}</p>
                      <p className="text-xs capitalize text-muted-foreground">{lesson.source_type}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </AppShell>
  )
}
