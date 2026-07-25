import { client } from '@api/client';
import {
  AiConversationDetail,
  AiConversationSummary,
  AiSearchResponse,
  type AiSearchRequest,
} from '@shared';
import { z } from 'zod';

export const aiAPI = {
  search: async (body: AiSearchRequest): Promise<AiSearchResponse> => {
    const res = await client.post('/api/ai/search', body);
    return AiSearchResponse.parse(res.data);
  },
  listConversations: async (): Promise<AiConversationSummary[]> => {
    const res = await client.get('/api/ai/conversations');
    return z.array(AiConversationSummary).parse(res.data);
  },
  getConversation: async (id: string): Promise<AiConversationDetail> => {
    const res = await client.get(`/api/ai/conversations/${id}`);
    return AiConversationDetail.parse(res.data);
  },
  deleteConversation: async (id: string): Promise<void> => {
    await client.delete(`/api/ai/conversations/${id}`);
  },
};
