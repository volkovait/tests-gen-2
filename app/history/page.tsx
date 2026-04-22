import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { AppShell } from "@/components/app-shell"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  ArrowLeft,
  FileText,
  Clock,
  Trophy,
  Target,
  Calendar,
  ArrowRight,
  Plus,
  Sparkles,
} from "lucide-react"
import { DeleteTestButton } from "./delete-test-button"
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

function formatDuration(seconds: number | null) {
  if (!seconds) return LABELS.HISTORY_DURATION_EM_DASH
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return LABELS.HISTORY_DURATION.replace("{mins}", String(mins)).replace("{secs}", String(secs))
}

export default async function HistoryPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const [lessonsRes, testsRes, attemptsRes] = await Promise.all([
    supabase
      .from("lessons")
      .select("id, title, source_type, source_filename, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("tests")
      .select("id, title, source_filename, question_count, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("test_attempts")
      .select(
        `
      id,
      score,
      total_questions,
      percentage,
      time_spent_seconds,
      completed_at,
      test_id,
      tests (
        id,
        title
      )
    `,
      )
      .eq("user_id", user.id)
      .not("completed_at", "is", null)
      .order("completed_at", { ascending: false }),
  ])

  const lessonsList = lessonsRes.error ? [] : lessonsRes.data ?? []
  const tests = testsRes.data
  const attempts = attemptsRes.data

  return (
    <AppShell active="history">
      <main className="container mx-auto max-w-4xl px-4 py-8">
        <div className="mb-6 md:hidden">
          <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <ArrowLeft className="h-4 w-4" />
            {LABELS.NAV_CABINET}
          </Link>
        </div>

        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="mb-2 font-serif text-3xl font-bold text-primary">{LABELS.HISTORY}</h1>
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

        <Tabs defaultValue="lessons" className="w-full">
          <TabsList className="mb-6 grid w-full grid-cols-3">
            <TabsTrigger value="lessons" className="gap-2">
              <Sparkles className="h-4 w-4" />
              {LABELS.HISTORY_TAB_LESSONS.replace("{count}", String(lessonsList.length))}
            </TabsTrigger>
            <TabsTrigger value="tests" className="gap-2">
              <FileText className="h-4 w-4" />
              {LABELS.HISTORY_TAB_TESTS.replace("{count}", String(tests?.length || 0))}
            </TabsTrigger>
            <TabsTrigger value="attempts" className="gap-2">
              <Target className="h-4 w-4" />
              {LABELS.HISTORY_TAB_ATTEMPTS.replace("{count}", String(attempts?.length || 0))}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="lessons">
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
                  <Card key={lesson.id} className="transition-colors hover:border-primary/30">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-4">
                        <Link href={`/learn/${lesson.id}/view`} className="min-w-0 flex-1">
                          <div className="flex items-center gap-4">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[var(--lb-gold)]/20">
                              <Sparkles className="h-6 w-6 text-[var(--lb-gold)]" />
                            </div>
                            <div className="min-w-0">
                              <h3 className="truncate font-semibold text-foreground">{lesson.title}</h3>
                              <p className="text-sm capitalize text-muted-foreground">{lesson.source_type}</p>
                              {lesson.source_filename ? (
                                <p className="truncate text-xs text-muted-foreground">{lesson.source_filename}</p>
                              ) : null}
                              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                                <Calendar className="h-3 w-3" />
                                {formatDate(lesson.created_at)}
                              </p>
                            </div>
                          </div>
                        </Link>
                        <Button variant="ghost" size="icon" asChild>
                          <Link href={`/learn/${lesson.id}/view`}>
                            <ArrowRight className="h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="tests">
            {!tests || tests.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <FileText className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
                  <h3 className="mb-2 text-lg font-semibold">{LABELS.HISTORY_TESTS_EMPTY_TITLE}</h3>
                  <p className="mb-4 text-muted-foreground">{LABELS.HISTORY_TESTS_EMPTY_DESC}</p>
                  <Button asChild>
                    <Link href="/upload">{LABELS.HISTORY_CREATE_TEST}</Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {tests.map((test) => (
                  <Card key={test.id} className="transition-colors hover:border-primary/30">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <Link href={`/test/${test.id}`} className="flex min-w-0 flex-1 items-center gap-4">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                            <FileText className="h-6 w-6 text-primary" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="truncate font-semibold text-foreground">{test.title}</h3>
                            {test.source_filename ? (
                              <p className="truncate text-sm text-muted-foreground">
                                {LABELS.HISTORY_TEST_FILE_LABEL.replace("{name}", test.source_filename)}
                              </p>
                            ) : null}
                            <div className="mt-1 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Target className="h-3 w-3" />
                                {LABELS.HISTORY_QUESTION_COUNT.replace("{count}", String(test.question_count))}
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {formatDate(test.created_at)}
                              </span>
                            </div>
                          </div>
                        </Link>
                        <div className="flex shrink-0 items-center gap-2">
                          <DeleteTestButton testId={test.id} testTitle={test.title} />
                          <Button variant="ghost" size="icon" asChild>
                            <Link href={`/test/${test.id}`}>
                              <ArrowRight className="h-4 w-4" />
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="attempts">
            {!attempts || attempts.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Target className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
                  <h3 className="mb-2 text-lg font-semibold">{LABELS.HISTORY_ATTEMPTS_EMPTY_TITLE}</h3>
                  <p className="mb-4 text-muted-foreground">{LABELS.HISTORY_ATTEMPTS_EMPTY_DESC}</p>
                  <Button asChild variant="outline">
                    <Link href="/upload">{LABELS.HISTORY_TO_TESTS}</Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {attempts.map((attempt) => {
                  const percentage = Number(attempt.percentage)
                  const scoreColor =
                    percentage >= 70
                      ? "bg-[var(--lb-success)]/15 text-[var(--lb-success)]"
                      : percentage >= 50
                        ? "bg-[var(--lb-gold)]/20 text-[var(--lb-gold)]"
                        : "bg-destructive/10 text-destructive"

                  return (
                    <Card key={attempt.id} className="transition-colors hover:border-primary/30">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex min-w-0 flex-1 items-center gap-4">
                            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg ${scoreColor}`}>
                              <span className="text-lg font-bold">{Math.round(percentage)}%</span>
                            </div>
                            <div className="min-w-0">
                              <h3 className="truncate font-semibold text-foreground">
                                {(attempt.tests as unknown as { title: string })?.title || LABELS.TEST_FALLBACK_TITLE}
                              </h3>
                              <div className="mt-1 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Trophy className="h-3 w-3" />
                                  {LABELS.HISTORY_ATTEMPT_SCORE
                                    .replace("{score}", String(attempt.score))
                                    .replace("{total}", String(attempt.total_questions))}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {formatDuration(attempt.time_spent_seconds)}
                                </span>
                              </div>
                              <p className="mt-1 text-xs text-muted-foreground">
                                <Calendar className="mr-1 inline h-3 w-3" />
                                {attempt.completed_at && formatDate(attempt.completed_at)}
                              </p>
                            </div>
                          </div>
                          <Button variant="ghost" size="icon" asChild>
                            <Link href={`/test/${attempt.test_id}`}>
                              <ArrowRight className="h-4 w-4" />
                            </Link>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </AppShell>
  )
}
