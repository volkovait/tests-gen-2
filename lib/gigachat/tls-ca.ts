import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { rootCertificates } from 'node:tls'

import { getGigaChatCaCertPath } from './config'

/**
 * PEM bundle: Mozilla roots (Node) + корень НУЦ Минцифры для GigaChat.
 * @see https://developers.sber.ru/docs/ru/gigachat/certificates?lang=js
 */
let cached: readonly string[] | false | undefined

export function getGigaChatTlsCaBundle(): readonly string[] | undefined {
  if (cached === false) return undefined
  if (cached !== undefined) return cached

  const raw = getGigaChatCaCertPath()
  if (!raw) {
    cached = false
    return undefined
  }

  const abs = resolve(raw)
  if (!existsSync(abs)) {
    throw new Error(`GIGACHAT_CA_CERT: файл не найден: ${abs}`)
  }

  const extra = readFileSync(abs, 'utf8').trim()
  if (!extra) {
    throw new Error(`GIGACHAT_CA_CERT: пустой файл: ${abs}`)
  }

  cached = [...rootCertificates, extra]
  return cached
}
