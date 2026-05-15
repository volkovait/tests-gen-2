import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { lessonGenerationReferenceBundleSchema } from '@/lib/lesson-generation/reference-bundle'

describe('lessonGenerationReferenceBundleSchema', () => {
  it('parses the bundled reference fixture', () => {
    const raw = readFileSync(
      join(
        process.cwd(),
        'ref',
        'lesson-generation-references',
        'run-2026-05-12_20-42-35.bundle.json',
      ),
      'utf8',
    )
    const parsed = lessonGenerationReferenceBundleSchema.safeParse(JSON.parse(raw))
    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(parsed.data.slug).toBe('all-about-you-ready-material-2026-05-12')
      expect(parsed.data.steps.length).toBe(22)
    }
  })
})
