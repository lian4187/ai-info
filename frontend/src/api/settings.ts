import { apiClient } from './client'
import type { LLMProviderConfig, ScheduledTask, TaskLog } from '../types'

// ---------------------------------------------------------------------------
// LLM Provider endpoints
// ---------------------------------------------------------------------------

export const getLLMProviders = (): Promise<LLMProviderConfig[]> =>
  apiClient.get<LLMProviderConfig[]>('/llm/providers').then((r) => r.data)

export const createLLMProvider = (
  data: Omit<LLMProviderConfig, 'id' | 'created_at' | 'updated_at'>
): Promise<LLMProviderConfig> =>
  apiClient.post<LLMProviderConfig>('/llm/providers', data).then((r) => r.data)

export const updateLLMProvider = (
  id: number,
  data: Partial<LLMProviderConfig>
): Promise<LLMProviderConfig> =>
  apiClient.put<LLMProviderConfig>(`/llm/providers/${id}`, data).then((r) => r.data)

export const deleteLLMProvider = (id: number): Promise<void> =>
  apiClient.delete(`/llm/providers/${id}`).then(() => undefined)

export const testLLMProvider = (
  id: number
): Promise<{ success: boolean; message?: string; latency_ms?: number }> =>
  apiClient
    .post<{ success: boolean; message?: string; latency_ms?: number }>(
      `/llm/providers/${id}/test`
    )
    .then((r) => r.data)

export const setDefaultLLMProvider = (id: number): Promise<LLMProviderConfig> =>
  apiClient
    .post<LLMProviderConfig>(`/llm/providers/${id}/set-default`)
    .then((r) => r.data)

// ---------------------------------------------------------------------------
// Scheduled Task endpoints
// ---------------------------------------------------------------------------

export const getScheduledTasks = (): Promise<ScheduledTask[]> =>
  apiClient.get<ScheduledTask[]>('/tasks/').then((r) => r.data)

export const updateScheduledTask = (
  id: number,
  data: { cron_expression?: string; is_enabled?: boolean }
): Promise<ScheduledTask> =>
  apiClient.put<ScheduledTask>(`/tasks/${id}`, data).then((r) => r.data)

export const runTask = (
  id: number
): Promise<{ success: boolean; message?: string }> =>
  apiClient
    .post<{ success: boolean; message?: string }>(`/tasks/${id}/run`)
    .then((r) => r.data)

export const getTaskLogs = (id: number, limit = 20): Promise<TaskLog[]> =>
  apiClient
    .get<TaskLog[]>(`/tasks/${id}/logs`, { params: { limit } })
    .then((r) => r.data)
