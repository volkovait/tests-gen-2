import '@/lib/pdf/install-pdf-node-globals'

import type { TableArray } from 'pdf-parse'

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

function escapeMarkdownTableCell(raw: string): string {
  return raw
    .replace(/\r\n/g, '\n')
    .replace(/\n+/g, ' ')
    .replace(/\|/g, '\\|')
    .trim()
}

function tableArrayToMarkdown(table: TableArray): string {
  if (table.length === 0) {
    return ''
  }
  const columnCount = Math.max(...table.map((row) => row.length))
  const normalized = table.map((row) => {
    const padded = [...row]
    while (padded.length < columnCount) {
      padded.push('')
    }
    return padded.slice(0, columnCount).map(escapeMarkdownTableCell)
  })
  const headerRow = normalized[0] ?? []
  const separatorRow = headerRow.map(() => '---')
  const bodyRows = normalized.slice(1)
  const lines = [
    `| ${headerRow.join(' | ')} |`,
    `| ${separatorRow.join(' | ')} |`,
    ...bodyRows.map((row) => `| ${row.join(' | ')} |`),
  ]
  return lines.join('\n')
}

/**
 * Извлекает содержимое PDF в Markdown: разметка по страницам, ссылки в виде `[текст](url)`,
 * обнаруженные таблицы — как pipe-таблицы. Результат передаётся в LLM как текст материала.
 */
export async function extractPdfAsMarkdown(buffer: ArrayBuffer, maxChars = DEFAULT_MAX_CHARS): Promise<string> {
  await ensurePdfJsWorker()
  const { PDFParse } = await import('pdf-parse')
  const data = new Uint8Array(buffer)
  const parser = new PDFParse({ data })
  const textParams = {
    parseHyperlinks: true,
    pageJoiner: '',
    lineEnforce: true,
  }
  try {
    // Same PDFParse instance must not run getText + getTable in parallel: pdf.js fake worker
    // uses structuredClone on a single LoopbackPort and concurrent messages throw
    // "Unable to deserialize cloned data" in Node.
    const textResult = await parser.getText(textParams)
    const tableResult = await parser.getTable()

    const textByPage = new Map<number, string>()
    for (const page of textResult.pages) {
      textByPage.set(page.num, page.text?.trim() ?? '')
    }
    const tablesByPage = new Map<number, TableArray[]>()
    for (const pageTables of tableResult.pages) {
      tablesByPage.set(pageTables.num, pageTables.tables)
    }

    const pageNumbers = new Set<number>()
    for (const pageNum of textByPage.keys()) {
      pageNumbers.add(pageNum)
    }
    for (const pageTables of tableResult.pages) {
      pageNumbers.add(pageTables.num)
    }
    const sortedPageNumbers = [...pageNumbers].sort((left, right) => left - right)

    const parts: string[] = []
    for (const pageNum of sortedPageNumbers) {
      const pageBody = textByPage.get(pageNum) ?? ''
      const tables = tablesByPage.get(pageNum) ?? []
      const sectionLines: string[] = [`## Страница ${pageNum}`, '']
      if (pageBody.length > 0) {
        sectionLines.push(pageBody)
      }
      if (tables.length > 0) {
        for (let tableIndex = 0; tableIndex < tables.length; tableIndex++) {
          const markdownTable = tableArrayToMarkdown(tables[tableIndex]!)
          if (markdownTable.length === 0) {
            continue
          }
          sectionLines.push('')
          if (tables.length > 1) {
            sectionLines.push(`### Таблица ${tableIndex + 1}`)
            sectionLines.push('')
          }
          sectionLines.push(markdownTable)
        }
      }
      parts.push(sectionLines.join('\n'))
    }

    let document = parts.join('\n\n').trim()
    if (document.length === 0) {
      return ''
    }
    if (document.length <= maxChars) {
      return document
    }
    return `${document.slice(0, maxChars).trimEnd()}\n\n_[… документ сокращён для генерации …]_`
  } finally {
    await parser.destroy()
  }
}
