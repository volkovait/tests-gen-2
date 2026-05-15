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

  it('accepts checkbox with correctKeys', () => {
    const r = lessonSpecFromModelSchema.safeParse({
      version: 1,
      title: 'CB',
      parts: [
        {
          title: 'P',
          exercises: [
            {
              title: 'E',
              inputKind: 'checkbox',
              questions: [
                {
                  id: 'c1',
                  prompt: 'Pick all',
                  options: [
                    { key: 'A', text: 'one' },
                    { key: 'B', text: 'two' },
                  ],
                  correctKeys: ['A', 'B'],
                },
              ],
            },
          ],
        },
      ],
    })
    expect(r.success).toBe(true)
  })

  it('accepts gapDrag with template and token', () => {
    const r = lessonSpecFromModelSchema.safeParse({
      version: 1,
      title: 'G',
      parts: [
        {
          title: 'P',
          exercises: [
            {
              title: 'E',
              inputKind: 'gapDrag',
              questions: [
                {
                  id: 'g1',
                  prompt: 'Fill gap',
                  gapTemplate: 'The cat ___ on the mat.',
                  wordBank: ['sat', 'runs', 'jumps'],
                  gapCorrectToken: 'sat',
                },
              ],
            },
          ],
        },
      ],
    })
    expect(r.success).toBe(true)
  })

  it('accepts gapDrag with multiple gaps and gapCorrectTokens', () => {
    const r = lessonSpecFromModelSchema.safeParse({
      version: 1,
      title: 'G2',
      parts: [
        {
          title: 'P',
          exercises: [
            {
              title: 'E',
              inputKind: 'gapDrag',
              questions: [
                {
                  id: 'g_multi',
                  prompt: 'Complete',
                  gapTemplate: 'A: ___ me? ___ you two coffees?',
                  wordBank: ['Excuse', 'Can', 'I', 'get'],
                  gapCorrectTokens: ['Excuse', 'Can'],
                },
              ],
            },
          ],
        },
      ],
    })
    expect(r.success).toBe(true)
  })

  it('accepts matchPairs with stems and keys', () => {
    const r = lessonSpecFromModelSchema.safeParse({
      version: 1,
      title: 'M',
      parts: [
        {
          title: 'P',
          exercises: [
            {
              title: 'E',
              inputKind: 'matchPairs',
              questions: [
                {
                  id: 'm1',
                  prompt: 'Match the halves',
                  matchLeftItems: ['Natalia starts', 'We leave'],
                  matchRightOptions: [
                    { key: 'A', text: 'home at about 8.30 a.m.' },
                    { key: 'B', text: 'late at weekends.' },
                  ],
                  matchCorrectKeys: ['B', 'A'],
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
