import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '../lib/queryClient';
import { DeviceTechnicalSpec } from '@shared/schema';

/**
 * Hook to fetch technical specifications for a device catalog entry
 */
export function useTechnicalSpecs(deviceCatalogId: number | null) {
  return useQuery({
    queryKey: ['device-technical-specs', deviceCatalogId],
    queryFn: async () => {
      if (!deviceCatalogId) return null;
      
      try {
        const response = await fetch(`/api/device-catalog/${deviceCatalogId}/technical-specs`);
        
        if (response.status === 404) {
          // No technical specifications found for this device model
          return null;
        }
        
        if (!response.ok) {
          throw new Error('Failed to fetch technical specifications');
        }
        
        return await response.json();
      } catch (error) {
        console.error('Error fetching technical specs:', error);
        return null;
      }
    },
    enabled: !!deviceCatalogId,
  });
}

/**
 * Hook to save technical specifications for a device catalog entry
 */
export function useSaveTechnicalSpecs() {
  return useMutation({
    mutationFn: async ({ deviceCatalogId, specs }: { 
      deviceCatalogId: number, 
      specs: {
        deviceCatalogId: number;
        errorMargin: string | null;
        selfConsumption: string | null;
        roundTripEfficiency: string | null;
        selfDischargeRate: string | null;
        temperatureCoefficient: string | null;
        degradationRate: string | null;
        chargingEfficiency: string | null;
        standbyPower: string | null;
        copAt7C: string | null;
        copAtMinus7C: string | null;
        refrigerantType: string | null;
        certifications: string | null;
        complianceStandards: string | null;
      } 
    }) => {
      const res = await apiRequest(
        'POST',
        `/api/device-catalog/${deviceCatalogId}/technical-specs`,
        specs
      );
      return await res.json();
    },
    onSuccess: (_data, variables) => {
      // Invalidate the cache for this device's technical specifications
      queryClient.invalidateQueries({ queryKey: ['device-technical-specs', variables.deviceCatalogId] });
    },
  });
}