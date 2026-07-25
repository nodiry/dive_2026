import { savedAPI } from '@api/saved';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@stores/useAuthStore';
import { useToastStore } from '@stores/useToastStore';
import { useTranslation } from 'react-i18next';

const SAVED_QUERY_KEY = ['saved'];

/**
 * Saved housing now lives in the DB, per user — this replaced the old
 * localStorage-backed zustand store. Toggling while logged out prompts a
 * toast instead of saving locally, since there's no anonymous bucket to
 * save into anymore.
 */
export function useSavedHousing() {
  const { t } = useTranslation();
  const token = useAuthStore((s) => s.token);
  const showWarning = useToastStore((s) => s.showWarning);
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: SAVED_QUERY_KEY,
    queryFn: savedAPI.list,
    enabled: !!token,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: SAVED_QUERY_KEY });
  const saveMutation = useMutation({ mutationFn: savedAPI.save, onSuccess: invalidate });
  const unsaveMutation = useMutation({ mutationFn: savedAPI.unsave, onSuccess: invalidate });

  const savedHousing = query.data ?? [];
  const savedIds = new Set(savedHousing.map((h) => h.id));

  function isSaved(id: number): boolean {
    return savedIds.has(id);
  }

  function toggleSaved(id: number) {
    if (!token) {
      showWarning(t('saved.loginToSave'));
      return;
    }
    if (isSaved(id)) unsaveMutation.mutate(id);
    else saveMutation.mutate(id);
  }

  return { savedHousing, isSaved, toggleSaved, isLoading: query.isLoading };
}
