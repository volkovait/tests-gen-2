import '@/lib/pdf/install-pdf-node-globals'

const DEFAULT_MAX_CHARS = 48_000

let pdfEngineReady: Promise<void> | undefined

/**
 * pdf.js resolves the worker via `GlobalWorkerOptions.workerSrc`. Defaults break under Next
 * standalone; set an absolute `file:` URL before loading `pdf-parse` (which pulls in pdf.js).
 */
async function ensurePdfJsWorker(): Promise<void> {
  pdfEngineReady ??= (async () => {
    const [{ createRequire }, { pathToFileURL }, pdfjs] = await Promise.all([
      import('node:module'),
      import('node:url'),
      import('pdfjs-dist/legacy/build/pdf.mjs'),
    ])
    const require = createRequire(import.meta.url)
    const workerPath = require.resolve('pdfjs-dist/legacy/build/pdf.worker.mjs')
    pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(workerPath).href
  })()
  await pdfEngineReady
}

/**
 * Extracts plain text from a PDF buffer. Truncates to `maxChars` to control token usage.
 */
export async function extractPdfText(buffer: ArrayBuffer, maxChars = DEFAULT_MAX_CHARS): Promise<string> {
  await ensurePdfJsWorker()
  const { PDFParse } = await import('pdf-parse')
  const data = new Uint8Array(buffer)
  const parser = new PDFParse({ data })
  try {
    const result = await parser.getText()
    const full = result.text?.trim() ?? ''
    if (full.length <= maxChars) {
      return full
    }
    return `${full.slice(0, maxChars)}\n\n[… текст сокращён для генерации …]`
  } finally {
    await parser.destroy()
  }
}
