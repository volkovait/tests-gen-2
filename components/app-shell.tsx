import Link from 'next/link'
import Image from 'next/image'
import type { ReactNode } from 'react'
import logoImg from '@/assets/logo.png'
import { Button } from '@/components/ui/button'
import { LogOut } from 'lucide-react'
import { LABELS } from '@/lib/consts'

type NavKey = 'dashboard' | 'create' | 'upload' | 'history' | 'progress'

const nav: { href: string; label: string; key: NavKey }[] = [
  { href: '/dashboard', label: LABELS.NAV_CABINET, key: 'dashboard' },
  { href: '/create', label: LABELS.CHAT_WITH_AI, key: 'create' },
  { href: '/upload', label: LABELS.FROM_FILE, key: 'upload' },
  { href: '/history', label: LABELS.HISTORY, key: 'history' },
  { href: '/progress', label: LABELS.PROGRESS, key: 'progress' },
]

interface AppShellProps {
  children: ReactNode
  /** When set, highlights matching nav link */
  active?: NavKey
  showSignOut?: boolean
}

export function AppShell({ children, active, showSignOut = true }: AppShellProps) {
  return (
    <div className="min-h-screen bg-[#EFE2BA] text-[#333333]">
      <header className="sticky top-0 z-50 border-b-2 border-[#C5CBE3] bg-[#EFE2BA]/95 backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center justify-between gap-4 px-4">
          <Link href="/dashboard" className="flex items-center gap-2 shrink-0">
            <Image src={logoImg} alt={LABELS.BRAND_LOGO_ALT} width={80} height={80} className="rounded-lg" />
            <span className="font-serif text-lg font-bold tracking-tight text-[#4056A1]">{LABELS.BRAND_NAME}</span>
          </Link>
          <nav className="hidden md:flex flex-wrap items-center justify-end gap-1">
            {nav.map((item) => (
              <Button
                key={item.key}
                variant="ghost"
                size="sm"
                asChild
                className={
                  active === item.key
                    ? 'border border-[#4056A1] bg-[#D79922] text-white hover:bg-[#c2891c] hover:text-white'
                    : 'text-[#4056A1] hover:bg-[#D79922]/15'
                }
              >
                <Link href={item.href}>{item.label}</Link>
              </Button>
            ))}
            {showSignOut ? (
              <form action="/auth/signout" method="post">
                <Button variant="ghost" size="sm" type="submit" className="gap-1 text-[#4056A1] hover:bg-[#D79922]/15">
                  <LogOut className="h-4 w-4" />
                  {LABELS.SIGN_OUT}
                </Button>
              </form>
            ) : null}
          </nav>
          <div className="flex md:hidden items-center gap-2">
            <Button size="sm" variant="outline" asChild className="border-2 border-[#4056A1] text-[#4056A1]">
              <Link href="/dashboard">{LABELS.MOBILE_MENU}</Link>
            </Button>
            {showSignOut ? (
              <form action="/auth/signout" method="post">
                <Button size="sm" variant="ghost" type="submit" className="text-[#4056A1] hover:bg-[#D79922]/15">
                  <LogOut className="h-4 w-4" />
                </Button>
              </form>
            ) : null}
          </div>
        </div>
      </header>
      {children}
    </div>
  )
}
