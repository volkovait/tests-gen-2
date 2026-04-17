import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** Next.js `public/` at repo root — files are served at site root, e.g. /icon.svg */
const staticRoot = path.join(__dirname, '..', 'public')

const app = express()
const PORT = Number(process.env.PORT) || 3001

app.disable('x-powered-by')

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
