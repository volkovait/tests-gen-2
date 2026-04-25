import Link from 'next/link'
import Image from 'next/image'
import { TelegramSitePingButton } from '@/components/telegram-site-ping-button'
import { HOME_FEATURES, LABELS } from '@/lib/consts'
import { Button } from '@/components/ui/button'
import logoImg from '@/assets/logo.png'
import { BookOpen, MessageCircle, Sparkles, Upload } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { HomeFeatureKey } from '@/lib/consts'

const HOME_FEATURE_ICONS: Record<HomeFeatureKey, LucideIcon> = {
  chat: MessageCircle,
  upload: Upload,
  page: BookOpen,
  feedback: Sparkles,
}

/** Публичный лендинг: кэш на CDN/браузер, ревалидация без персональных данных в HTML. */
export const revalidate = 300

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#EFE2BA] text-[#333333]">
      <div
        className="lb-blob-gold pointer-events-none absolute -right-24 top-20 h-72 w-72 rounded-full blur-xl md:h-96 md:w-96 md:blur-2xl"
        aria-hidden
      />
      <div
        className="lb-blob-terracotta pointer-events-none absolute -left-16 bottom-32 h-64 w-64 rounded-full blur-xl md:h-80 md:w-80 md:blur-2xl"
        aria-hidden
      />

      <header className="relative border-b border-[#C5CBE3] bg-[#EFE2BA]/95 max-md:backdrop-blur-none md:bg-[#EFE2BA]/90 md:backdrop-blur-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src={logoImg}
              alt={LABELS.BRAND_LOGO_ALT}
              width={80}
              height={80}
              sizes="80px"
              className="rounded-lg"
            />
            <span className="font-serif text-lg font-bold text-[#4056A1]">{LABELS.BRAND_NAME}</span>
          </Link>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild className="text-[#4056A1] hover:bg-[#D79922]/15 hover:text-[#4056A1]">
              <Link href="/auth/login">{LABELS.HOME_NAV_LOGIN}</Link>
            </Button>
            <Button
              size="sm"
              asChild
              className="border border-[#4056A1] bg-[#4056A1] text-white hover:bg-[#35488a]"
            >
              <Link href="/auth/sign-up">{LABELS.HOME_NAV_SIGN_UP}</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="relative">
        <section className="container mx-auto px-4 py-16 md:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="font-serif text-4xl font-bold leading-tight text-[#4056A1] md:text-5xl lg:text-6xl">
              {LABELS.HOME_HERO_LINE_BEFORE}{' '}
              <span className="text-[#F13C20]">{LABELS.HOME_HERO_HIGHLIGHT}</span>
              <br />
              <span className="text-[#333333]">{LABELS.HOME_HERO_LINE_AFTER}</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-[#333333]/85">{LABELS.HOME_HERO_LEAD}</p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Button
                asChild
                size="lg"
                className="btn-cta-gold rounded-lg border-0 px-8 font-semibold shadow-md hover:opacity-95"
              >
                <Link href="/auth/sign-up">{LABELS.HOME_CTA_START}</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="rounded-lg border-2 border-[#4056A1] bg-white text-[#4056A1] hover:bg-[#EFE2BA]"
              >
                <Link href="/auth/login">{LABELS.HOME_CTA_HAS_ACCOUNT}</Link>
              </Button>
            </div>
            <TelegramSitePingButton />
          </div>
        </section>

        <section className="relative border-t border-[#C5CBE3] bg-white py-16">
          <div className="pointer-events-none absolute right-8 top-8 h-24 w-24 rounded-full border-2 border-[#D79922]/40" aria-hidden />
          <div className="container mx-auto px-4">
            <h2 className="text-center font-serif text-2xl font-bold text-[#4056A1] md:text-3xl">{LABELS.HOME_FEATURES_TITLE}</h2>
            <div className="mx-auto mt-12 grid max-w-5xl gap-6 md:grid-cols-2">
              {HOME_FEATURES.map((item) => {
                const Icon = HOME_FEATURE_ICONS[item.key]
                return (
                  <div
                    key={item.key}
                    className="rounded-xl border-2 border-[#4056A1] bg-white p-6 shadow-sm transition-shadow hover:shadow-xl"
                  >
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-[#D79922]/25 text-[#4056A1]">
                      <Icon className="h-6 w-6" />
                    </div>
                    <h3 className="font-serif text-lg font-semibold text-[#4056A1]">{item.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-[#333333]/90">{item.text}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </section>
      </main>

      <footer className="relative border-t border-[#C5CBE3] bg-[#EFE2BA] py-8 text-center text-sm text-[#333333]/75">
        {LABELS.HOME_FOOTER}
      </footer>
    </div>
  )
}
