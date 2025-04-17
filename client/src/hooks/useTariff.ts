import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';

export function useSiteTariffs(siteId: number | undefined) {
  return useQuery({
    queryKey: ['/api/sites', siteId, 'tariffs'],
    queryFn: async () => {
      if (!siteId) return null;
      const response = await fetch(`/api/sites/${siteId}/tariffs`);
      if (!response.ok) {
        throw new Error('Failed to fetch tariffs data');
      }
      return response.json();
    },
    enabled: !!siteId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useSiteTariff(siteId: number | undefined) {
  return useQuery({
    queryKey: ['/api/sites', siteId, 'tariff'],
    queryFn: async () => {
      if (!siteId) return null;
      const response = await fetch(`/api/sites/${siteId}/tariff`);
      if (!response.ok) {
        throw new Error('Failed to fetch tariff data');
      }
      return response.json();
    },
    enabled: !!siteId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useCurrentTariffRate(siteId: number | undefined) {
  return useQuery({
    queryKey: ['/api/sites', siteId, 'tariff', 'rate'],
    queryFn: async () => {
      if (!siteId) return null;
      const response = await fetch(`/api/sites/${siteId}/tariff/rate`);
      if (!response.ok) {
        throw new Error('Failed to fetch current tariff rate');
      }
      return response.json();
    },
    enabled: !!siteId,
    refetchInterval: 60 * 1000, // Refresh every minute
  });
}

export function useCreateIsraeliTariff(siteId: number | undefined) {
  return useMutation({
    mutationFn: async () => {
      if (!siteId) throw new Error('Site ID is required');
      const response = await fetch(`/api/sites/${siteId}/tariff/israeli`, {
        method: 'POST',
      });
      if (!response.ok) {
        throw new Error('Failed to create Israeli tariff');
      }
      return response.json();
    },
    onSuccess: () => {
      // Invalidate tariff-related queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/sites', siteId, 'tariff'] });
      queryClient.invalidateQueries({ queryKey: ['/api/sites', siteId, 'tariffs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/sites', siteId, 'tariff', 'rate'] });
    },
  });
}

export function useDeleteTariff() {
  return useMutation({
    mutationFn: async (params: { tariffId: number; siteId: number }) => {
      const { tariffId, siteId } = params;
      if (!tariffId) throw new Error('Tariff ID is required');
      
      const response = await fetch(`/api/tariffs/${tariffId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete tariff');
      }
      
      return response.json();
    },
    onSuccess: (_data, variables) => {
      const { siteId } = variables;
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['/api/sites', siteId, 'tariff'] });
      queryClient.invalidateQueries({ queryKey: ['/api/sites', siteId, 'tariffs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/sites', siteId, 'tariff', 'rate'] });
    },
  });
}