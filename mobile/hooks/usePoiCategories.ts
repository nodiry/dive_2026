import { useQuery } from '@tanstack/react-query';

import { poiAPI } from '@/api/poi';

export function usePoiCategories() {
  return useQuery({
    queryKey: ['poi', 'categories'],
    queryFn: poiAPI.getCategories,
    staleTime: Infinity,
  });
}
