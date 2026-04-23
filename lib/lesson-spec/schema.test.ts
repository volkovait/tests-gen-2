import { describe, expect, it } from 'vitest'
import { lessonRuntimeSchema, lessonSpecFromModelSchema, lessonSpecSchema } from '@/lib/lesson-spec/schema'

const minimalRadio = {
  version: 1 as const,
  title: 'Test lesson',
  parts: [
    {
      title: 'Part 1',
      exercises: [
        {
          title: 'Ex 1',
          inputKind: 'radio' as const,
          questions: [
            {
              id: 'q1',
              prompt: "Choose: isn't it?",
              options: [
                { key: 'A', text: "yes, it isn't" },
                { key: 'B', text: 'no' },
              ],
              correctKey: 'A',
            },
          ],
        },
      ],
    },
  ],
}

describe('lessonSpecFromModelSchema', () => {
  it('accepts minimal radio exercise', () => {
    const r = lessonSpecFromModelSchema.safeParse(minimalRadio)
    expect(r.success).toBe(true)
  })

  it('rejects wordOrder without wordBank', () => {
    const r = lessonSpecFromModelSchema.safeParse({
      ...minimalRadio,
      parts: [
        {
          title: 'P',
          exercises: [
            {
              title: 'E',
              inputKind: 'wordOrder',
              questions: [{ id: 'w1', prompt: 'Order', correctSentence: 'a b' }],
            },
          ],
        },
      ],
    })
    expect(r.success).toBe(false)
  })

  it('accepts wordOrder with bank and sentence', () => {
    const r = lessonSpecFromModelSchema.safeParse({
      version: 1,
      title: 'WO',
      parts: [
        {
          title: 'P',
          exercises: [
            {
              title: 'E',
              inputKind: 'wordOrder',
              questions: [
                {
                  id: 'w1',
                  prompt: 'Put in order',
                  wordBank: ['I', 'am'],
                  correctSentence: 'I am',
                },
              ],
            },
          ],
        },
      ],
    })
    expect(r.success).toBe(true)
  })

  it('accepts correctKey equal to option text (case-insensitive)', () => {
    const r = lessonSpecFromModelSchema.safeParse({
      version: 1,
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
                  prompt: 'P',
                  options: [
                    { key: 'A', text: 'Alpha' },
                    { key: 'B', text: 'Beta' },
                  ],
                  correctKey: 'beta',
                },
              ],
            },
          ],
        },
      ],
    })
    expect(r.success).toBe(true)
  })

  it('rejects correctKey not in options', () => {
    const r = lessonSpecFromModelSchema.safeParse({
      version: 1,
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
                  prompt: 'P',
                  options: [
                    { key: 'A', text: 'a' },
                    { key: 'B', text: 'b' },
                  ],
                  correctKey: 'Z',
                },
              ],
            },
          ],
        },
      ],
    })
    expect(r.success).toBe(false)
  })
})

describe('lessonSpecSchema with runtime', () => {
  it('parses merged object', () => {
    const base = lessonSpecFromModelSchema.parse(minimalRadio)
    const full = lessonSpecSchema.parse({
      ...base,
      runtime: { localStorageKey: 'lesson_test_key_12345678' },
    })
    expect(full.runtime.localStorageKey).toMatch(/^lesson_/)
  })

  it('lessonRuntimeSchema enforces min length', () => {
    const r = lessonRuntimeSchema.safeParse({ localStorageKey: 'short' })
    expect(r.success).toBe(false)
  })
})
