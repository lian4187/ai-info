import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { GlassModal } from '../common'
import { LLMProviderForm } from './LLMProviderForm'
import type { LLMProviderFormValues } from './LLMProviderForm'
import { updateLLMProvider } from '../../api/settings'
import type { LLMProviderConfig } from '../../types'

interface EditProviderModalProps {
  isOpen: boolean
  onClose: () => void
  provider: LLMProviderConfig
}

export function EditProviderModal({
  isOpen,
  onClose,
  provider,
}: EditProviderModalProps) {
  const queryClient = useQueryClient()

  const { mutate, isPending } = useMutation({
    mutationFn: (values: LLMProviderFormValues) =>
      updateLLMProvider(provider.id, {
        provider_type: values.provider_type,
        display_name: values.display_name,
        ...(values.api_key ? { api_key: values.api_key } : {}),
        base_url: values.base_url || undefined,
        model_name: values.model_name,
        temperature: values.temperature,
        max_tokens: values.max_tokens,
        is_default: values.is_default,
      } as any),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['llm-providers'] })
      toast.success(`Provider "${updated.display_name}" updated`)
      onClose()
    },
  })

  return (
    <GlassModal isOpen={isOpen} onClose={onClose} title={`Edit: ${provider.display_name}`} size="lg">
      <LLMProviderForm
        initialValues={provider}
        isEditing
        onSubmit={mutate}
        isSubmitting={isPending}
        submitLabel="Save Changes"
      />
    </GlassModal>
  )
}
