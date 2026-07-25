import { aiAPI } from '@api/ai';
import type { AiSearchRequest } from '@shared';
import { useMutation } from '@tanstack/react-query';

export function useAiSearch() {
  return useMutation({ mutationFn: (body: AiSearchRequest) => aiAPI.search(body) });
}
