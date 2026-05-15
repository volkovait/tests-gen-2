import { describe, expect, it } from 'vitest'
import { extractJsonDocument } from '@/lib/lesson-spec/extract-json-document'

describe('extractJsonDocument', () => {
  it('возвращает голый JSON как есть', () => {
    const payload = '{"version":1,"title":"t"}'
    expect(extractJsonDocument(`  ${payload}  `)).toBe(payload)
  })

  it('снимает ограждение, если им обёрнута вся строка', () => {
    const inner = '{"version":1,"parts":[]}'
    expect(extractJsonDocument('```json\n' + inner + '\n```')).toBe(inner)
  })

  it('находит ```json блок при преамбуле модели', () => {
    const inner = '{"version":1,"title":"x"}'
    const raw = `Вот спецификация:\n\n\`\`\`json\n${inner}\n\`\`\`\nСпасибо.`
    expect(extractJsonDocument(raw)).toBe(inner)
  })

  it('вырезает первый сбалансированный объект при тексте до и после', () => {
    const inner = '{"version":1,"q":"say \\"hi\\" "}'
    const raw = `Prefix\n${inner}\ntrailer`
    expect(extractJsonDocument(raw)).toBe(inner)
  })

  it('берёт BOM в начале ответа', () => {
    const inner = '{"a":1}'
    expect(extractJsonDocument('\ufeff' + inner)).toBe(inner)
  })
})
