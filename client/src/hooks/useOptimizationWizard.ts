import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { toast } from '@/hooks/use-toast';
import { OptimizationSetting } from '@shared/schema';

export type OptimizationPreset = {
  id: string;
  name: string;
  description: string;
  mode: 'cost_saving' | 'self_sufficiency' | 'peak_shaving' | 'carbon_reduction' | 'grid_relief';
  peakShavingEnabled: boolean;
  peakShavingTarget: number | null;
  selfConsumptionEnabled: boolean;
  batteryArbitrageEnabled: boolean;
  v2gEnabled: boolean;
  vppEnabled: boolean;
  p2pEnabled: boolean;
  demandResponseEnabled: boolean;
  aiRecommendationsEnabled: boolean;
  schedules: {
    batteryCharging?: Array<{ startTime: string; endTime: string; priority: string }>;
    batteryDischarging?: Array<{ startTime: string; endTime: string; priority: string }>;
    evCharging?: Array<{ startTime: string; endTime: string; priority: string }>;
  };
};

export type OptimizationResult = {
  success: boolean;
  message: string;
  settings: OptimizationSetting;
};

export function useOptimizationPresets() {
  return useQuery<OptimizationPreset[]>({
    queryKey: ['/api/optimization/presets'],
  });
}

export function useOptimizationSettings(siteId?: number) {
  return useQuery<OptimizationSetting>({
    queryKey: ['/api/sites', siteId, 'optimization-settings'],
    enabled: !!siteId,
  });
}

export function useApplyOptimizationPreset(siteId?: number) {
  return useMutation<OptimizationResult, Error, { presetMode: string; deviceConfiguration?: any }>({
    mutationFn: async (data) => {
      if (!siteId) throw new Error('Site ID is required');
      
      const res = await apiRequest(
        'POST',
        `/api/sites/${siteId}/optimization/apply-preset`,
        data
      );
      
      return await res.json();
    },
    onSuccess: () => {
      // Invalidate optimization settings query to refetch with new settings
      queryClient.invalidateQueries({ queryKey: ['/api/sites', siteId, 'optimization-settings'] });
      
      toast({
        title: 'Optimization settings updated',
        description: 'Your energy optimization strategy has been successfully updated.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Failed to update optimization settings',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}