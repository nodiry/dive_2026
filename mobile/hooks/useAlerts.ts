import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { alertsAPI } from '@/api/alerts';
import { useAuth } from '@/contexts/auth';

const MY_ALERTS_KEY = ['housing-alerts', 'me'];
const ALERT_STATS_KEY = ['housing-alerts', 'stats'];

/**
 * Alerts a user subscribed to from a no-match AI reply. Subscribing also moves
 * the aggregate the Policy report reads, so both keys are invalidated together.
 */
export function useHousingAlerts() {
  const { isLoggedIn } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: MY_ALERTS_KEY,
    queryFn: alertsAPI.listMine,
    enabled: isLoggedIn,
  });

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: MY_ALERTS_KEY }),
      queryClient.invalidateQueries({ queryKey: ALERT_STATS_KEY }),
    ]);
  };

  const subscribe = useMutation({ mutationFn: alertsAPI.subscribe, onSuccess: invalidate });
  const cancel = useMutation({ mutationFn: alertsAPI.cancel, onSuccess: invalidate });

  return {
    alerts: query.data ?? [],
    isLoading: query.isLoading,
    isLoggedIn,
    subscribe,
    cancel,
  };
}

export function useHousingAlertStats() {
  return useQuery({ queryKey: ALERT_STATS_KEY, queryFn: alertsAPI.stats });
}
