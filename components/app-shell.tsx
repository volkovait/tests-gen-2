'use client'

import Link from 'next/link'
import Image from 'next/image'
import type { ReactNode } from 'react'
import logoImg from '@/assets/logo.png'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { LogOut, Menu } from 'lucide-react'
import { LABELS } from '@/lib/consts'
import { cn } from '@/lib/utils'

export type NavKey = 'dashboard' | 'create' | 'upload' | 'history'

const nav: { href: string; label: string; key: NavKey }[] = [
  { href: '/dashboard', label: LABELS.NAV_DASHBOARD, key: 'dashboard' },
  { href: '/create', label: LABELS.CHAT_WITH_AI, key: 'create' },
  { href: '/upload', label: LABELS.NAV_FROM_PDF, key: 'upload' },
  { href: '/history', label: LABELS.NAV_HISTORY_TESTS, key: 'history' },
]

const SIGNOUT_FORM_ID = 'app-shell-signout'

function navButtonClass(isActive: boolean): string {
  return isActive
    ? 'border border-[#4056A1] bg-[#D79922] text-white hover:bg-[#c2891c] hover:text-white'
    : 'text-[#4056A1] hover:bg-[#D79922]/15'
}

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
        <div className="container mx-auto flex h-16 items-center justify-between gap-3 px-4">
          {showSignOut ? <form id={SIGNOUT_FORM_ID} action="/auth/signout" method="post" hidden /> : null}

          <Link href="/dashboard" className="flex min-w-0 items-center gap-2 shrink-0">
            <Image src={logoImg} alt={LABELS.BRAND_LOGO_ALT} width={80} height={80} className="shrink-0 rounded-lg" />
            <span className="font-serif text-lg font-bold tracking-tight text-[#4056A1] truncate">
              {LABELS.BRAND_NAME}
            </span>
          </Link>

          <div className="flex shrink-0 items-center gap-2">
            <nav className="hidden lg:flex flex-wrap items-center justify-end gap-1">
              {nav.map((item) => (
                <Button
                  key={item.key}
                  variant="ghost"
                  size="sm"
                  asChild
                  className={navButtonClass(active === item.key)}
                >
                  <Link href={item.href}>{item.label}</Link>
                </Button>
              ))}
              {showSignOut ? (
                <Button
                  variant="ghost"
                  size="sm"
                  type="submit"
                  form={SIGNOUT_FORM_ID}
                  className="gap-1 text-[#4056A1] hover:bg-[#D79922]/15"
                >
                  <LogOut className="h-4 w-4" />
                  {LABELS.SIGN_OUT}
                </Button>
              ) : null}
            </nav>

            <div className="flex lg:hidden items-center">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="border-2 border-[#4056A1] text-[#4056A1] hover:bg-[#D79922]/15"
                    aria-label={LABELS.NAV_MENU}
                    aria-haspopup="menu"
                  >
                    <Menu className="h-4 w-4 shrink-0" />
                    <span className="ml-1 max-[380px]:hidden">{LABELS.NAV_MENU}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-[12rem] border-2 border-[#C5CBE3] bg-[#EFE2BA]">
                  {nav.map((item) => (
                    <DropdownMenuItem key={item.key} asChild className="cursor-pointer p-0 focus:bg-[#D79922]/25">
                      <Link
                        href={item.href}
                        className={cn(
                          'block w-full px-2 py-2 text-sm no-underline outline-none',
                          active === item.key
                            ? 'bg-[#D79922] font-medium text-white'
                            : 'text-[#4056A1]',
                        )}
                      >
                        {item.label}
                      </Link>
                    </DropdownMenuItem>
                  ))}
                  {showSignOut ? (
                    <>
                      <DropdownMenuSeparator className="bg-[#C5CBE3]" />
                      <DropdownMenuItem asChild className="cursor-pointer p-0 focus:bg-[#D79922]/25">
                        <button
                          type="submit"
                          form={SIGNOUT_FORM_ID}
                          className="flex w-full items-center gap-2 rounded-sm px-2 py-2 text-left text-sm text-[#4056A1] outline-none hover:bg-[#D79922]/15 focus-visible:ring-2 focus-visible:ring-[#4056A1]"
                        >
                          <LogOut className="h-4 w-4 shrink-0" />
                          {LABELS.SIGN_OUT}
                        </button>
                      </DropdownMenuItem>
                    </>
                  ) : null}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>
      {children}
    </div>
  )
}
