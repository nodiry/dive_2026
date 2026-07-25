import { client } from '@api/client';
import { HousingAlert, HousingAlertStats } from '@shared';
import { z } from 'zod';

export const alertsAPI = {
  listMine: async (): Promise<HousingAlert[]> => {
    const res = await client.get('/api/alerts/me');
    return z.array(HousingAlert).parse(res.data);
  },
  subscribe: async (messageId: string): Promise<HousingAlert> => {
    const res = await client.post('/api/alerts', { messageId });
    return HousingAlert.parse(res.data);
  },
  cancel: async (alertId: number): Promise<void> => {
    await client.delete(`/api/alerts/${alertId}`);
  },
  stats: async (): Promise<HousingAlertStats> => {
    const res = await client.get('/api/alerts/stats');
    return HousingAlertStats.parse(res.data);
  },
};
