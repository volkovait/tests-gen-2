import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
  Trash2
} from "lucide-react"
import { DeleteTestButton } from "./delete-test-button"

function formatDate(dateString: string) {
  const date = new Date(dateString)
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  })
}

function formatDuration(seconds: number | null) {
  if (!seconds) return "N/A"
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}m ${secs}s`
}

export default async function HistoryPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect("/auth/login")
  }

  // Get all tests
  const { data: tests } = await supabase
    .from("tests")
    .select("id, title, source_filename, question_count, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  // Get all attempts with test info
  const { data: attempts } = await supabase
    .from("test_attempts")
    .select(`
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
    `)
    .eq("user_id", user.id)
    .not("completed_at", "is", null)
    .order("completed_at", { ascending: false })

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-3">
            <Image
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/logo.png-9PRt6VvVg2J9Sj6NSGB2xb7NeKJH9W.webp"
              alt="Lingua Bloom Logo"
              width={36}
              height={36}
              className="rounded-lg"
            />
            <span className="font-serif text-lg font-semibold text-foreground">Lingua Bloom</span>
          </Link>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Link>
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-serif font-bold text-foreground mb-2">History</h1>
            <p className="text-muted-foreground">View your tests and past attempts</p>
          </div>
          <Button asChild>
            <Link href="/upload">
              <Plus className="h-4 w-4 mr-2" />
              New Test
            </Link>
          </Button>
        </div>

        <Tabs defaultValue="tests" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="tests" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              My Tests ({tests?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="attempts" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Attempts ({attempts?.length || 0})
            </TabsTrigger>
          </TabsList>

          {/* Tests Tab */}
          <TabsContent value="tests">
            {!tests || tests.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <FileText className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">No tests yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Upload a PDF to create your first test
                  </p>
                  <Button asChild>
                    <Link href="/upload">Create Your First Test</Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {tests.map((test) => (
                  <Card key={test.id} className="hover:border-primary/30 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <Link href={`/test/${test.id}`} className="flex items-center gap-4 flex-1">
                          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <FileText className="h-6 w-6 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-foreground truncate">{test.title}</h3>
                            {test.source_filename && (
                              <p className="text-sm text-muted-foreground truncate">
                                Source: {test.source_filename}
                              </p>
                            )}
                            <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Target className="h-3 w-3" />
                                {test.question_count} questions
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {formatDate(test.created_at)}
                              </span>
                            </div>
                          </div>
                        </Link>
                        <div className="flex items-center gap-2">
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

          {/* Attempts Tab */}
          <TabsContent value="attempts">
            {!attempts || attempts.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Target className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">No attempts yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Take a test to see your results here
                  </p>
                  <Button asChild variant="outline">
                    <Link href="/upload">Create a Test</Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {attempts.map((attempt) => {
                  const percentage = Number(attempt.percentage)
                  const scoreColor = percentage >= 70 
                    ? "text-green-500 bg-green-500/10" 
                    : percentage >= 50 
                      ? "text-yellow-500 bg-yellow-500/10" 
                      : "text-red-500 bg-red-500/10"

                  return (
                    <Card key={attempt.id} className="hover:border-primary/30 transition-colors">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4 flex-1">
                            <div className={`w-12 h-12 rounded-lg flex items-center justify-center shrink-0 ${scoreColor}`}>
                              <span className="text-lg font-bold">
                                {Math.round(percentage)}%
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-foreground truncate">
                                {(attempt.tests as unknown as { title: string })?.title || "Unknown Test"}
                              </h3>
                              <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Trophy className="h-3 w-3" />
                                  {attempt.score}/{attempt.total_questions} correct
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {formatDuration(attempt.time_spent_seconds)}
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">
                                <Calendar className="h-3 w-3 inline mr-1" />
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
    </div>
  )
}
