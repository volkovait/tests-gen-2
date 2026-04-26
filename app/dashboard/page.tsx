import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { AppShell } from "@/components/app-shell"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  History,
  Plus,
  FileText,
  Trophy,
  Target,
  Clock,
  ArrowRight,
  BookOpen,
  MessageCircle,
  Sparkles,
} from "lucide-react"
import { LABELS } from "@/lib/consts"

function joinTest(tests: unknown): { id: string; title: string } | null {
  if (tests === null || tests === undefined) return null
  const row = Array.isArray(tests) ? tests[0] : tests
  if (!row || typeof row !== "object") return null
  if (!("id" in row) || !("title" in row)) return null
  const id = row.id
  const title = row.title
  if (typeof id !== "string" || typeof title !== "string") return null
  return { id, title }
}

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const [
    testsCountRes,
    attemptsCountRes,
    attemptsAvgRes,
    lessonsRes,
    lessonsCountRes,
    progressRes,
    recentTestsRes,
    recentAttemptsRes,
    profileRes,
  ] = await Promise.all([
    supabase.from("tests").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    supabase.from("test_attempts").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    supabase
      .from("test_attempts")
      .select("avg_pct:avg(percentage)")
      .eq("user_id", user.id)
      .not("percentage", "is", null)
      .maybeSingle(),
    supabase
      .from("lessons")
      .select("id, title, source_type, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(3),
    supabase.from("lessons").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    supabase.from("user_progress").select("lessons_completed, xp").eq("user_id", user.id).maybeSingle(),
    supabase
      .from("tests")
      .select("id, title, source_filename, question_count, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(4),
    supabase
      .from("test_attempts")
      .select(
        `
      id,
      score,
      total_questions,
      percentage,
      completed_at,
      tests (
        id,
        title
      )
    `,
      )
      .eq("user_id", user.id)
      .not("completed_at", "is", null)
      .order("completed_at", { ascending: false })
      .limit(4),
    supabase.from("profiles").select("display_name").eq("id", user.id).single(),
  ])

  const totalTests = testsCountRes.count ?? 0
  const totalAttempts = attemptsCountRes.count ?? 0
  const recentLessons = lessonsRes.error ? [] : lessonsRes.data ?? []
  const totalLessons = lessonsCountRes.error ? recentLessons.length : lessonsCountRes.count ?? recentLessons.length
  const lessonsCompleted = (progressRes.data?.lessons_completed as number | undefined) ?? 0
  const xp = (progressRes.data?.xp as number | undefined) ?? 0

  const avgRaw = attemptsAvgRes.data?.avg_pct
  const averageScore =
    avgRaw !== null && avgRaw !== undefined && !Number.isNaN(Number(avgRaw)) ? Math.round(Number(avgRaw)) : 0

  const recentTests = recentTestsRes.data ?? []
  const recentAttempts = recentAttemptsRes.data ?? []

  const profile = profileRes.data
  const displayName = profile?.display_name || user.email?.split("@")[0] || LABELS.DEFAULT_STUDENT_NAME

  return (
    <AppShell active="dashboard">
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="mb-2 font-serif text-3xl font-bold text-primary">
            {LABELS.DASHBOARD_WELCOME_BACK.replace("{name}", displayName)}
          </h1>
          <p className="text-muted-foreground">{LABELS.DASHBOARD_SUBTITLE}</p>
        </div>

        <div className="mb-8 grid gap-4 md:grid-cols-3">
          <Card className="text-card-foreground flex flex-col gap-6 rounded-xl border py-6 shadow-sm border-[var(--lb-progress-track)] bg-card transition-shadow hover:shadow-xl">
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

          <Card className="text-card-foreground flex flex-col gap-6 rounded-xl border py-6 shadow-sm border-[var(--lb-progress-track)] bg-card transition-shadow hover:shadow-xl">
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

          <Card className="border-[var(--lb-progress-track)] bg-card transition-shadow hover:shadow-xl">
            <CardContent className="p-6">
              <Link href="/progress" className="flex items-center justify-between gap-2">
                <div>
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-[var(--lb-progress-track)]/60">
                    <Sparkles className="h-6 w-6 text-[var(--lb-gold)]" />
                  </div>
                  <h3 className="mb-1 font-serif text-lg font-semibold text-foreground">{LABELS.DASHBOARD_CARD_PROGRESS_TITLE}</h3>
                  <p className="text-sm text-muted-foreground">
                    {LABELS.DASHBOARD_CARD_PROGRESS_STATS.replace("{xp}", String(xp)).replace("{count}", String(lessonsCompleted))}
                  </p>
                </div>
                <ArrowRight className="h-6 w-6 shrink-0 text-primary" />
              </Link>
            </CardContent>
          </Card>
        </div>

        <div className="mb-8 grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <BookOpen className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalLessons}</p>
                <p className="text-sm text-muted-foreground">{LABELS.DASHBOARD_STAT_LESSONS_TOTAL}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalTests}</p>
                <p className="text-sm text-muted-foreground">{LABELS.DASHBOARD_STAT_TESTS_LEGACY}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent/20">
                <Target className="h-6 w-6 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalAttempts}</p>
                <p className="text-sm text-muted-foreground">{LABELS.DASHBOARD_STAT_TEST_ATTEMPTS}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[var(--lb-success)]/15">
                <Trophy className="h-6 w-6 text-[var(--lb-success)]" />
              </div>
              <div>
                <p className="text-2xl font-bold">{averageScore}%</p>
                <p className="text-sm text-muted-foreground">{LABELS.DASHBOARD_STAT_AVG_SCORE}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="font-serif flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-[var(--lb-gold)]" />
                  {LABELS.DASHBOARD_LESSONS_TITLE}
                </CardTitle>
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
                      className="flex items-center justify-between rounded-lg border border-border p-3 transition-colors hover:bg-card"
                    >
                      <div>
                        <p className="font-medium text-foreground">{lesson.title}</p>
                        <p className="text-xs text-muted-foreground capitalize">{lesson.source_type}</p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-serif flex items-center gap-2">
                <Clock className="h-5 w-5 text-accent" />
                {LABELS.DASHBOARD_TESTS_RECENT_TITLE}
              </CardTitle>
              <CardDescription>{LABELS.DASHBOARD_TESTS_RECENT_DESC}</CardDescription>
            </CardHeader>
            <CardContent>
              {!recentAttempts || recentAttempts.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  <p className="mb-3">{LABELS.DASHBOARD_TESTS_NO_ATTEMPTS}</p>
                  <Button asChild size="sm" variant="outline">
                    <Link href="/upload">{LABELS.DASHBOARD_TO_TESTS}</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentAttempts.map((attempt) => {
                    const testMeta = joinTest(attempt.tests)
                    return (
                    <Link
                      key={attempt.id}
                      href={`/test/${testMeta?.id ?? ""}`}
                      className="flex items-center justify-between rounded-lg border border-border p-3 transition-colors hover:bg-card"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-lg text-sm font-bold ${
                            Number(attempt.percentage) >= 70
                              ? "bg-[var(--lb-success)]/15 text-[var(--lb-success)]"
                              : Number(attempt.percentage) >= 50
                                ? "bg-[var(--lb-gold)]/20 text-[var(--lb-gold)]"
                                : "bg-destructive/10 text-destructive"
                          }`}
                        >
                          {Math.round(Number(attempt.percentage))}%
                        </div>
                        <div>
                          <p className="font-medium">{testMeta?.title ?? LABELS.TEST_FALLBACK_TITLE}</p>
                          <p className="text-xs text-muted-foreground">
                            {LABELS.DASHBOARD_SCORE_CORRECT
                              .replace("{score}", String(attempt.score))
                              .replace("{total}", String(attempt.total_questions))}
                          </p>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </Link>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {recentTests && recentTests.length > 0 ? (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="font-serif text-lg">{LABELS.DASHBOARD_TESTS_LEGACY_SECTION}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {recentTests.map((t) => (
                <Button key={t.id} variant="outline" size="sm" asChild>
                  <Link href={`/test/${t.id}`}>{t.title}</Link>
                </Button>
              ))}
              <Button variant="ghost" size="sm" asChild>
                <Link href="/history">
                  <History className="mr-2 h-4 w-4" />
                  {LABELS.HISTORY}
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : null}
      </main>
    </AppShell>
  )
}
