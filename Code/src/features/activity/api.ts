import { useQuery } from '@tanstack/react-query';
import { activityApi } from '@/api/endpoints';
import { keys } from '@/api/keys';

export const useActivity = (limit = 15) =>
  useQuery({ queryKey: keys.activity(limit), queryFn: () => activityApi.list(limit) });
