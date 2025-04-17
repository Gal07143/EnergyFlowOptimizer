import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

// Device type definition matching server schema
export interface Device {
  id: number;
  siteId: number;
  name: string;
  type: string;
  model?: string;
  manufacturer?: string;
  serialNumber?: string;
  firmwareVersion?: string;
  protocol?: string;
  connectionParams?: Record<string, any>;
  capacity?: number;
  status?: string;
  lastSeen?: string;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, any>;
}

export interface DeviceReading {
  id: number;
  deviceId: number;
  timestamp: string;
  readingType: string;
  value: number;
  unit: string;
  quality?: string;
  createdAt: string;
}

export type DeviceCreateInput = Omit<Device, 'id' | 'createdAt' | 'updatedAt'>;
export type DeviceUpdateInput = Partial<Omit<Device, 'id' | 'createdAt' | 'updatedAt'>>;

/**
 * Hook to fetch all devices
 */
export function useDevices() {
  const { toast } = useToast();

  return useQuery<Device[]>({
    queryKey: ['/api/devices'],
    staleTime: 60000,
    onSuccess: (data) => {
      console.log('Devices loaded:', data.length);
    },
    onError: (error) => {
      toast({
        title: 'Error loading devices',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to fetch a single device by ID
 */
export function useDevice(id: number | undefined) {
  const { toast } = useToast();

  return useQuery<Device>({
    queryKey: ['/api/devices', id],
    enabled: !!id,
    onError: (error: Error) => {
      toast({
        title: 'Error loading device',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to fetch devices by site ID
 */
export function useDevicesBySite(siteId: number | undefined) {
  const { toast } = useToast();

  return useQuery<Device[]>({
    queryKey: ['/api/sites', siteId, 'devices'],
    enabled: !!siteId,
    onError: (error: Error) => {
      toast({
        title: 'Error loading site devices',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to fetch devices by type for a specific site
 */
export function useDevicesByType(siteId: number | undefined, type: string) {
  const { toast } = useToast();

  return useQuery<Device[]>({
    queryKey: ['/api/sites', siteId, 'devices', 'type', type],
    enabled: !!siteId && !!type,
    onError: (error: Error) => {
      toast({
        title: 'Error loading devices by type',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to fetch device readings
 */
export function useDeviceReadings(deviceId: number | undefined, limit?: number) {
  const { toast } = useToast();

  return useQuery<DeviceReading[]>({
    queryKey: ['/api/devices', deviceId, 'readings', { limit }],
    enabled: !!deviceId,
    onError: (error: Error) => {
      toast({
        title: 'Error loading device readings',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to create a new device
 */
export function useCreateDevice() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (device: DeviceCreateInput) => {
      const response = await apiRequest('POST', '/api/devices', device);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Device created',
        description: 'The device has been created successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/devices'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error creating device',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to update an existing device
 */
export function useUpdateDevice() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, device }: { id: number; device: DeviceUpdateInput }) => {
      const response = await apiRequest('PATCH', `/api/devices/${id}`, device);
      return response.json();
    },
    onSuccess: (_, variables) => {
      toast({
        title: 'Device updated',
        description: 'The device has been updated successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/devices'] });
      queryClient.invalidateQueries({ queryKey: ['/api/devices', variables.id] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error updating device',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to delete a device
 */
export function useDeleteDevice() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest('DELETE', `/api/devices/${id}`);
      return response.ok;
    },
    onSuccess: () => {
      toast({
        title: 'Device deleted',
        description: 'The device has been deleted successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/devices'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error deleting device',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook to send a command to a device
 */
export function useSendDeviceCommand() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ deviceId, command, params }: { deviceId: number; command: string; params?: Record<string, any> }) => {
      const response = await apiRequest('POST', `/api/devices/${deviceId}/commands`, { command, params });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Command sent',
        description: 'The command has been sent to the device',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error sending command',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}