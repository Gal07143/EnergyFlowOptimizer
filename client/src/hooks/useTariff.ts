import { useQuery } from '@tanstack/react-query';

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
  return useQuery({
    queryKey: ['/api/sites', siteId, 'tariff', 'israeli'],
    queryFn: async () => {
      if (!siteId) return null;
      const response = await fetch(`/api/sites/${siteId}/tariff/israeli`, {
        method: 'POST',
      });
      if (!response.ok) {
        throw new Error('Failed to create Israeli tariff');
      }
      return response.json();
    },
    enabled: false, // Only run when manually triggered
  });
}