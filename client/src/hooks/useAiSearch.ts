import { aiAPI } from '@api/ai';
import type { AiSearchRequest } from '@shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export function useAiSearch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: AiSearchRequest) => aiAPI.search(body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ai-conversations'] }),
  });
}

export function useAiConversations(enabled: boolean) {
  return useQuery({
    queryKey: ['ai-conversations'],
    queryFn: aiAPI.listConversations,
    enabled,
  });
}

export function useDeleteAiConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => aiAPI.deleteConversation(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ai-conversations'] }),
  });
}
