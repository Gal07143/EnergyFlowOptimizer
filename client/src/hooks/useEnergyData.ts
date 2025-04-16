import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { EnergyReading, EnergySummary, OptimizationRecommendation } from '@/types/energy';
import { useWebSocket } from './useWebSocket';

export function useLatestEnergyReading(siteId: number) {
  const { toast } = useToast();
  
  return useQuery({
    queryKey: ['/api/sites', siteId, 'energy-readings/latest'],
    refetchInterval: 30000, // Refresh every 30 seconds
    retry: true,
    onError: (error) => {
      toast({
        title: 'Error fetching energy data',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useEnergyReadings(siteId: number, limit: number = 100) {
  return useQuery({
    queryKey: ['/api/sites', siteId, 'energy-readings', { limit }],
    retry: true,
  });
}

export function useEnergyReadingsByTimeRange(
  siteId: number,
  startTime: Date,
  endTime: Date
) {
  return useQuery({
    queryKey: [
      '/api/sites', 
      siteId, 
      'energy-readings/timerange', 
      { 
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString() 
      }
    ],
    retry: true,
  });
}

export function useEnergySummary(siteId: number): EnergySummary | undefined {
  const { data: latestReading } = useLatestEnergyReading(siteId);
  
  if (!latestReading) return undefined;
  
  // Calculate summary data from latest reading
  return {
    currentPower: latestReading.gridPower + latestReading.solarPower + latestReading.batteryPower,
    todayConsumption: latestReading.homeEnergy + latestReading.evEnergy,
    solarProduction: latestReading.solarEnergy,
    selfSufficiency: latestReading.selfSufficiency,
    todaySavings: calculateSavings(latestReading),
    carbonSaved: latestReading.carbon,
  };
}

export function useCreateEnergyReading() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (reading: Partial<EnergyReading>) => {
      const response = await fetch('/api/energy-readings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reading),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText);
      }
      
      return await response.json();
    },
    onSuccess: (data, variables) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ 
        queryKey: ['/api/sites', variables.siteId, 'energy-readings']
      });
      queryClient.invalidateQueries({ 
        queryKey: ['/api/sites', variables.siteId, 'energy-readings/latest']
      });
      
      toast({
        title: 'Energy reading created',
        description: 'New energy data has been recorded',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error creating energy reading',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useRealTimeEnergyData(siteId: number) {
  const queryClient = useQueryClient();
  const { isConnected, subscribe, lastMessage } = useWebSocket({
    onOpen: () => {
      // Subscribe to site data on connection
      if (siteId) {
        subscribe(siteId);
      }
    },
    onMessage: (data) => {
      // Handle real-time energy updates
      if (data.type === 'energyReading' && data.data) {
        // Update cache with the latest reading
        queryClient.setQueryData(
          ['/api/sites', siteId, 'energy-readings/latest'],
          data.data
        );
        
        // Add to the list of readings
        queryClient.setQueryData(
          ['/api/sites', siteId, 'energy-readings'],
          (oldData: any) => {
            if (!oldData) return [data.data];
            return [data.data, ...oldData.slice(0, 99)]; // Keep the last 100 readings
          }
        );
      }
    },
  });
  
  return {
    isConnected,
    lastMessage,
    subscribe: () => subscribe(siteId),
  };
}

// Helper function to calculate savings
function calculateSavings(reading: EnergyReading): number {
  // This is a simplified calculation
  // In a real application, you would use actual tariff data
  
  // Assuming $0.20 per kWh for grid power
  // and we're saving by using solar or battery instead
  const solarSavings = reading.solarEnergy * 0.20;
  
  // If battery energy is negative, it means we're discharging
  // and using battery power instead of grid power
  const batteryDischarge = reading.batteryEnergy < 0 ? Math.abs(reading.batteryEnergy) : 0;
  const batterySavings = batteryDischarge * 0.20;
  
  return parseFloat((solarSavings + batterySavings).toFixed(2));
}
