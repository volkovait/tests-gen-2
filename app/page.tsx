import Link from 'next/link'
import Image from 'next/image'
import { LABELS } from '@/lib/consts'
import { Button } from '@/components/ui/button'
import logoImg from '@/assets/logo.png'

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
          </div>
        </section>
      </main>

      <footer className="relative border-t border-[#C5CBE3] bg-[#EFE2BA] py-8 text-center text-sm text-[#333333]/75">
        {LABELS.HOME_FOOTER}
      </footer>
    </div>
  )
}
