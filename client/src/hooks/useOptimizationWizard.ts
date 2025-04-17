import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { toast } from '@/hooks/use-toast';
import { OptimizationSetting } from '@shared/schema';

export type OptimizationPreset = {
  id: string;
  name: string;
  description: string;
  benefits?: string[];
  requirements?: string[];
  estimatedSavings?: { percentage: number; note: string };
  mainFeatures?: string[];
  compatibilityScore?: number;
  compatibilityNotes?: string[];
  isCurrentlyActive?: boolean;
  iconType?: string;
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

export function useOptimizationPresets(options?: { siteId?: number, includeDeviceDetails?: boolean }) {
  const siteId = options?.siteId;
  const includeDeviceDetails = options?.includeDeviceDetails ?? true;
  
  // Include site ID and device details flags in the query string if provided
  const queryParams = new URLSearchParams();
  if (siteId) queryParams.append('siteId', String(siteId));
  if (includeDeviceDetails) queryParams.append('includeDeviceDetails', 'true');
  
  const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
  
  return useQuery<{ presets: OptimizationPreset[], deviceSummary?: any, currentSettings?: any }>({
    queryKey: ['/api/optimization/presets', { siteId, includeDeviceDetails }],
    select: (data) => {
      // For backward compatibility, if the API returns the new format, use it,
      // otherwise assume it's the old format which was just an array of presets
      if (data && 'presets' in data) {
        return data;
      } else {
        return { presets: data as unknown as OptimizationPreset[] };
      }
    }
  });
}

export function useOptimizationSettings(siteId?: number) {
  return useQuery<OptimizationSetting>({
    queryKey: ['/api/sites', siteId, 'optimization-settings'],
    enabled: !!siteId,
  });
}

export type OptimizationPresetApplyParams = {
  presetMode: string;
  deviceConfiguration?: any;
  customizationOptions?: Record<string, boolean>;
  scheduleAdjustments?: {
    batteryCharging?: Array<{ startTime: string; endTime: string; priority: string }>;
    batteryDischarging?: Array<{ startTime: string; endTime: string; priority: string }>;
    evCharging?: Array<{ startTime: string; endTime: string; priority: string }>;
  };
  priorityDevices?: string[];
  savingsGoal?: number;
};

export function useApplyOptimizationPreset(siteId?: number) {
  return useMutation<OptimizationResult, Error, OptimizationPresetApplyParams>({
    mutationFn: async (data) => {
      if (!siteId) throw new Error('Site ID is required');
      
      const res = await apiRequest(
        'POST',
        `/api/sites/${siteId}/optimization/apply-preset`,
        data
      );
      
      return await res.json();
    },
    onSuccess: (result) => {
      // Invalidate optimization settings query to refetch with new settings
      queryClient.invalidateQueries({ queryKey: ['/api/sites', siteId, 'optimization-settings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/optimization/presets'] });
      
      // Provide more detailed feedback based on the result
      const presetName = result.settings?.mode?.split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ') || 'Custom';
      
      toast({
        title: `${presetName} optimization strategy applied`,
        description: result.message || 'Your energy optimization strategy has been successfully updated.',
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