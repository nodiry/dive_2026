import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { savedAPI } from '@/api/saved';
import { useAuth } from '@/contexts/auth';

/** Saved housing lives server-side, so it is only available when signed in. */
export function useSavedHousing() {
  const { isLoggedIn } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({ queryKey: ['saved'], queryFn: savedAPI.list, enabled: isLoggedIn });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['saved'] });
  const save = useMutation({ mutationFn: savedAPI.save, onSuccess: invalidate });
  const unsave = useMutation({ mutationFn: savedAPI.unsave, onSuccess: invalidate });

  const savedHousing = query.data ?? [];
  const isSaved = (id: number) => savedHousing.some((h) => h.id === id);

  return {
    savedHousing,
    isLoading: query.isLoading,
    isLoggedIn,
    isSaved,
    toggleSaved: (id: number) => {
      if (!isLoggedIn) return;
      if (isSaved(id)) unsave.mutate(id);
      else save.mutate(id);
    },
  };
}
