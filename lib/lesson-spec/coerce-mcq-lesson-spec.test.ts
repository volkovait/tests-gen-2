import { describe, expect, it } from 'vitest'
import { coerceMcqInLessonSpecJson } from '@/lib/lesson-spec/coerce-mcq-lesson-spec'
import { lessonSpecFromModelSchema } from '@/lib/lesson-spec/schema'
import { normalizeLessonSpecFromModel } from '@/lib/lesson-spec/normalize-lesson-spec'

describe('coerceMcqInLessonSpecJson', () => {
  it('вытаскивает A)/B)/C) из prompt в options', () => {
    const raw = {
      version: 1 as const,
      title: 'T',
      parts: [
        {
          title: 'P',
          exercises: [
            {
              title: 'E',
              inputKind: 'radio' as const,
              questions: [
                {
                  id: 'q1',
                  prompt: 'She ___ to work by bus.\nA) goes\nB) go\nC) going',
                  correctKey: 'goes',
                },
              ],
            },
          ],
        },
      ],
    }
    coerceMcqInLessonSpecJson(raw)
    const parsed = lessonSpecFromModelSchema.parse(raw)
    expect(parsed.parts[0].exercises[0].questions[0].options?.length).toBeGreaterThanOrEqual(2)
    const out = normalizeLessonSpecFromModel(parsed)
    expect(out.parts[0].exercises[0].questions[0].correctKey).toBe('A')
  })

  it('принимает длинный correctKey после coerce + parse', () => {
    const raw = {
      version: 1 as const,
      title: 'T',
      parts: [
        {
          title: 'P',
          exercises: [
            {
              title: 'E',
              questions: [
                {
                  id: 'q1',
                  prompt: 'Pick:\nA) first option here\nB) second',
                  correctKey: 'first option here',
                },
              ],
            },
          ],
        },
      ],
    }
    coerceMcqInLessonSpecJson(raw)
    const parsed = lessonSpecFromModelSchema.parse(raw)
    const out = normalizeLessonSpecFromModel(parsed)
    expect(out.parts[0].exercises[0].questions[0].correctKey).toBe('A')
  })

  it('парсит варианты в скобках через слэш', () => {
    const raw = {
      version: 1 as const,
      title: 'T',
      parts: [
        {
          title: 'P',
          exercises: [
            {
              title: 'E',
              inputKind: 'select' as const,
              questions: [
                {
                  id: 'q1',
                  prompt: 'How ___ you? (is / are / am)',
                  correctKey: 'are',
                },
              ],
            },
          ],
        },
      ],
    }
    coerceMcqInLessonSpecJson(raw)
    const parsed = lessonSpecFromModelSchema.parse(raw)
    const out = normalizeLessonSpecFromModel(parsed)
    expect(out.parts[0].exercises[0].questions[0].options).toEqual([
      { key: 'A', text: 'is' },
      { key: 'B', text: 'are' },
      { key: 'C', text: 'am' },
    ])
    expect(out.parts[0].exercises[0].questions[0].correctKey).toBe('B')
  })

  it('дублирует options из instruction со слэшами без скобок', () => {
    const raw = {
      version: 1 as const,
      title: 'T',
      parts: [
        {
          title: 'P',
          exercises: [
            {
              title: 'Degrees',
              instruction: 'Choose: positive / comparative / superlative',
              inputKind: 'radio' as const,
              questions: [{ id: 'q1', prompt: 'big ____', correctAnswer: 'superlative' }],
            },
          ],
        },
      ],
    }
    coerceMcqInLessonSpecJson(raw)
    const parsed = lessonSpecFromModelSchema.parse(raw)
    expect(parsed.parts[0].exercises[0].questions[0].options?.length).toBe(3)
    const out = normalizeLessonSpecFromModel(parsed)
    expect(out.parts[0].exercises[0].questions[0].correctKey).toBe('C')
  })

  it('дублирует options из instruction упражнения для коротких prompt', () => {
    const raw = {
      version: 1 as const,
      title: 'T',
      parts: [
        {
          title: 'P',
          exercises: [
            {
              title: 'Degrees of comparison',
              instruction: 'Choose the correct form (positive / comparative / superlative)',
              inputKind: 'radio' as const,
              questions: [
                { id: 'q1', prompt: 'big', correctKey: 'superlative' },
                { id: 'q2', prompt: 'easy', correctKey: 'comparative' },
              ],
            },
          ],
        },
      ],
    }
    coerceMcqInLessonSpecJson(raw)
    const parsed = lessonSpecFromModelSchema.parse(raw)
    expect(parsed.parts[0].exercises[0].questions[0].options?.length).toBe(3)
    expect(parsed.parts[0].exercises[0].questions[1].options?.length).toBe(3)
    const out = normalizeLessonSpecFromModel(parsed)
    expect(out.parts[0].exercises[0].questions[0].correctKey).toBe('C')
    expect(out.parts[0].exercises[0].questions[1].correctKey).toBe('B')
  })

  it('не трогает wordOrder', () => {
    const raw = {
      version: 1 as const,
      title: 'T',
      parts: [
        {
          title: 'P',
          exercises: [
            {
              title: 'E',
              inputKind: 'wordOrder' as const,
              questions: [
                {
                  id: 'w1',
                  prompt: 'A) B) in prompt but not mcq',
                  wordBank: ['I', 'run'],
                  correctSentence: 'I run',
                },
              ],
            },
          ],
        },
      ],
    }
    coerceMcqInLessonSpecJson(raw)
    const q0 = raw.parts[0].exercises[0].questions[0] as Record<string, unknown>
    expect(q0.options).toBeUndefined()
  })
})
