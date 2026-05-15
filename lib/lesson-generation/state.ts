import { Annotation } from '@langchain/langgraph'

/** Состояние сессии генерации (сериализуется в checkpointer). */
export const LessonGenerationStateAnnotation = Annotation.Root({
  userId: Annotation<string>(),
  runId: Annotation<string>(),
  threadId: Annotation<string>(),
  /** Выставляется узлом classify_pipeline (raw = сначала план урока). */
  mode: Annotation<'ready_material' | 'raw_material'>(),
  title: Annotation<string>(),
  /** Текст из файлов и полей ввода без чата (сервер склеивает файлы в одну строку). */
  userMaterialText: Annotation<string>(),
  /** Сводка сообщений пользователя в чате (только текст). */
  chatUserText: Annotation<string>(),
  correctAnswersHint: Annotation<string>(),
  materialRelevant: Annotation<boolean>(),
  relevanceUserMessage: Annotation<string>(),
  planDraft: Annotation<string>(),
  /** После одобрения плана — итоговый текст для merge в combinedMaterial */
  planApprovedBody: Annotation<string>(),
  logicalParts: Annotation<string[]>({
    default: () => [],
    reducer: (left, right) => (right === undefined ? left : right),
  }),
  /** JSON {@link import('@/lib/lesson-generation/exercise-format-plan').LessonTaskTypeIntent} после узла exercise_format_plan */
  taskTypeIntentJson: Annotation<string>(),
  /** JSON {@link import('@/lib/lesson-generation/exercise-format-plan').PartExercisePlan} */
  partExercisePlanJson: Annotation<string>(),
  combinedMaterial: Annotation<string>(),
  /** JSON.stringify(LessonSpec) после сборки */
  lessonSpecJson: Annotation<string | null>(),
  validationWarnings: Annotation<string[]>({
    default: () => [],
    reducer: (left, right) => (right === undefined ? left : right),
  }),
  htmlBody: Annotation<string | null>(),
  lessonId: Annotation<string | null>(),
  phase: Annotation<string>(),
  errorCode: Annotation<string>(),
  errorMessage: Annotation<string>(),
  autoSolveRequested: Annotation<boolean>(),
  /** Дисклеймер после авто-решателя */
  autoSolveDisclaimer: Annotation<string>(),
  /** Счётчик ретраев build_spec */
  buildSpecAttempts: Annotation<number>({
    default: () => 0,
    reducer: (previous, next) => (typeof next === 'number' ? next : previous),
  }),
  /** Папка логов модели (dev / при LESSON_MODEL_FILE_LOG). */
  logDir: Annotation<string>(),
  /** Источник урока для метаданных и UI (чат vs файлы). */
  lessonSourceType: Annotation<'pdf' | 'image' | 'chat'>({
    default: () => 'chat',
    reducer: (left, right) => (right === undefined ? left : right),
  }),
})

export type LessonGenerationState = typeof LessonGenerationStateAnnotation.State
