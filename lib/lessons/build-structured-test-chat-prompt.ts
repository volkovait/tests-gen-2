export const STUDENT_LEVELS = ['Начальный', 'Средний', 'Продвинутый'] as const
export type StudentLevel = (typeof STUDENT_LEVELS)[number]

export const TASK_TYPE_OPTIONS = [
  'одиночный выбор',
  'множественный выбор',
  'текстовый ответ',
  'соответствие',
] as const
export type TaskTypeOption = (typeof TASK_TYPE_OPTIONS)[number]

export function buildStructuredTestGenerationPrompt(params: {
  userMessages: readonly { content: string }[]
  subject: string
  taskCount: string
  taskTypes: readonly string[]
  studentLevel: string
  correctAnswersReflection: string
}): string {
  const lines: string[] = []
  lines.push('## Задание для генерации языкового теста')
  lines.push('')
  lines.push('### Идея и сообщения пользователя')
  params.userMessages.forEach((m, i) => {
    lines.push(`${i + 1}. ${m.content.trim()}`)
  })
  lines.push('')

  const hasForm =
    params.subject.trim().length > 0 ||
    params.taskCount.trim().length > 0 ||
    params.taskTypes.length > 0 ||
    params.studentLevel.trim().length > 0

  if (hasForm) {
    lines.push('### Дополнительные пожелания (форма, заполнена по желанию)')
    if (params.subject.trim()) {
      lines.push(`- Предмет / тема: ${params.subject.trim()}`)
    }
    if (params.taskCount.trim()) {
      lines.push(`- Желаемое количество заданий: ${params.taskCount.trim()}`)
    }
    if (params.taskTypes.length > 0) {
      lines.push(`- Предпочитаемые типы заданий: ${params.taskTypes.join(', ')}`)
    }
    if (params.studentLevel.trim()) {
      lines.push(`- Уровень студентов: ${params.studentLevel.trim()}`)
    }
    lines.push('')
  }

  lines.push('### Правильные ответы из чата (необязательно; блок под сообщениями пользователя)')
  const reflection = params.correctAnswersReflection.trim()
  lines.push(reflection.length > 0 ? reflection : '(пользователь не добавил отдельного текста — при отсутствии ключей выбери эталонные ответы сам)')
  lines.push('')
  lines.push(
    'Собери интерактивный тест в соответствии с системными правилами JSON-спецификации. Учти все блоки выше.',
  )
  lines.push(
    'Язык в JSON: инструкции и пояснения для студента — на русском; формулировки заданий, тексты для чтения и варианты — на языке исходного материала (как в сообщениях пользователя), без перевода на русский, если пользователь явно не просил иное.',
  )
  lines.push(
    'Язык стимулов (prompt, readingPassage.paragraphs, options): бери с основного **учебного** фрагмента в сообщениях (английский/другой L2); короткая просьба на русском не означает, что сами вопросы можно писать по-русски.',
  )
  lines.push(
    'Если пользователь вставил фрагмент учебника или PDF: сохрани все задания и тексты в неизменной формулировке, только разложи по структуре JSON; не подменяй содержание новыми упражнениями.',
  )

  return lines.join('\n')
}
