import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { aiAPI } from '@/api/ai';
import type { AiSearchRequest } from '@/shared/schemas';

export function useAiSearch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: AiSearchRequest) => aiAPI.search(body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ai-conversations'] }),
  });
}

export function useAiConversations(enabled: boolean) {
  return useQuery({ queryKey: ['ai-conversations'], queryFn: aiAPI.listConversations, enabled });
}
