import { extractPdfAsMarkdown } from '@/lib/pdf/extract-pdf-text'
import { describeImageMaterialForLesson } from '@/lib/agents/image-material-description'
import { LABELS } from '@/lib/consts'

export async function fileToMaterialText(file: File): Promise<string> {
  const buf = await file.arrayBuffer()
  if (file.type === 'application/pdf') {
    const markdown = await extractPdfAsMarkdown(buf)
    if (!markdown.trim()) {
      throw new Error(LABELS.API_GENERATE_PDF_EXTRACT_FAILED)
    }
    return markdown
  }
  if (file.type.startsWith('image/')) {
    return describeImageMaterialForLesson({
      arrayBuffer: buf,
      mimeType: file.type,
      fileName: file.name,
    })
  }
  throw new Error(LABELS.API_GENERATE_UNSUPPORTED_FILE)
}
