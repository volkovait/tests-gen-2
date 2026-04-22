import * as https from 'node:https'
import { URL } from 'node:url'

export type GigachatOAuthHttpsResult = { statusCode: number; rawBody: string }

/**
 * OAuth token POST via `node:https` (no redirect follow, no fetch/undici).
 * Avoids cases where a redirect strips `Authorization` or alters outbound headers.
 */
export function gigachatOAuthPostHttps(
  urlStr: string,
  bodyUtf8: string,
  headers: Record<string, string>,
  tlsRejectUnauthorized: boolean,
): Promise<GigachatOAuthHttpsResult> {
  const url = new URL(urlStr)
  if (url.protocol !== 'https:') {
    throw new Error('GigaChat OAuth URL must use https')
  }

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: url.hostname,
        port: url.port || 443,
        path: `${url.pathname}${url.search}`,
        method: 'POST',
        headers: {
          ...headers,
          'Content-Length': String(Buffer.byteLength(bodyUtf8, 'utf8')),
        },
        rejectUnauthorized: tlsRejectUnauthorized,
      },
      (res) => {
        const chunks: Buffer[] = []
        res.on('data', (chunk: string | Buffer) => {
          chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
        })
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode ?? 0,
            rawBody: Buffer.concat(chunks).toString('utf8'),
          })
        })
      },
    )
    req.on('error', reject)
    req.write(bodyUtf8, 'utf8')
    req.end()
  })
}
