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

  lines.push('### Ответ на вопрос «Есть ли у вас правильные ответы для теста?» (необязательно)')
  const reflection = params.correctAnswersReflection.trim()
  lines.push(reflection.length > 0 ? reflection : '(пользователь не добавил отдельного текста — при отсутствии ключей выбери эталонные ответы сам)')
  lines.push('')
  lines.push(
    'Собери интерактивный тест в соответствии с системными правилами JSON-спецификации. Учти все блоки выше.',
  )

  return lines.join('\n')
}
