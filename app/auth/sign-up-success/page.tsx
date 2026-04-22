import Link from "next/link"
import Image from "next/image"
import logoImg from "@/assets/logo.png"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Mail, ArrowLeft } from "lucide-react"
import { LABELS } from "@/lib/consts"

export default function SignUpSuccessPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src={logoImg}
              alt={LABELS.AUTH_SIGNUP_SUCCESS_LOGO_ALT}
              width={80}
              height={80}
              className="rounded-lg"
            />
            <span className="font-serif text-lg font-semibold text-foreground">{LABELS.AUTH_BRAND_DISPLAY}</span>
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Mail className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl font-serif">{LABELS.AUTH_SIGNUP_SUCCESS_TITLE}</CardTitle>
            <CardDescription className="text-base">
              {LABELS.AUTH_SIGNUP_SUCCESS_DESC}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center text-sm text-muted-foreground">
              <p>
                {LABELS.AUTH_SIGNUP_SUCCESS_HINT_1}
              </p>
              <p className="mt-2">
                {LABELS.AUTH_SIGNUP_SUCCESS_HINT_2}
              </p>
            </div>
            <Button variant="outline" asChild className="w-full">
              <Link href="/auth/login">
                <ArrowLeft className="h-4 w-4 mr-2" />
                {LABELS.AUTH_BACK_TO_SIGN_IN}
              </Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
