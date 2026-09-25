import { describe, expect, it } from 'vitest'
import { findMentionQuery, insertMention, parseCommentBody } from './mentions'

describe('parseCommentBody', () => {
  it('returns a single text segment for a body with no mentions', () => {
    expect(parseCommentBody('Looks good')).toEqual([{ type: 'text', value: 'Looks good' }])
  })

  it('splits text around a single mention', () => {
    expect(parseCommentBody('Hey @[Jane Doe](507f1f77bcf86cd799439011) can you check?')).toEqual([
      { type: 'text', value: 'Hey ' },
      { type: 'mention', name: 'Jane Doe', userId: '507f1f77bcf86cd799439011' },
      { type: 'text', value: ' can you check?' },
    ])
  })

  it('handles a body that is only a mention (no surrounding text)', () => {
    expect(parseCommentBody('@[Jane Doe](507f1f77bcf86cd799439011)')).toEqual([
      { type: 'mention', name: 'Jane Doe', userId: '507f1f77bcf86cd799439011' },
    ])
  })

  it('handles multiple mentions', () => {
    expect(
      parseCommentBody(
        '@[Jane Doe](507f1f77bcf86cd799439011) and @[John Smith](507f1f77bcf86cd799439012)',
      ),
    ).toEqual([
      { type: 'mention', name: 'Jane Doe', userId: '507f1f77bcf86cd799439011' },
      { type: 'text', value: ' and ' },
      { type: 'mention', name: 'John Smith', userId: '507f1f77bcf86cd799439012' },
    ])
  })
})

describe('findMentionQuery', () => {
  it('returns an empty string right after typing a bare "@"', () => {
    expect(findMentionQuery('Hey @')).toBe('')
  })

  it('returns the partial name typed so far', () => {
    expect(findMentionQuery('Hey @jan')).toBe('jan')
  })

  it('returns null when there is no "@" at all', () => {
    expect(findMentionQuery('Hey there')).toBeNull()
  })

  it('returns null once whitespace follows the "@" (mention context closed)', () => {
    expect(findMentionQuery('Hey @jane ')).toBeNull()
  })

  it('returns null for an email-like "@" with no leading whitespace boundary', () => {
    expect(findMentionQuery('me@example')).toBeNull()
  })
})

describe('insertMention', () => {
  it('replaces the in-progress "@partial" with full mention markup', () => {
    const result = insertMention('Hey @jan', 8, 'Jane Doe', '507f1f77bcf86cd799439011')
    expect(result.text).toBe('Hey @[Jane Doe](507f1f77bcf86cd799439011) ')
    expect(result.cursorIndex).toBe(result.text.length)
  })

  it('preserves text after the cursor', () => {
    const result = insertMention(
      'Hey @jan, please review',
      8,
      'Jane Doe',
      '507f1f77bcf86cd799439011',
    )
    expect(result.text).toBe('Hey @[Jane Doe](507f1f77bcf86cd799439011) , please review')
  })

  it('works right after typing a bare "@" with no partial name', () => {
    const result = insertMention('Hey @', 5, 'Jane Doe', '507f1f77bcf86cd799439011')
    expect(result.text).toBe('Hey @[Jane Doe](507f1f77bcf86cd799439011) ')
  })
})
