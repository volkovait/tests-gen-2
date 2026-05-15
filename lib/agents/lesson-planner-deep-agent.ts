/**
 * Планировщик: LangChain `createAgent` (один клиентский tool), без Deep Agents-пакета.
 *
 * Раньше использовался `createDeepAgent` из `deepagents`; он добавляет встроенный `write_todos`
 * с очень большой схемой — запрос к GigaChat раздувается (~30k+ байт JSON) и API отвечает 500,
 * после чего граф многократно ретраится и кажется «зависшим».
 *
 * Идеология шагов та же; см. также `ref/index.js`.
 */
import { HumanMessage } from '@langchain/core/messages'
import { tool } from '@langchain/core/tools'
import { createAgent } from 'langchain'
import { z } from 'zod'

import { getLlmModelPlanner } from '@/lib/llm/model-config'

import { createLessonLlmModel } from './create-lesson-llm-model'

const LESSON_PLANNER_SYSTEM = `Ты планировщик-супервизор интерактивного ЯЗЫКОВОГО теста для веб-приложения Lingua-Bloom.

У тебя уже есть полный текст материала в сообщении пользователя (чат, PDF, описание картинки). Не проси загрузить файл снова.

Мысленно пройди 2–4 шага: проанализировать материал → определить язык материала (L2) и уровень → набросать структуру частей теста и типы заданий → финализировать бриф.

В брифе для следующего узла (генератор JSON) обязательно укажи:
- Если источник — PDF/учебник: генератор должен перенести все **учебные** блоки (тексты, задания, варианты) дословно и по порядку, без пересказа и без замены упражнений «улучшенными» версиями; только раскладка по полям схемы. Явно перечисли **неучебный шум** (обложка, оглавление, колонтитулы, реклама, ISBN…), который не должен попадать в тест.
- Если в материале **нет готовых пунктов теста**, а есть только текст для чтения и/или мета-просьба (например «создай true/false по тексту», «сделай N вопросов»): в брифе зафиксируй **целевое число вопросов** (из просьбы пользователя или не менее 8 по умолчанию), формат (в т.ч. true/false = radio с двумя вариантами True/False на L2), и что **полный** отрывок чтения один раз в readingPassage без сокращения.
- **L2 по содержанию, не по просьбе:** язык урока (L2) определяй по основному учебному отрывку (английский текст, немецкий диалог и т.д.), а **не** по языку короткой мета-фразы пользователя на русском. В брифе явно укажи строку вида: «L2 = …; мета-инструкция на русском не меняет язык prompt/вариантов».
- Язык материала (L2) и уровень (примерно: начальный / средний / продвинутый), обоснованно по тексту.
- Какие типы заданий извлечь из источника или добавить: radio, select, checkbox, wordOrder, gapDrag, matchPairs — только те, что реально следуют из материала; не выдумывай лишние типы.
- Для заданий по тексту: какие отрывки вынести в readingPassage один раз, какие вопросы к ним привязать (без дублирования всего текста в каждом вопросе).
- Языковая политика для генератора: инструкции и подписи для студента — на русском; цитаты, варианты, предложения из учебника, абзацы для чтения — строго на L2, дословно по смыслу источника, без перевода на русский.
- Если в материале есть ключи или явные ответы — напомни, что их нужно перенести в correctKey / correctSentence / gapCorrectToken / gapCorrectTokens / matchCorrectKeys; если нет — что эталон выбирается по смыслу.

- Если в начале материала уже есть блок **«План типов заданий (инструменты пайплайна)»** (результат инструментов detect_lesson_task_type_intent и map_document_parts_to_exercise_types) — **не противоречь** ему: в брифе напиши, что генератор обязан выставить inputKind по partIndex как в плане.

Обязательно один раз вызови инструмент submit_lesson_generation_brief с полем brief: связный текст на русском (цитаты из учебника в брифе оставляй на языке оригинала), чтобы генератор JSON построил спецификацию без HTML.

После успешного вызова submit_lesson_generation_brief заверши работу: не вызывай submit повторно.`

const submitBriefSchema = z.object({
  brief: z
    .string()
    .min(1)
    .max(30_000)
    .describe(
      'Технический бриф для генератора JSON-теста: верность PDF (дословный перенос блоков), язык L2, уровень, структура частей, типы заданий (radio/select/checkbox/wordOrder/gapDrag/matchPairs), опорные фразы из материала на L2, русские формулировки инструкций для следующего узла. Если пользователь просил true/false — строка «ФОРМАТ: true/false, radio, в options только True/False на L2» обязательна.',
    ),
})

export type SubmitBriefInput = z.infer<typeof submitBriefSchema>

export async function runLessonPlannerDeepAgent(materialBlock: string): Promise<string> {
  const briefHolder: { value: string } = { value: '' }

  const submitLessonGenerationBrief = tool(
    async (input: SubmitBriefInput) => {
      briefHolder.value = input.brief.trim()
      return 'Бриф принят. Заверши ответ; другие инструменты для брифа не нужны.'
    },
    {
      name: 'submit_lesson_generation_brief',
      description:
        'Передать итоговый бриф генератору JSON-теста. Вызови ровно один раз, когда план готов.',
      schema: submitBriefSchema,
    },
  )

  const model = createLessonLlmModel({ model: getLlmModelPlanner() })

  const agent = createAgent({
    model,
    tools: [submitLessonGenerationBrief],
    systemPrompt: LESSON_PLANNER_SYSTEM,
  })

  await agent.invoke(
    {
      messages: [
        new HumanMessage(
          [
            '### Материал для планирования теста',
            materialBlock.trim().slice(0, 56_000),
          ].join('\n'),
        ),
      ],
    },
    { recursionLimit: 40 },
  )

  return briefHolder.value
}
