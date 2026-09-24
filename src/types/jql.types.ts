export type JqlValueType = 'text' | 'objectId' | 'date' | 'number' | 'enum'

export interface JqlFieldMetadata {
  field: string
  label: string
  operators: string[]
  valueType: JqlValueType
  hasDynamicValues: boolean
}

export interface JqlAutocompleteFields {
  fields: JqlFieldMetadata[]
  keywords: string[]
}
