import { describe, expect, it } from 'vitest'
import { stripHtmlTags } from '@/lib/lesson-spec/sanitize-lesson-text'

describe('stripHtmlTags', () => {
  it('removes u tags and keeps slash alternatives', () => {
    expect(stripHtmlTags('You <u>has</u> / <u>have</u> a new teacher.')).toBe('You has / have a new teacher.')
  })

  it('decodes common entities', () => {
    expect(stripHtmlTags('a &amp; b')).toBe('a & b')
  })
})
