import { describe, expect, it } from 'vitest'
import { applyMarkdownFormat } from './markdown-format'

describe('applyMarkdownFormat (Module 7 gap-closure)', () => {
  it('wraps a selection in bold syntax and selects the wrapped content', () => {
    const result = applyMarkdownFormat('Hello world', 6, 11, 'bold')
    expect(result.text).toBe('Hello **world**')
    expect(result.text.slice(result.selectionStart, result.selectionEnd)).toBe('world')
  })

  it('inserts a placeholder when nothing is selected', () => {
    const result = applyMarkdownFormat('', 0, 0, 'italic')
    expect(result.text).toBe('_italic text_')
  })

  it('wraps a selection in inline code syntax', () => {
    const result = applyMarkdownFormat('run npm test now', 4, 12, 'code')
    expect(result.text).toBe('run `npm test` now')
  })

  it('turns a selection into link text and selects the url placeholder', () => {
    const result = applyMarkdownFormat('see this', 4, 8, 'link')
    expect(result.text).toBe('see [this](url)')
    expect(result.text.slice(result.selectionStart, result.selectionEnd)).toBe('url')
  })

  it('uses a placeholder link label when nothing is selected', () => {
    const result = applyMarkdownFormat('', 0, 0, 'link')
    expect(result.text).toBe('[link text](url)')
  })
})
