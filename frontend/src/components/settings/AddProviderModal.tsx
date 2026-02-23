import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { GlassModal } from '../common'
import { LLMProviderForm } from './LLMProviderForm'
import type { LLMProviderFormValues } from './LLMProviderForm'
import { createLLMProvider } from '../../api/settings'

interface AddProviderModalProps {
  isOpen: boolean
  onClose: () => void
}

export function AddProviderModal({ isOpen, onClose }: AddProviderModalProps) {
  const queryClient = useQueryClient()

  const { mutate, isPending } = useMutation({
    mutationFn: createLLMProvider,
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['llm-providers'] })
      toast.success(`Provider "${created.display_name}" added successfully`)
      onClose()
    },
  })

  const handleSubmit = (values: LLMProviderFormValues) => {
    mutate({
      provider_type: values.provider_type,
      display_name: values.display_name,
      api_key_masked: '',
      api_key: values.api_key,
      base_url: values.base_url || undefined,
      model_name: values.model_name,
      temperature: values.temperature,
      max_tokens: values.max_tokens,
      is_default: values.is_default,
    } as any)
  }

  return (
    <GlassModal isOpen={isOpen} onClose={onClose} title="Add LLM Provider" size="lg">
      <LLMProviderForm
        onSubmit={handleSubmit}
        isSubmitting={isPending}
        submitLabel="Add Provider"
      />
    </GlassModal>
  )
}
