'use client'

import { useState } from 'react'

import { Button } from '@/components/ui/button'

export function TelegramSitePingButton() {
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
      setMessage(desc || `Ошибка ${res.status}`)
    } catch (e) {
      setStatus('err')
      setMessage(e instanceof Error ? e.message : 'Сеть')
    }
  }

  return (
    <div className="mt-6 flex flex-col items-center gap-2 rounded-lg border border-dashed border-[#4056A1]/40 bg-white/60 px-4 py-3 text-sm text-[#333333]">
      <span className="text-center text-xs text-[#333333]/80">
        Тест Bot API с этого origin (как главная). Нужен вход в аккаунт.
      </span>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={status === 'loading'}
        onClick={onClick}
        className="border-[#4056A1] text-[#4056A1]"
      >
        {status === 'loading' ? 'Отправка…' : 'Тест: «Привет» в Telegram'}
      </Button>
      {message ? (
        <p
          className={
            status === 'ok' ? 'text-center text-emerald-800' : 'text-center text-red-700'
          }
          role="status"
        >
          {message}
        </p>
      ) : null}
    </div>
  )
}
