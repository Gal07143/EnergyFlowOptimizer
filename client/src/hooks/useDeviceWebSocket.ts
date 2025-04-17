import { useState, useEffect, useCallback } from 'react';
import { useWebSocketContext } from '@/hooks/WebSocketProvider';

// Interface for device readings
export interface DeviceReading {
  deviceId: number;
  timestamp: string;
  power?: number;
  energy?: number;
  voltage?: number;
  temperature?: number;
  stateOfCharge?: number;
  frequency?: number;
  additionalData?: Record<string, any>;
}

export function useDeviceWebSocket(deviceId: number, maxReadings = 50) {
  // Store readings and latest reading
  const [readings, setReadings] = useState<DeviceReading[]>([]);
  const [latestReading, setLatestReading] = useState<DeviceReading | null>(null);
  
  // Get the WebSocket context
  const wsContext = useWebSocketContext();
  
  // Handle new device readings
  const handleDeviceReading = useCallback((data: DeviceReading) => {
    setLatestReading(data);
    setReadings(prevReadings => {
      // Limit to maxReadings
      const updatedReadings = [data, ...prevReadings].slice(0, maxReadings);
      return updatedReadings;
    });
  }, [maxReadings]);
  
  // Register for device readings
  useEffect(() => {
    if (deviceId) {
      // Subscribe to the device
      wsContext.subscribeDevice(deviceId);
      
      // Set up handler for device readings
      const unsubscribe = wsContext.registerHandler('deviceReading', (data: any) => {
        if (data && data.deviceId === deviceId) {
          handleDeviceReading(data);
        }
      });
      
      // Clean up on unmount
      return () => {
        wsContext.unsubscribeDevice();
        unsubscribe();
      };
    }
  }, [deviceId, wsContext, handleDeviceReading]);
  
  return {
    readings,
    latestReading,
    isConnected: wsContext.isConnected
  };
}