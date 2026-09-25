import { describe, expect, it } from 'vitest'
import { formatAuditAction, formatAuditMetadata } from './audit-log'

describe('formatAuditAction', () => {
  it('splits PascalCase words with a space', () => {
    expect(formatAuditAction('UserCreated')).toBe('User Created')
    expect(formatAuditAction('UserRoleChanged')).toBe('User Role Changed')
    expect(formatAuditAction('OrganizationSettingsUpdated')).toBe('Organization Settings Updated')
    expect(formatAuditAction('PermissionSchemeDeleted')).toBe('Permission Scheme Deleted')
  })
})

describe('formatAuditMetadata', () => {
  it('renders an em dash for empty metadata', () => {
    expect(formatAuditMetadata({})).toBe('—')
  })

  it('joins key:value pairs for non-empty metadata', () => {
    expect(formatAuditMetadata({ from: 'Developer', to: 'Manager' })).toBe(
      'from: Developer, to: Manager',
    )
  })

  // Regression: a live-browser smoke test found the backend can omit `metadata` entirely (Mongoose
  // strips empty-object fields on save unless `minimize: false` is set) - the field is optional on
  // the wire even though the TS type says otherwise, so this guards the render path either way.
  it('renders an em dash when metadata is missing from the response entirely', () => {
    expect(formatAuditMetadata(undefined)).toBe('—')
    expect(formatAuditMetadata(null)).toBe('—')
  })
})
