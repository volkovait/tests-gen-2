import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import logoImg from "@/assets/logo.png"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  Upload, 
  History, 
  Plus, 
  FileText, 
  Trophy, 
  Target, 
  Clock,
  ArrowRight,
  BookOpen,
  LogOut
} from "lucide-react"

export default async function DashboardPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect("/auth/login")
  }

  // Get stats
  const [testsResult, attemptsResult] = await Promise.all([
    supabase.from("tests").select("id", { count: "exact" }).eq("user_id", user.id),
    supabase.from("test_attempts").select("id, score, total_questions, percentage", { count: "exact" }).eq("user_id", user.id)
  ])

  const totalTests = testsResult.count || 0
  const totalAttempts = attemptsResult.count || 0
  
  let averageScore = 0
  if (attemptsResult.data && attemptsResult.data.length > 0) {
    const scores = attemptsResult.data.filter(a => a.percentage !== null).map(a => Number(a.percentage))
    if (scores.length > 0) {
      averageScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    }
  }

  // Get recent tests
  const { data: recentTests } = await supabase
    .from("tests")
    .select("id, title, source_filename, question_count, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(5)

  // Get recent attempts  
  const { data: recentAttempts } = await supabase
    .from("test_attempts")
    .select(`
      id,
      score,
      total_questions,
      percentage,
      completed_at,
      tests (
        id,
        title
      )
    `)
    .eq("user_id", user.id)
    .not("completed_at", "is", null)
    .order("completed_at", { ascending: false })
    .limit(5)

  // Get profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .single()

  const displayName = profile?.display_name || user.email?.split("@")[0] || "User"

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-3">
            <Image
              src={logoImg}
              alt="Lingua Bloom Logo"
              width={80}
              height={80}
              className="rounded-lg"
            />
            <span className="font-serif text-lg font-semibold text-foreground">Lingua Bloom</span>
          </Link>
          <nav className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/upload">
                <Upload className="h-4 w-4 mr-2" />
                Upload
              </Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/history">
                <History className="h-4 w-4 mr-2" />
                History
              </Link>
            </Button>
            <form action="/auth/signout" method="post">
              <Button variant="ghost" size="sm" type="submit">
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </form>
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-serif font-bold text-foreground mb-2">
            Welcome back, {displayName}!
          </h1>
          <p className="text-muted-foreground">
            Ready to continue your learning journey?
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20 hover:border-primary/40 transition-colors">
            <CardContent className="p-6">
              <Link href="/upload" className="flex items-center justify-between">
                <div>
                  <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center mb-4">
                    <Plus className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-serif font-semibold text-foreground mb-1">
                    Create New Test
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    Upload a PDF and generate questions
                  </p>
                </div>
                <ArrowRight className="h-6 w-6 text-primary" />
              </Link>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-accent/10 to-accent/5 border-accent/20 hover:border-accent/40 transition-colors">
            <CardContent className="p-6">
              <Link href="/history" className="flex items-center justify-between">
                <div>
                  <div className="w-12 h-12 rounded-lg bg-accent/20 flex items-center justify-center mb-4">
                    <History className="h-6 w-6 text-accent" />
                  </div>
                  <h3 className="text-xl font-serif font-semibold text-foreground mb-1">
                    View History
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    Review past tests and results
                  </p>
                </div>
                <ArrowRight className="h-6 w-6 text-accent" />
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Stats Grid */}
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{totalTests}</p>
                  <p className="text-sm text-muted-foreground">Tests Created</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center">
                  <Target className="h-6 w-6 text-accent" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{totalAttempts}</p>
                  <p className="text-sm text-muted-foreground">Tests Completed</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <Trophy className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{averageScore}%</p>
                  <p className="text-sm text-muted-foreground">Average Score</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Recent Tests */}
          <Card>
            <CardHeader>
              <CardTitle className="font-serif flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                Recent Tests
              </CardTitle>
              <CardDescription>Your recently created tests</CardDescription>
            </CardHeader>
            <CardContent>
              {!recentTests || recentTests.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
                  <p className="text-muted-foreground mb-4">No tests created yet</p>
                  <Button asChild size="sm">
                    <Link href="/upload">Create Your First Test</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentTests.map((test) => (
                    <Link
                      key={test.id}
                      href={`/test/${test.id}`}
                      className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-card transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <FileText className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{test.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {test.question_count} questions
                          </p>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Attempts */}
          <Card>
            <CardHeader>
              <CardTitle className="font-serif flex items-center gap-2">
                <Clock className="h-5 w-5 text-accent" />
                Recent Results
              </CardTitle>
              <CardDescription>Your latest test attempts</CardDescription>
            </CardHeader>
            <CardContent>
              {!recentAttempts || recentAttempts.length === 0 ? (
                <div className="text-center py-8">
                  <Target className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
                  <p className="text-muted-foreground mb-4">No attempts yet</p>
                  <Button asChild size="sm" variant="outline">
                    <Link href="/upload">Take Your First Test</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentAttempts.map((attempt) => (
                    <Link
                      key={attempt.id}
                      href={`/history/${attempt.id}`}
                      className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-card transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          Number(attempt.percentage) >= 70 
                            ? "bg-green-500/10" 
                            : Number(attempt.percentage) >= 50 
                              ? "bg-yellow-500/10" 
                              : "bg-red-500/10"
                        }`}>
                          <span className={`text-sm font-bold ${
                            Number(attempt.percentage) >= 70 
                              ? "text-green-500" 
                              : Number(attempt.percentage) >= 50 
                                ? "text-yellow-500" 
                                : "text-red-500"
                          }`}>
                            {Math.round(Number(attempt.percentage))}%
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-foreground">
                            {(attempt.tests as unknown as { title: string })?.title || "Unknown Test"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {attempt.score}/{attempt.total_questions} correct
                          </p>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
