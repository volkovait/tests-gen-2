import { describe, expect, it } from 'vitest'
import { stripHtmlForTelegramPlain } from '@/lib/telegram/strip-html-for-plain'

describe('stripHtmlForTelegramPlain', () => {
  it('unwraps pre with entities', () => {
    const out = stripHtmlForTelegramPlain('<pre>Line1\n&amp; text &lt;x&gt;</pre>')
    expect(out).toContain('Line1')
    expect(out).toContain('& text <x>')
  })

  it('strips tags', () => {
    expect(stripHtmlForTelegramPlain('<b>Hi</b>')).toBe('Hi')
  })
})
