import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { gameAPI } from '@/api/game';

export function useGame(id: string | null) {
  return useQuery({
    queryKey: ['game', id],
    queryFn: () => gameAPI.get(id as string),
    enabled: Boolean(id),
    staleTime: Infinity,
  });
}

export function useAnswerGame(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (answers: Record<string, string>) => gameAPI.answer(id, answers),
    onSuccess: (game) => queryClient.setQueryData(['game', game.id], game),
  });
}

/** Fire-and-forget after each pick, so an abandoned deck resumes where it stopped. */
export function useSaveGameProgress(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (answers: Record<string, string>) => gameAPI.saveProgress(id, answers),
    onSuccess: (game) => queryClient.setQueryData(['game', game.id], game),
  });
}
