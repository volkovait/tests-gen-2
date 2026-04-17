"use client"

import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Upload, Brain, ClipboardCheck, BarChart3, Sparkles, BookOpen, Clock, Target, ArrowRight, CheckCircle2 } from "lucide-react"

const features = [
  {
    icon: Upload,
    title: "Upload Any PDF",
    description: "Simply drag and drop your study materials, textbooks, or documents in PDF format."
  },
  {
    icon: Brain,
    title: "AI-Powered Analysis",
    description: "Our advanced AI extracts key concepts and generates relevant questions automatically."
  },
  {
    icon: ClipboardCheck,
    title: "Take Interactive Tests",
    description: "Answer multiple choice, true/false, and fill-in-the-blank questions in a beautiful interface."
  },
  {
    icon: BarChart3,
    title: "Track Your Progress",
    description: "View detailed results, identify weak areas, and monitor your improvement over time."
  }
]

const benefits = [
  { icon: Clock, text: "Save hours of manual test creation" },
  { icon: Target, text: "Focus on what matters most" },
  { icon: Sparkles, text: "Personalized learning experience" },
  { icon: BookOpen, text: "Works with any study material" }
]

const howItWorks = [
  {
    step: "01",
    title: "Upload Your PDF",
    description: "Drop your textbook, notes, or any educational PDF into the upload area."
  },
  {
    step: "02", 
    title: "Configure Your Test",
    description: "Choose question types, difficulty level, and the number of questions you want."
  },
  {
    step: "03",
    title: "Generate & Learn",
    description: "Our AI creates a personalized test. Take it, review answers, and track your progress."
  }
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/logo.png-9PRt6VvVg2J9Sj6NSGB2xb7NeKJH9W.webp"
              alt="Lingua Bloom Logo"
              width={40}
              height={40}
              className="rounded-lg"
            />
            <span className="font-serif text-xl font-semibold text-foreground">Lingua Bloom</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            <Link href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Features
            </Link>
            <Link href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              How It Works
            </Link>
          </nav>
          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild>
              <Link href="/auth/login">Sign In</Link>
            </Button>
            <Button asChild className="bg-primary hover:bg-primary/90">
              <Link href="/auth/sign-up">Get Started</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="container mx-auto text-center max-w-4xl">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
            <Sparkles className="h-4 w-4" />
            AI-Powered Learning
          </div>
          <h1 className="text-4xl md:text-6xl font-serif font-bold text-foreground leading-tight text-balance mb-6">
            Transform Any PDF Into
            <span className="block bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Interactive Tests
            </span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 text-pretty">
            Upload your study materials and let our AI generate personalized quizzes instantly. 
            Learn smarter, track progress, and master any subject.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild className="bg-primary hover:bg-primary/90 text-lg px-8">
              <Link href="/auth/sign-up">
                Start Learning Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="text-lg px-8">
              <Link href="#how-it-works">See How It Works</Link>
            </Button>
          </div>
          
          {/* Trust indicators */}
          <div className="mt-12 flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
            {benefits.map((benefit, index) => (
              <div key={index} className="flex items-center gap-2">
                <benefit.icon className="h-4 w-4 text-primary" />
                <span>{benefit.text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 bg-card">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-4">
              Everything You Need to Excel
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Powerful features designed to make learning more efficient and enjoyable.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="bg-background border-border hover:border-primary/50 transition-colors">
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg font-serif">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-muted-foreground">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 px-4">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-4">
              Simple as 1-2-3
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Get started in minutes with our intuitive workflow.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {howItWorks.map((item, index) => (
              <div key={index} className="relative">
                <div className="text-6xl font-serif font-bold text-primary/20 mb-4">
                  {item.step}
                </div>
                <h3 className="text-xl font-serif font-semibold text-foreground mb-2">
                  {item.title}
                </h3>
                <p className="text-muted-foreground">
                  {item.description}
                </p>
                {index < howItWorks.length - 1 && (
                  <ArrowRight className="hidden md:block absolute top-8 -right-4 h-6 w-6 text-primary/30" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-br from-primary/10 via-background to-accent/10">
        <div className="container mx-auto max-w-3xl text-center">
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-4">
            Ready to Bloom?
          </h2>
          <p className="text-muted-foreground text-lg mb-8">
            Join thousands of learners who are already using Lingua Bloom to master their subjects.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild className="bg-primary hover:bg-primary/90 text-lg px-8">
              <Link href="/auth/sign-up">
                Create Free Account
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
          <div className="mt-6 flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              No credit card required
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              Unlimited PDF uploads
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              Cancel anytime
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-border">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <Image
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/logo.png-9PRt6VvVg2J9Sj6NSGB2xb7NeKJH9W.webp"
                alt="Lingua Bloom Logo"
                width={32}
                height={32}
                className="rounded-lg"
              />
              <span className="font-serif text-lg font-semibold text-foreground">Lingua Bloom</span>
            </div>
            <p className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} Lingua Bloom. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
