import type { TaskPriority } from '@/types/task.types'

/**
 * Module 10 gap-closure: "AI-assisted issue creation", deterministically (no LLM - same
 * "suggested, review before saving" convention as the suggested-fields banner). Turns a free-text
 * description like "Checkout crashes on Safari when the cart is empty - urgent, payments" into a
 * draft: a clean title, the full text as description, a likely issue type and priority, and any
 * of the project's own labels/components the text mentions. Only values that exist in the
 * project are ever proposed.
 */

export interface IssueDraftContext {
  /** Standard-level issue type names available in this project. */
  issueTypes: string[]
  labels: string[]
  components: string[]
}

export interface IssueDraft {
  title: string
  description: string
  issueType: string | null
  priority: TaskPriority
  labels: string[]
  components: string[]
}

const BUG_WORDS =
  /\b(bug|crash(es|ed|ing)?|error|exception|broken|fail(s|ed|ing|ure)?|doesn'?t work|not working|500|404|regression|wrong)\b/i
const STORY_WORDS = /\b(as an? |user story|i want to|so that|feature|ability to|allow users?)\b/i
const URGENT_WORDS =
  /\b(urgent|asap|critical|blocker|blocking|production|prod down|outage|immediately|high priority)\b/i
const LOW_WORDS = /\b(minor|low priority|nice to have|cosmetic|typo|whenever|someday)\b/i

/** Words that describe urgency rather than the problem - dropped from the drafted title. */
const TITLE_NOISE =
  /[\s,;:-]*\b(urgent(ly)?|asap|please|critical|high priority|low priority|nice to have|blocker)\b[\s,;:!.-]*/gi

const MAX_TITLE = 120

function firstSentence(text: string): string {
  const firstLine = text.trim().split(/\n/)[0] ?? ''
  const sentence = firstLine.split(/(?<=[.!?])\s/)[0] ?? firstLine
  return sentence.replace(/[.!?]+$/, '').trim()
}

function mentions(text: string, candidate: string): boolean {
  const escaped = candidate.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return escaped.length > 0 && new RegExp(`\\b${escaped}\\b`, 'i').test(text)
}

function pickType(text: string, issueTypes: string[]): string | null {
  const byName = (name: string) => issueTypes.find((t) => t.toLowerCase() === name)
  if (BUG_WORDS.test(text) && byName('bug')) return byName('bug')!
  if (STORY_WORDS.test(text) && byName('story')) return byName('story')!
  return byName('task') ?? null
}

export function draftIssue(text: string, context: IssueDraftContext): IssueDraft | null {
  const description = text.trim()
  if (description.length < 3) return null

  let title = firstSentence(description).replace(TITLE_NOISE, ' ').replace(/\s+/g, ' ').trim()
  if (title.length < 3) title = firstSentence(description)
  if (title.length > MAX_TITLE) title = `${title.slice(0, MAX_TITLE - 1).trimEnd()}…`
  title = title.charAt(0).toUpperCase() + title.slice(1)

  const priority: TaskPriority = URGENT_WORDS.test(description)
    ? 'P1'
    : LOW_WORDS.test(description)
      ? 'P3'
      : 'P2'

  return {
    title,
    description,
    issueType: pickType(description, context.issueTypes),
    priority,
    labels: context.labels.filter((label) => mentions(description, label)),
    components: context.components.filter((component) => mentions(description, component)),
  }
}
