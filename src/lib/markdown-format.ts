/**
 * Module 7 gap-closure: a lightweight formatting toolbar (Bold/Italic/Link/Code) that inserts
 * plain markdown syntax into a comment's textarea at the cursor/selection - mirrors
 * mentions.ts's `insertMention` shape (pure function over text+cursor, returns the new text and
 * where the selection should land next) rather than a rich-text editor.
 */
export type MarkdownFormatKind = 'bold' | 'italic' | 'link' | 'code'

const WRAP: Record<Exclude<MarkdownFormatKind, 'link'>, string> = {
  bold: '**',
  italic: '_',
  code: '`',
}

const PLACEHOLDER: Record<Exclude<MarkdownFormatKind, 'link'>, string> = {
  bold: 'bold text',
  italic: 'italic text',
  code: 'code',
}

export interface FormatResult {
  text: string
  selectionStart: number
  selectionEnd: number
}

/** Wraps (or replaces, if nothing is selected, with a placeholder) the current selection in the
 * given kind's markdown syntax, returning the new full text and the selection to apply next - for
 * `link`, the inserted "url" placeholder is selected so typing immediately replaces it. */
export function applyMarkdownFormat(
  text: string,
  selectionStart: number,
  selectionEnd: number,
  kind: MarkdownFormatKind,
): FormatResult {
  const selected = text.slice(selectionStart, selectionEnd)
  const before = text.slice(0, selectionStart)
  const after = text.slice(selectionEnd)

  if (kind === 'link') {
    const label = selected || 'link text'
    const markup = `[${label}](url)`
    const urlStart = selectionStart + label.length + 3
    return {
      text: `${before}${markup}${after}`,
      selectionStart: urlStart,
      selectionEnd: urlStart + 3,
    }
  }

  const wrap = WRAP[kind]
  const content = selected || PLACEHOLDER[kind]
  return {
    text: `${before}${wrap}${content}${wrap}${after}`,
    selectionStart: selectionStart + wrap.length,
    selectionEnd: selectionStart + wrap.length + content.length,
  }
}
