import { districtsAPI } from '@api/districts';
import { useQuery } from '@tanstack/react-query';

export function useDistrictDensity(enabled: boolean) {
  return useQuery({
    queryKey: ['districts', 'density'],
    queryFn: districtsAPI.getDensity,
    enabled,
    staleTime: Infinity,
  });
}
