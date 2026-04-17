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
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
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
