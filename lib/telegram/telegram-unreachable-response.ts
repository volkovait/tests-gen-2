import { telegramProxyEnvIsSet } from '@/lib/telegram/telegram-fetch'
import { NextResponse } from 'next/server'

export function nextJsonTelegramUnreachable(logDetail: string, logPrefix: string) {
  console.error(`${logPrefix} unreachable`, logDetail)
  const base =
    'Не удалось связаться с api.telegram.org (Bot API по HTTPS). Если с сервера нет прямого доступа — задайте реальный URL в TELEGRAM_HTTPS_PROXY или HTTPS_PROXY и перезапустите приложение.'
  const proxyDnsFail =
    telegramProxyEnvIsSet() && /\bENOTFOUND\b|\bEAI_AGAIN\b/i.test(logDetail)
      ? ' Сейчас в env указан прокси, но имя хоста прокси не находится в DNS (часто оставляют пример вроде proxy.example.com) — замените на рабочий хост:порт или удалите TELEGRAM_HTTPS_PROXY/HTTPS_PROXY, если прокси не используете.'
      : ''
  return NextResponse.json(
    {
      ok: false,
      error: 'telegram_unreachable',
      description: base + proxyDnsFail,
    },
    { status: 503 },
  )
}
