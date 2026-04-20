import type { Metadata, Viewport } from 'next'
import { Nunito, Playfair_Display } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

const nunito = Nunito({ 
  subsets: ["latin"],
  variable: '--font-nunito',
  display: 'swap',
})

const playfair = Playfair_Display({ 
  subsets: ["latin"],
  variable: '--font-playfair',
  display: 'swap',
})

const faviconUrl =
  'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/logo.png-9PRt6VvVg2J9Sj6NSGB2xb7NeKJH9W.webp'

export const metadata: Metadata = {
  title: {
    default: 'Lingua Bloom - AI-Powered Test Generation',
    template: '%s | Lingua Bloom',
  },
  description: 'Transform your PDFs into interactive tests and exercises with AI. Upload any document and generate comprehensive quizzes, flashcards, and study materials instantly.',
  keywords: ['AI test generation', 'PDF to quiz', 'educational technology', 'study tools', 'exam preparation', 'learning platform'],
  authors: [{ name: 'Lingua Bloom' }],
  creator: 'Lingua Bloom',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'Lingua Bloom',
    title: 'Lingua Bloom - AI-Powered Test Generation',
    description: 'Transform your PDFs into interactive tests and exercises with AI.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Lingua Bloom - AI-Powered Test Generation',
    description: 'Transform your PDFs into interactive tests and exercises with AI.',
  },
  icons: {
    icon: [{ url: faviconUrl, type: 'image/webp' }],
    apple: faviconUrl,
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F7C6D2' },
    { media: '(prefers-color-scheme: dark)', color: '#1a1a1a' },
  ],
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${nunito.variable} ${playfair.variable} bg-background`}>
      <body className="font-sans antialiased min-h-screen">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
