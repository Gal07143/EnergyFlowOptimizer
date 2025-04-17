import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';

// Define device types
export interface Device {
  id: number;
  siteId: number;
  name: string;
  type: string;
  model: string;
  manufacturer: string;
  serialNumber: string;
  firmwareVersion: string;
  protocol: string;
  ipAddress: string;
  port: number;
  path: string;
  connectionStatus: string;
  lastConnectionTime: string;
  capabilities: Record<string, unknown>;
  configuration: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

type DeviceType = 'solar_pv' | 'battery_storage' | 'ev_charger' | 'smart_meter' | 'heat_pump' | 'gateway' | 'generic';

export type InsertDevice = Omit<Device, 'id' | 'createdAt' | 'updatedAt'>;

// Get all devices
export function useDevices() {
  return useQuery<Device[]>({
    queryKey: ['/api/devices'],
  });
}

// Get device by ID
export function useDevice(deviceId: number | undefined) {
  return useQuery<Device>({
    queryKey: ['/api/devices', deviceId],
    enabled: !!deviceId,
  });
}

// Get devices by site
export function useDevicesBySite(siteId: number | undefined) {
  return useQuery<Device[]>({
    queryKey: ['/api/sites', siteId, 'devices'],
    enabled: !!siteId,
  });
}

// Get devices by type
export function useDevicesByType(type: DeviceType | undefined) {
  return useQuery<Device[]>({
    queryKey: ['/api/devices/type', type],
    enabled: !!type,
  });
}

// Add a new device
export function useAddDevice() {
  return useMutation({
    mutationFn: async (device: InsertDevice) => {
      const response = await apiRequest('POST', '/api/devices', device);
      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/devices'] });
      queryClient.invalidateQueries({ queryKey: ['/api/sites', data.siteId, 'devices'] });
      queryClient.invalidateQueries({ queryKey: ['/api/devices/type', data.type] });
    },
  });
}

// Update a device
export function useUpdateDevice() {
  return useMutation({
    mutationFn: async ({ 
      deviceId, 
      deviceData 
    }: { 
      deviceId: number; 
      deviceData: Partial<InsertDevice>
    }) => {
      const response = await apiRequest('PUT', `/api/devices/${deviceId}`, deviceData);
      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/devices'] });
      queryClient.invalidateQueries({ queryKey: ['/api/devices', data.id] });
      queryClient.invalidateQueries({ queryKey: ['/api/sites', data.siteId, 'devices'] });
      queryClient.invalidateQueries({ queryKey: ['/api/devices/type', data.type] });
    },
  });
}

// Delete a device
export function useDeleteDevice() {
  return useMutation({
    mutationFn: async ({ 
      deviceId,
      siteId,
      deviceType
    }: { 
      deviceId: number;
      siteId: number;
      deviceType: string;
    }) => {
      const response = await apiRequest('DELETE', `/api/devices/${deviceId}`);
      return await response.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/devices'] });
      queryClient.invalidateQueries({ queryKey: ['/api/devices', variables.deviceId] });
      queryClient.invalidateQueries({ queryKey: ['/api/sites', variables.siteId, 'devices'] });
      queryClient.invalidateQueries({ queryKey: ['/api/devices/type', variables.deviceType] });
    },
  });
}

// OCPP-specific functions for EV chargers
export function useStartCharging() {
  return useMutation({
    mutationFn: async ({ 
      deviceId, 
      connectorId,
      tagId 
    }: { 
      deviceId: number; 
      connectorId: number;
      tagId?: string;
    }) => {
      const response = await apiRequest('POST', `/api/devices/${deviceId}/ocpp/start`, {
        connectorId,
        tagId
      });
      return await response.json();
    },
  });
}

export function useStopCharging() {
  return useMutation({
    mutationFn: async ({ 
      deviceId, 
      connectorId 
    }: { 
      deviceId: number; 
      connectorId: number;
    }) => {
      const response = await apiRequest('POST', `/api/devices/${deviceId}/ocpp/stop`, {
        connectorId
      });
      return await response.json();
    },
  });
}

// EEBus-specific functions for heat pumps
export function useSetHeatPumpMode() {
  return useMutation({
    mutationFn: async ({ 
      deviceId, 
      mode 
    }: { 
      deviceId: number; 
      mode: 'heating' | 'cooling' | 'auto' | 'off';
    }) => {
      const response = await apiRequest('POST', `/api/devices/${deviceId}/eebus/mode`, {
        mode
      });
      return await response.json();
    },
  });
}

export function useSetTargetTemperature() {
  return useMutation({
    mutationFn: async ({ 
      deviceId, 
      temperature 
    }: { 
      deviceId: number; 
      temperature: number;
    }) => {
      const response = await apiRequest('POST', `/api/devices/${deviceId}/eebus/temperature`, {
        temperature
      });
      return await response.json();
    },
  });
}