import { LESSON_SPEC_VERSION } from '@/lib/lesson-spec/schema'

/** Системный промпт: только JSON-спецификация теста, без HTML/JS. */
export const LESSON_SPEC_SYSTEM = `Ты составляешь структуру интерактивного языкового теста для веб-приложения.

Верни ОДИН JSON-объект без markdown-ограждения и без текста до или после JSON.

Схема (поле version строго ${LESSON_SPEC_VERSION}):
{
  "version": ${LESSON_SPEC_VERSION},
  "title": "краткое название теста",
  "subtitle": "опционально, подзаголовок",
  "googleFontsHref": "опционально, только ссылка вида https://fonts.googleapis.com/css2?family=...&display=swap",
  "parts": [
    {
      "title": "название части",
      "exercises": [
        {
          "title": "название упражнения",
          "instruction": "опционально, инструкция на русском",
          "audio": false,
          "inputKind": "radio" | "select" | "wordOrder",
          "readingPassage": {
            "title": "опционально",
            "instruction": "опционально",
            "paragraphs": ["абзац текста для чтения", "..."]
          },
          "questions": [...]
        }
      ]
    }
  ]
}

Правила контента:
- Проанализируй материал пользователя (PDF/чат). Извлеки или придумай упражнения с явными правильными ответами.
- Если в пользовательском сообщении есть блок «Правильные ответы от пользователя», сопоставь его с заданиями и используй как эталон для correctKey / correctSentence там, где это удаётся.
- Если такого блока нет или он пуст, а в исходном материале нет явных правильных ответов, самостоятельно выбери корректные ответы по смыслу материала и своим языковым знаниям.
- Общие инструкции — на русском; формулировки заданий на языке учебника не переводи без необходимости.
- Не включай в JSON ключи ответов для студента отдельным списком; только поля correctKey / correctSentence внутри вопросов.
- audio: true только если нужна заглушка «есть аудирование»; реального файла нет — это только флаг UI.
- readingPassage: опционально, перед этим упражнением покажется текст; все строки в paragraphs — обычный текст (без HTML).

Критично — только обычный текст, без HTML и без дублирования буквы варианта в text:
- В полях title, subtitle, prompt, instruction, option.text, paragraphs НЕ используй HTML-теги (<u>, <b>, <span>, …). Подчёркивание вариантов в предложении делай косой чертой или скобками: "has / have", "are / is", а не <u>…</u>.
- Для radio/select у каждого варианта key — ОДНА заглавная латинская буква по порядку: "A", "B", "C", "D". Поле text — только формулировка варианта БЕЗ префикса "A)" / "a)" / дублирования буквы (не пиши text: "A) goes", пиши text: "goes"; не пиши key "are" с text "are" — используй key "A" и text "are").

Типы вопросов (на уровне упражнения inputKind одинаков для всех вопросов в exercises):
1) "radio" или "select": у каждого вопроса поля id, prompt, options: [ { "key": "A", "text": "..." }, ... минимум 2 ], correctKey — один из key.
2) "wordOrder": у каждого вопроса id, prompt, wordBank: ["слово1", ... минимум 2 ], correctSentence — эталонное предложение (те же слова, что в банке, допустим другой порядок в банке).

Ограничения:
- Уникальные id вопросов во всём документе (латиница, цифры, подчёркивание).
- Не более 200 вопросов суммарно.
- Строки с апострофами внутри слова (it's, isn't) — допустимы в JSON в двойных кавычках.

Верни только JSON.`

export function buildUserPromptForLessonSpec(params: {
  title: string
  materialSummary: string
  /** Необязательный текст с правильными ответами в свободной форме. */
  correctAnswersHint?: string
}): string {
  const hint = params.correctAnswersHint?.trim()
  const hintSection =
    hint && hint.length > 0
      ? `

Правильные ответы от пользователя (свободная форма; используй как эталон, сопоставляя с вопросами там, где это возможно):
---
${hint}
---
`
      : ''

  return `Название / тема теста: ${params.title}

Ниже материал (из PDF или переписки). Построй JSON-спецификацию теста по правилам системного сообщения.

---
${params.materialSummary}
---${hintSection}

Верни один JSON-объект version ${LESSON_SPEC_VERSION} с заполненными parts, exercises и questions.`
}

export const LESSON_SPEC_REPAIR_SYSTEM = `Ты получишь невалидный или почти готовый JSON спецификации теста и список ошибок валидации (Zod).
Исправь ТОЛЬКО структуру данных: version, title, parts, exercises, questions, поля options/correctKey/wordBank/correctSentence, readingPassage.
Убери HTML из всех строк; в options задай key как "A","B","C", а text — только текст варианта без префикса "A)".
Не добавляй поле runtime — его добавит сервер.
Верни один исправленный JSON без markdown и без пояснений.`

export function buildRepairUserPrompt(params: { invalidJson: string; zodMessage: string }): string {
  return `Ошибки валидации:
${params.zodMessage}

Исходный текст (исправь):
${params.invalidJson.slice(0, 120_000)}`
}
