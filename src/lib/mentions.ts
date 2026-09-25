/**
 * Module 7's @mention convention: `@[Display Name](userId)` inserted inline into a comment's plain
 * string body - mirrors the backend's mention.util.ts exactly, so the extracted ids always match
 * what CommentForm actually inserted. No rich-text editor involved; this is pure string
 * manipulation over a plain <textarea>.
 */
const MENTION_PATTERN = /@\[([^\]]+)\]\(([a-f0-9]{24})\)/g

export type CommentSegment =
  { type: 'text'; value: string } | { type: 'mention'; name: string; userId: string }

/** Splits a comment body into plain-text and mention segments, for CommentItem to render each
 * mention as a styled chip instead of raw markup. */
export function parseCommentBody(body: string): CommentSegment[] {
  const segments: CommentSegment[] = []
  let lastIndex = 0
  for (const match of body.matchAll(MENTION_PATTERN)) {
    const index = match.index ?? 0
    if (index > lastIndex) segments.push({ type: 'text', value: body.slice(lastIndex, index) })
    segments.push({ type: 'mention', name: match[1]!, userId: match[2]! })
    lastIndex = index + match[0].length
  }
  if (lastIndex < body.length) segments.push({ type: 'text', value: body.slice(lastIndex) })
  return segments
}

/** Whether the text immediately before the cursor is mid-mention (an "@" - possibly followed by a
 * partial name - with no whitespace since) - and if so, the partial name typed so far (possibly
 * empty, right after typing "@"). Returns null when the cursor isn't in a mention context. */
export function findMentionQuery(textBeforeCursor: string): string | null {
  const match = textBeforeCursor.match(/(?:^|\s)@([\w.'-]*)$/)
  return match ? match[1]! : null
}

/** Replaces the in-progress "@partial" text (from the triggering "@" up to the cursor) with the
 * full `@[Name](userId) ` markup, returning the new full text and where the cursor should land. */
export function insertMention(
  text: string,
  cursorIndex: number,
  name: string,
  userId: string,
): { text: string; cursorIndex: number } {
  const before = text.slice(0, cursorIndex)
  const after = text.slice(cursorIndex)
  const atIndex = before.lastIndexOf('@')
  const prefix = before.slice(0, atIndex)
  const mentionMarkup = `@[${name}](${userId}) `
  return {
    text: `${prefix}${mentionMarkup}${after}`,
    cursorIndex: prefix.length + mentionMarkup.length,
  }
}
