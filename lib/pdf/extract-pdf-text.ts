import { PDFParse } from 'pdf-parse'

const DEFAULT_MAX_CHARS = 48_000

/**
 * Extracts plain text from a PDF buffer. Truncates to `maxChars` to control token usage.
 */
export async function extractPdfText(buffer: ArrayBuffer, maxChars = DEFAULT_MAX_CHARS): Promise<string> {
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
