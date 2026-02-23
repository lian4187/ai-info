import axios, { AxiosError } from 'axios'
import toast from 'react-hot-toast'

export const apiClient = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30_000,
})

// Response interceptor — surface errors as toasts
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ detail?: string; message?: string }>) => {
    // Don't toast on cancelled requests
    if (axios.isCancel(error)) return Promise.reject(error)

    const status = error.response?.status
    const data = error.response?.data

    // Derive a human-readable message
    let message = 'An unexpected error occurred'

    if (data?.detail) {
      message = Array.isArray(data.detail)
        ? data.detail.map((d: unknown) =>
            typeof d === 'object' && d !== null && 'msg' in d
              ? (d as { msg: string }).msg
              : String(d)
          ).join(', ')
        : data.detail
    } else if (data?.message) {
      message = data.message
    } else if (status === 401) {
      message = 'Unauthorized — please log in again'
    } else if (status === 403) {
      message = 'You do not have permission to perform this action'
    } else if (status === 404) {
      message = 'Resource not found'
    } else if (status === 422) {
      message = 'Invalid request data'
    } else if (status != null && status >= 500) {
      message = 'Server error — please try again later'
    } else if (!error.response) {
      message = 'Network error — check your connection'
    }

    toast.error(message, { duration: 4000 })

    return Promise.reject(error)
  }
)
