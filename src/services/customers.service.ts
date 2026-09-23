import { apiGet, apiGetPaginated, apiPost } from './api-client'
import type { Customer, CreateCustomerPayload } from '@/types/ticket.types'

export const customersService = {
  list: (query: { page: number; limit: number; search?: string }) =>
    apiGetPaginated<Customer>('/customers', query),

  get: (id: string) => apiGet<Customer>(`/customers/${id}`),

  create: (payload: CreateCustomerPayload) => apiPost<Customer>('/customers', payload),
}
