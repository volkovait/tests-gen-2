import type { LessonSourceType } from '@/lib/lessons/save-lesson'

/**
 * Тип источника для генерации из файлов (мульти-загрузка).
 * Смешанный PDF+картинка считаем `pdf`, если есть хотя бы один PDF.
 */
export function lessonSourceTypeFromUploadFiles(files: readonly File[]): LessonSourceType {
  const nonEmpty = files.filter((file) => file.size > 0)
  if (nonEmpty.length === 0) {
    return 'chat'
  }
  const allPdf = nonEmpty.every((file) => file.type === 'application/pdf')
  if (allPdf) {
    return 'pdf'
  }
  const allImage = nonEmpty.every((file) => file.type.startsWith('image/'))
  if (allImage) {
    return 'image'
  }
  if (nonEmpty.some((file) => file.type === 'application/pdf')) {
    return 'pdf'
  }
  return 'image'
}
