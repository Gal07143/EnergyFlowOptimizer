import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { 
  Device, 
  DeviceReading, 
  DeviceSummary,
  DeviceControlAction
} from '@/types/devices';
import { useWebSocket } from './useWebSocket';

// Get all devices for a site
export function useDevices(siteId: number) {
  return useQuery({
    queryKey: ['/api/sites', siteId, 'devices'],
    enabled: !!siteId,
  });
}

// Get devices by type
export function useDevicesByType(siteId: number, type: string) {
  return useQuery({
    queryKey: ['/api/sites', siteId, 'devices/type', type],
    enabled: !!siteId && !!type,
  });
}

// Get a single device
export function useDevice(deviceId: number | undefined) {
  return useQuery({
    queryKey: ['/api/devices', deviceId],
    enabled: !!deviceId,
  });
}

// Get device readings
export function useDeviceReadings(deviceId: number | undefined, limit: number = 100) {
  return useQuery({
    queryKey: ['/api/devices', deviceId, 'readings', { limit }],
    enabled: !!deviceId,
  });
}

// Get device readings for a time range
export function useDeviceReadingsByTimeRange(
  deviceId: number | undefined,
  startTime: Date,
  endTime: Date
) {
  return useQuery({
    queryKey: [
      '/api/devices', 
      deviceId, 
      'readings/timerange', 
      { 
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString() 
      }
    ],
    enabled: !!deviceId,
  });
}

// Create a new device
export function useCreateDevice() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (device: Partial<Device>) => {
      const response = await apiRequest('POST', '/api/devices', device);
      return await response.json();
    },
    onSuccess: (data, variables) => {
      // Invalidate the devices query to refetch the list
      queryClient.invalidateQueries({ 
        queryKey: ['/api/sites', variables.siteId, 'devices']
      });
      queryClient.invalidateQueries({ 
        queryKey: ['/api/sites', variables.siteId, 'devices/type', variables.type]
      });
      
      toast({
        title: 'Device created',
        description: `${data.name} has been added to your system`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Error creating device',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// Update a device
export function useUpdateDevice() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async ({ id, ...device }: Partial<Device> & { id: number }) => {
      const response = await apiRequest('PUT', `/api/devices/${id}`, device);
      return await response.json();
    },
    onSuccess: (data) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ 
        queryKey: ['/api/devices', data.id]
      });
      queryClient.invalidateQueries({ 
        queryKey: ['/api/sites', data.siteId, 'devices']
      });
      queryClient.invalidateQueries({ 
        queryKey: ['/api/sites', data.siteId, 'devices/type', data.type]
      });
      
      toast({
        title: 'Device updated',
        description: `${data.name} has been updated`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Error updating device',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// Delete a device
export function useDeleteDevice() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async ({ id, siteId, type }: { id: number; siteId: number; type: string }) => {
      await apiRequest('DELETE', `/api/devices/${id}`, undefined);
      return { id, siteId, type };
    },
    onSuccess: (data) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ 
        queryKey: ['/api/sites', data.siteId, 'devices']
      });
      queryClient.invalidateQueries({ 
        queryKey: ['/api/sites', data.siteId, 'devices/type', data.type]
      });
      
      toast({
        title: 'Device deleted',
        description: 'The device has been removed from your system',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error deleting device',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// Create a device reading
export function useCreateDeviceReading() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (reading: Partial<DeviceReading>) => {
      const response = await apiRequest('POST', '/api/devices/readings', reading);
      return await response.json();
    },
    onSuccess: (data) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ 
        queryKey: ['/api/devices', data.deviceId, 'readings']
      });
    },
  });
}

// Subscribe to real-time device updates
export function useRealTimeDeviceData(deviceId: number | undefined) {
  const queryClient = useQueryClient();
  const { isConnected, subscribe, unsubscribe, lastMessage } = useWebSocket({
    onOpen: () => {
      // Subscribe to device data on connection
      if (deviceId) {
        subscribe(0, deviceId); // 0 for siteId means we're only interested in the device
      }
    },
    onMessage: (data) => {
      // Handle real-time device updates
      if (data.type === 'deviceReading' && data.data && data.data.deviceId === deviceId) {
        // Add to the list of readings
        queryClient.setQueryData(
          ['/api/devices', deviceId, 'readings'],
          (oldData: any) => {
            if (!oldData) return [data.data];
            return [data.data, ...oldData.slice(0, 99)]; // Keep the last 100 readings
          }
        );
      }
    },
  });
  
  // Update subscription when deviceId changes
  if (deviceId && isConnected) {
    subscribe(0, deviceId);
  }
  
  return {
    isConnected,
    lastMessage,
    subscribe: () => deviceId && subscribe(0, deviceId),
    unsubscribe: () => deviceId && unsubscribe(0, deviceId),
  };
}

// Send a control command to a device
export function useDeviceControl() {
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (action: DeviceControlAction) => {
      const response = await apiRequest('POST', `/api/devices/${action.deviceId}/control`, {
        action: action.action,
        parameters: action.parameters
      });
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Command sent',
        description: 'The device control command was sent successfully',
      });
      return data;
    },
    onError: (error) => {
      toast({
        title: 'Command failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// Helper to transform device data into summaries
export function useDeviceSummaries(siteId: number): DeviceSummary[] {
  const { data: devices } = useDevices(siteId);
  
  if (!devices) {
    return [];
  }
  
  return devices.map(device => {
    const summary: DeviceSummary = {
      id: device.id,
      name: device.name,
      type: device.type,
      status: device.status,
    };
    
    // Add type-specific fields
    if (device.type === 'solar_pv') {
      summary.currentOutput = 0; // This would come from the latest reading
      summary.dailyEnergy = 0;
    } else if (device.type === 'battery_storage') {
      summary.stateOfCharge = 0;
      summary.currentOutput = 0;
    } else if (device.type === 'ev_charger') {
      summary.currentOutput = 0;
      summary.stateOfCharge = 0;
    }
    
    return summary;
  });
}
