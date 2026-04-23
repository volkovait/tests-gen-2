import { describe, expect, it } from 'vitest'
import { lessonSpecFromModelSchema } from '@/lib/lesson-spec/schema'
import { normalizeLessonSpecFromModel } from '@/lib/lesson-spec/normalize-lesson-spec'

describe('normalizeLessonSpecFromModel', () => {
  it('strips HTML from prompt and rekeys options to A B', () => {
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
                  prompt: 'Jon: How <u>are</u> / <u>is</u> you?',
                  options: [
                    { key: 'are', text: 'are' },
                    { key: 'is', text: 'is' },
                  ],
                  correctKey: 'are',
                },
              ],
            },
          ],
        },
      ],
    }
    const parsed = lessonSpecFromModelSchema.parse(raw)
    const out = normalizeLessonSpecFromModel(parsed)
    expect(out.parts[0].exercises[0].questions[0].prompt).toBe('Jon: How are / is you?')
    expect(out.parts[0].exercises[0].questions[0].options).toEqual([
      { key: 'A', text: 'are' },
      { key: 'B', text: 'is' },
    ])
    expect(out.parts[0].exercises[0].questions[0].correctKey).toBe('A')
  })

  it('strips duplicate letter prefix from option text', () => {
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
                  prompt: 'Pick',
                  options: [
                    { key: 'X', text: 'A) first' },
                    { key: 'Y', text: 'B) second' },
                  ],
                  correctKey: 'Y',
                },
              ],
            },
          ],
        },
      ],
    }
    const parsed = lessonSpecFromModelSchema.parse(raw)
    const out = normalizeLessonSpecFromModel(parsed)
    expect(out.parts[0].exercises[0].questions[0].options).toEqual([
      { key: 'A', text: 'first' },
      { key: 'B', text: 'second' },
    ])
    expect(out.parts[0].exercises[0].questions[0].correctKey).toBe('B')
  })
})
