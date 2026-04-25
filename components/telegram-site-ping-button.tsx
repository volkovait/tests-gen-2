'use client'

import { useState } from 'react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

type TelegramSitePingButtonProps = {
  /** На дашборде (редирект с `/` для залогиненных) — компактный вид под shadcn Card. */
  variant?: 'landing' | 'dashboard'
}

export function TelegramSitePingButton({ variant = 'landing' }: TelegramSitePingButtonProps) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'err'>('idle')
  const [message, setMessage] = useState('')

  async function onClick() {
    setStatus('loading')
    setMessage('')
    try {
      const res = await fetch('/api/telegram-test-ping', {
        method: 'POST',
        credentials: 'include',
      })
      const data: unknown = await res.json().catch(() => null)
      const desc =
        data !== null &&
        typeof data === 'object' &&
        'description' in data &&
        typeof (data as { description: unknown }).description === 'string'
          ? (data as { description: string }).description
          : data !== null &&
              typeof data === 'object' &&
              'error' in data &&
              typeof (data as { error: unknown }).error === 'string'
            ? (data as { error: string }).error
            : res.statusText

      if (res.ok && data !== null && typeof data === 'object' && (data as { ok?: boolean }).ok === true) {
        setStatus('ok')
        setMessage('Отправлено: «Привет» в Telegram.')
        return
      }

      setStatus('err')
      setMessage(
        res.status === 401
          ? desc ||
              'Войдите в аккаунт. Локально: `pnpm dev` без входа, или TELEGRAM_TEST_PING_SKIP_AUTH=true при `next start`.'
          : desc || `Ошибка ${res.status}`,
      )
    } catch (e) {
      setStatus('err')
      setMessage(e instanceof Error ? e.message : 'Сеть')
    }
  }

  const isDashboard = variant === 'dashboard'

  return (
    <div
      className={cn(
        'flex flex-col gap-2 text-sm',
        isDashboard
          ? 'items-stretch'
          : 'mt-6 items-center rounded-lg border border-dashed border-[#4056A1]/40 bg-white/60 px-4 py-3 text-[#333333]',
      )}
    >
      {isDashboard ? (
        <p className="text-xs text-muted-foreground">
          Тот же серверный вызов Bot API, что при отправке результата из урока. Успех — «Привет» в чате; сбой сети —
          та же 503, что в уроке.
        </p>
      ) : (
        <span className="text-center text-xs text-[#333333]/80">
          Тест Bot API с этого origin. В проде — после входа; в `pnpm dev` — без входа.
        </span>
      )}
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={status === 'loading'}
        onClick={onClick}
        className={cn(isDashboard ? 'w-fit' : 'border-[#4056A1] text-[#4056A1]')}
      >
        {status === 'loading' ? 'Отправка…' : 'Тест: «Привет» в Telegram'}
      </Button>
      {message ? (
        <p
          className={cn(
            'text-sm',
            isDashboard ? 'text-left' : 'text-center',
            status === 'ok' ? 'text-emerald-700 dark:text-emerald-500' : 'text-destructive',
          )}
          role="status"
        >
          {message}
        </p>
      ) : null}
    </div>
  )
}
