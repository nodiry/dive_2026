import { gameAPI } from '@api/game';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export function useGame(id: string | null) {
  return useQuery({
    queryKey: ['game', id],
    queryFn: () => gameAPI.get(id as string),
    enabled: Boolean(id),
    staleTime: Infinity,
  });
}

export function useCreateGame() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { theme?: string; conversationId?: string }) => gameAPI.create(body),
    onSuccess: (game) => {
      queryClient.setQueryData(['game', game.id], game);
      void queryClient.invalidateQueries({ queryKey: ['games'] });
    },
  });
}

export function useAnswerGame(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (answers: Record<string, string>) => gameAPI.answer(id, answers),
    onSuccess: (game) => queryClient.setQueryData(['game', game.id], game),
  });
}

/** Fire-and-forget after each pick; the played card is already on screen. */
export function useSaveGameProgress(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (answers: Record<string, string>) => gameAPI.saveProgress(id, answers),
    onSuccess: (game) => queryClient.setQueryData(['game', game.id], game),
  });
}
