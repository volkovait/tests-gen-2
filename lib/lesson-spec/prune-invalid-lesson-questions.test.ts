import { describe, expect, it } from 'vitest'
import { pruneLooseLessonSpecToValidModel } from '@/lib/lesson-spec/prune-invalid-lesson-questions'

describe('pruneLooseLessonSpecToValidModel', () => {
  it('оставляет валидные вопросы и убирает невалидные', () => {
    const loose = {
      version: 1 as const,
      title: 'Test',
      parts: [
        {
          title: 'Part 1',
          exercises: [
            {
              title: 'Ex 1',
              inputKind: 'radio' as const,
              questions: [
                {
                  id: 'q_ok',
                  prompt: 'Pick',
                  options: [
                    { key: 'A', text: 'one' },
                    { key: 'B', text: 'two' },
                  ],
                  correctKey: 'A',
                },
                { id: 'q_bad', prompt: 'no options' },
              ],
            },
          ],
        },
      ],
    }
    const r = pruneLooseLessonSpecToValidModel(loose)
    expect(r).not.toBeNull()
    expect(r!.warnings.length).toBe(1)
    expect(r!.warnings[0]).toContain('q_bad')
    expect(r!.model.parts[0].exercises[0].questions).toHaveLength(1)
    expect(r!.model.parts[0].exercises[0].questions[0].id).toBe('q_ok')
  })

  it('возвращает модель без предупреждений при полностью валидном JSON', () => {
    const loose = {
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
                  prompt: 'x',
                  options: [
                    { key: 'A', text: 'a' },
                    { key: 'B', text: 'b' },
                  ],
                  correctKey: 'B',
                },
              ],
            },
          ],
        },
      ],
    }
    const r = pruneLooseLessonSpecToValidModel(loose)
    expect(r).not.toBeNull()
    expect(r!.warnings).toEqual([])
  })
})
