import { gigachatChatCompletion } from '@/lib/gigachat'
import { extractHtmlDocument } from '@/lib/html-lesson/extract-html-document'
import { HTML_LESSON_SYSTEM, buildUserPromptFromMaterial } from '@/lib/html-lesson/prompt'

export async function generateInteractiveHtmlLesson(params: {
  title: string
  materialSummary: string
  /** Логи вызова модели: `generate-html.txt` в этой папке. */
  logDir?: string
}): Promise<string> {
  const raw = await gigachatChatCompletion(
    [
      { role: 'system', content: HTML_LESSON_SYSTEM },
      {
        role: 'user',
        content: buildUserPromptFromMaterial({
          title: params.title,
          materialSummary: params.materialSummary,
        }),
      },
    ],
    {
      maxTokens: 8192,
      temperature: 0.55,
      ...(params.logDir ? { log: { outputDir: params.logDir, fileBase: 'generate-html' } } : {}),
    },
  )
  return extractHtmlDocument(raw)
}
