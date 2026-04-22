import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** Next.js `public/` at repo root — files are served at site root, e.g. /placeholder.svg */
const staticRoot = path.join(__dirname, '..', 'public')

const app = express()
const PORT = Number(process.env.PORT) || 3001

/** Browser `Origin` has no path; trailing slash in URL is not sent */
const CORS_ORIGIN = 'https://lingua-bloom.ru'

app.disable('x-powered-by')

app.use((req, res, next) => {
  if (req.headers.origin !== CORS_ORIGIN) {
    next()
    return
  }
  res.setHeader('Access-Control-Allow-Origin', CORS_ORIGIN)
  res.setHeader('Vary', 'Origin')
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS')
    const requestHeaders = req.headers['access-control-request-headers']
    if (requestHeaders) {
      res.setHeader('Access-Control-Allow-Headers', requestHeaders)
    }
    res.sendStatus(204)
    return
  }
  next()
})

app.get('/health', (_req, res) => {
  res.json({ ok: true, staticRoot })
})

app.use(
  express.static(staticRoot, {
    extensions: ['html'],
    index: ['index.html'],
    fallthrough: true,
  }),
)

app.use((_req, res) => {
  res.status(404).type('text/plain').send('Not found')
})

app.listen(PORT, () => {
  console.log(`Static server: http://localhost:${PORT}`)
  console.log(`Serving: ${staticRoot}`)
})
