import { client } from '@api/client';
import { AiSearchResponse, type AiSearchRequest } from '@shared';

export const aiAPI = {
  search: async (body: AiSearchRequest): Promise<AiSearchResponse> => {
    const res = await client.post('/api/ai/search', body);
    return AiSearchResponse.parse(res.data);
  },
};
