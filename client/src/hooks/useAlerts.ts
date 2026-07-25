import { alertsAPI } from '@api/alerts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@stores/useAuthStore';

const MY_ALERTS_KEY = ['housing-alerts', 'me'];
const ALERT_STATS_KEY = ['housing-alerts', 'stats'];

export function useHousingAlerts() {
  const token = useAuthStore((state) => state.token);
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: MY_ALERTS_KEY,
    queryFn: alertsAPI.listMine,
    enabled: !!token,
  });
  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: MY_ALERTS_KEY }),
      queryClient.invalidateQueries({ queryKey: ALERT_STATS_KEY }),
    ]);
  };
  const subscribe = useMutation({ mutationFn: alertsAPI.subscribe, onSuccess: invalidate });
  const cancel = useMutation({ mutationFn: alertsAPI.cancel, onSuccess: invalidate });
  return { ...query, alerts: query.data ?? [], subscribe, cancel };
}

export function useHousingAlertStats() {
  return useQuery({
    queryKey: ALERT_STATS_KEY,
    queryFn: alertsAPI.stats,
  });
}
