import { poiAPI } from '@api/poi';
import { useQuery } from '@tanstack/react-query';

export function usePoiCategories() {
  return useQuery({
    queryKey: ['poi', 'categories'],
    queryFn: poiAPI.getCategories,
    staleTime: Infinity,
  });
}
