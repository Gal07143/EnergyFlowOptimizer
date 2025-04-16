import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { OptimizationSettings, OptimizationRecommendation, Tariff } from '@/types/energy';
import { useWebSocket } from './useWebSocket';

// Get optimization settings for a site
export function useOptimizationSettings(siteId: number) {
  return useQuery({
    queryKey: ['/api/sites', siteId, 'optimization-settings'],
    enabled: !!siteId,
  });
}

// Update optimization settings
export function useUpdateOptimizationSettings() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async ({ 
      siteId, 
      ...settings 
    }: Partial<OptimizationSettings> & { siteId: number }) => {
      const response = await apiRequest(
        'PUT', 
        `/api/sites/${siteId}/optimization-settings`, 
        settings
      );
      return await response.json();
    },
    onSuccess: (data) => {
      // Invalidate the query to refetch the latest settings
      queryClient.invalidateQueries({ 
        queryKey: ['/api/sites', data.siteId, 'optimization-settings']
      });
      
      toast({
        title: 'Settings updated',
        description: 'Optimization settings have been updated',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error updating settings',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// Get tariffs for a site
export function useTariffs(siteId: number) {
  return useQuery({
    queryKey: ['/api/sites', siteId, 'tariffs'],
    enabled: !!siteId,
  });
}

// Create a tariff
export function useCreateTariff() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (tariff: Partial<Tariff>) => {
      const response = await apiRequest('POST', '/api/tariffs', tariff);
      return await response.json();
    },
    onSuccess: (data) => {
      // Invalidate the query to refetch the list
      queryClient.invalidateQueries({ 
        queryKey: ['/api/sites', data.siteId, 'tariffs']
      });
      
      toast({
        title: 'Tariff created',
        description: `${data.name} has been added`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Error creating tariff',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// Update a tariff
export function useUpdateTariff() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async ({ id, ...tariff }: Partial<Tariff> & { id: number }) => {
      const response = await apiRequest('PUT', `/api/tariffs/${id}`, tariff);
      return await response.json();
    },
    onSuccess: (data) => {
      // Invalidate the query to refetch the latest data
      queryClient.invalidateQueries({ 
        queryKey: ['/api/sites', data.siteId, 'tariffs']
      });
      queryClient.invalidateQueries({ 
        queryKey: ['/api/tariffs', data.id]
      });
      
      toast({
        title: 'Tariff updated',
        description: `${data.name} has been updated`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Error updating tariff',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// Apply an optimization strategy
export function useApplyOptimizationStrategy() {
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async ({ 
      siteId, 
      strategyId, 
      parameters 
    }: { 
      siteId: number; 
      strategyId: string; 
      parameters?: any 
    }) => {
      const response = await apiRequest(
        'POST', 
        `/api/sites/${siteId}/optimization/apply`, 
        {
          strategyId,
          parameters
        }
      );
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Strategy applied',
        description: 'The optimization strategy is now active',
      });
    },
    onError: (error) => {
      toast({
        title: 'Strategy failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// Subscribe to real-time optimization recommendations
export function useOptimizationRecommendations(siteId: number) {
  const [recommendations, setRecommendations] = useState<OptimizationRecommendation[]>([]);
  
  const { isConnected, subscribe } = useWebSocket({
    onOpen: () => {
      // Subscribe to site data on connection
      if (siteId) {
        subscribe(siteId);
      }
    },
    onMessage: (data) => {
      // Handle optimization recommendations
      if (data.type === 'optimizationRecommendation' && data.data) {
        setRecommendations(data.data);
      }
    },
  });
  
  // Update subscription when siteId changes
  useEffect(() => {
    if (siteId && isConnected) {
      subscribe(siteId);
    }
  }, [siteId, isConnected, subscribe]);
  
  return {
    recommendations,
    isConnected
  };
}
