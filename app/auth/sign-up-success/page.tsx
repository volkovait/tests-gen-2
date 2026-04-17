import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Mail, ArrowLeft } from "lucide-react"

export default function SignUpSuccessPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/logo.png-9PRt6VvVg2J9Sj6NSGB2xb7NeKJH9W.webp"
              alt="Lingua Bloom Logo"
              width={36}
              height={36}
              className="rounded-lg"
            />
            <span className="font-serif text-lg font-semibold text-foreground">Lingua Bloom</span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Mail className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl font-serif">Check Your Email</CardTitle>
            <CardDescription className="text-base">
              We&apos;ve sent you a confirmation link to verify your email address.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center text-sm text-muted-foreground">
              <p>
                Click the link in the email to activate your account and start creating tests.
              </p>
              <p className="mt-2">
                Don&apos;t see the email? Check your spam folder.
              </p>
            </div>
            <Button variant="outline" asChild className="w-full">
              <Link href="/auth/login">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Sign In
              </Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
