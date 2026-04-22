import Link from "next/link"
import { redirect } from "next/navigation"
import { AppShell } from "@/components/app-shell"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/server"
import { LABELS } from "@/lib/consts"
import { Trophy, Flame, Sparkles } from "lucide-react"

function xpBarPercent(xp: number): number {
  const cap = 200
  return Math.min(100, Math.round((xp / cap) * 100))
}

export default async function ProgressPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect("/auth/login?next=/progress")
  }

  const { data: progress } = await supabase.from("user_progress").select("*").eq("user_id", user.id).maybeSingle()

  const { data: achievements } = await supabase
    .from("user_achievements")
    .select("achievement_id, unlocked_at, achievements ( title, description )")
    .eq("user_id", user.id)

  const lessonsCompleted = (progress?.lessons_completed as number | undefined) ?? 0
  const xp = (progress?.xp as number | undefined) ?? 0
  const streak = (progress?.streak_days as number | undefined) ?? 0
  const xpFill = xpBarPercent(xp)

  return (
    <AppShell active="progress">
      <main className="min-h-[calc(100vh-4rem)] bg-[#EFE2BA] px-4 py-8">
        <div className="mx-auto max-w-3xl">
          <h1 className="mb-2 font-serif text-3xl font-bold text-[#4056A1]">{LABELS.PROGRESS_PAGE_TITLE}</h1>
          <p className="mb-2 text-[#333333]/85">{LABELS.PROGRESS_PAGE_SUBTITLE}</p>

          <div className="mb-8 rounded-xl border-2 border-[#C5CBE3] bg-white p-4 shadow-sm">
            <p className="mb-2 text-sm font-medium text-[#4056A1]">{LABELS.PROGRESS_XP_BAR_CAPTION}</p>
            <div className="lb-progress-bar">
              <div className="lb-progress-bar-fill" style={{ width: `${xpFill}%` }} />
            </div>
            <p className="mt-2 text-xs text-[#333333]/75">{LABELS.PROGRESS_XP_BAR_FOOTNOTE.replace("{xp}", String(xp))}</p>
          </div>

          <div className="mb-8 grid gap-4 sm:grid-cols-3">
            <Card className="border-2 border-[#C5CBE3] bg-white shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base font-semibold text-[#4056A1]">
                  <Sparkles className="h-5 w-5 text-[#D79922]" />
                  {LABELS.PROGRESS_CARD_XP}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="lb-progress-bar mb-2">
                  <div className="lb-progress-bar-fill" style={{ width: `${xpFill}%` }} />
                </div>
                <p className="font-serif text-3xl font-bold text-[#D79922]">{xp}</p>
              </CardContent>
            </Card>
            <Card className="border-2 border-[#C5CBE3] bg-white shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base font-semibold text-[#4056A1]">
                  <Trophy className="h-5 w-5 text-[#F13C20]" />
                  {LABELS.PROGRESS_CARD_LESSONS}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-serif text-3xl font-bold text-[#4056A1]">{lessonsCompleted}</p>
              </CardContent>
            </Card>
            <Card className="border-2 border-[#C5CBE3] bg-white shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base font-semibold text-[#4056A1]">
                  <Flame className="h-5 w-5 text-[#D79922]" />
                  {LABELS.PROGRESS_CARD_STREAK}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-serif text-3xl font-bold text-[#4056A1]">{streak}</p>
                <p className="text-xs text-[#333333]/65">{LABELS.PROGRESS_STREAK_NOTE}</p>
              </CardContent>
            </Card>
          </div>

          <Card className="border-2 border-[#C5CBE3] bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="font-serif text-[#4056A1]">{LABELS.PROGRESS_ACHIEVEMENTS_TITLE}</CardTitle>
              <CardDescription className="text-[#333333]/75">{LABELS.PROGRESS_ACHIEVEMENTS_DESC}</CardDescription>
            </CardHeader>
            <CardContent>
              {!achievements?.length ? (
                <p className="text-sm text-[#333333]/75">{LABELS.PROGRESS_ACHIEVEMENTS_EMPTY}</p>
              ) : (
                <ul className="space-y-4">
                  {achievements.map((row) => {
                    const ach = row.achievements as { title?: string; description?: string } | null
                    return (
                      <li
                        key={row.achievement_id}
                        className="lb-achievement-glow flex items-start gap-4 rounded-xl border-2 border-[#C5CBE3] bg-[#EFE2BA] px-4 py-4"
                      >
                        <div
                          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#F13C20] text-white shadow-lg ring-2 ring-[#F13C20]/50"
                          aria-hidden
                        >
                          <Trophy className="h-6 w-6" />
                        </div>
                        <div>
                          <p className="font-semibold text-[#4056A1]">{ach?.title ?? row.achievement_id}</p>
                          <p className="text-sm text-[#333333]/85">{ach?.description}</p>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
              <Button asChild variant="outline" className="mt-6 border-2 border-[#4056A1] text-[#4056A1] hover:bg-[#EFE2BA]">
                <Link href="/create">{LABELS.PROGRESS_NEW_LESSON}</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </AppShell>
  )
}
