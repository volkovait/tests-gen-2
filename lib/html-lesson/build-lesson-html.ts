import fs from 'node:fs'
import path from 'node:path'
import type { LessonSpec } from '@/lib/lesson-spec/schema'

export const DEFAULT_LESSON_FONTS_HREF =
  'https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,600;0,9..40,700;1,9..40,400&family=Source+Serif+4:opsz,wght@8..60,500;8..60,600&display=swap'

function escapeHtmlAttr(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function escapeHtmlText(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function loadReferenceCss(): string {
  const p = path.join(process.cwd(), 'reference', 'style.css')
  return fs.readFileSync(p, 'utf8')
}

/** Встраивает JSON в HTML без преждевременного закрытия тега script */
function embedLessonSpecJson(spec: LessonSpec): string {
  return JSON.stringify(spec).replace(/</g, '\\u003c')
}

/**
 * Собирает HTML-документ теста: инлайн CSS из reference/style.css, JSON-спека, внешний /lesson-runtime.js
 */
export function buildLessonHtmlFromSpec(spec: LessonSpec): string {
  const fontsHref = spec.googleFontsHref ?? DEFAULT_LESSON_FONTS_HREF
  const css = loadReferenceCss()
  const specJson = embedLessonSpecJson(spec)
  const title = escapeHtmlAttr(spec.title)
  const subtitleBlock = spec.subtitle
    ? `<p>${escapeHtmlText(spec.subtitle)}</p>`
    : '<p>Интерактивный тест с автоматической проверкой ответов</p>'

  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <link rel="icon" href="/favicon.ico" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link rel="stylesheet" href="${escapeHtmlAttr(fontsHref)}" />
  <style>
${css}
  </style>
</head>
<body>
  <div class="page">
    <header class="intro">
      <h1>${escapeHtmlText(spec.title)}</h1>
      ${subtitleBlock}
      <label class="student-label" for="student-name">ФИО студента</label>
      <input class="student-name" type="text" id="student-name" name="student_name" autocomplete="name" placeholder="Например, Иванова Мария Сергеевна" />
    </header>
    <div id="test-root" class="test-root" role="main"></div>
    <div class="actions">
      <button type="button" id="finish-btn">Завершить тест и показать результаты</button>
    </div>
    <section class="result-panel" id="result-panel" aria-live="polite">
      <h3>Итог</h3>
      <p class="score" id="score-line"></p>
    </section>
  </div>
  <script id="lesson-spec" type="application/json">${specJson}</script>
  <script src="/lesson-runtime.js"></script>
</body>
</html>`
}
