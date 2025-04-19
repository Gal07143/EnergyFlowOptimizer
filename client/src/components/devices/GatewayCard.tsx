import { useState, useEffect } from 'react';
import DeviceCard from './DeviceCard';
import { Device } from '@/types/devices';
import { useDeviceReadings } from '@/hooks/useDevices';
import { formatNumber } from '@/lib/utils/data-utils';
import { Progress } from '@/components/ui/progress';
import { Signal, Activity, Wifi, Clock } from 'lucide-react';

// Extend DeviceReading type with gateway-specific fields
declare module '@/types/devices' {
  interface DeviceReading {
    signalStrength?: number;
    connectedDevices?: number;
    packetLoss?: number;
    latency?: number;
  }
}

interface GatewayCardProps {
  device: Device;
}

export default function GatewayCard({ device }: GatewayCardProps) {
  const { data: readings } = useDeviceReadings(device.id, 5);
  const [uptime, setUptime] = useState<number>(0);
  
  // Simulate increasing uptime for demonstration
  useEffect(() => {
    const timer = setInterval(() => {
      setUptime(prev => {
        if (prev < 100) return prev + 0.01;
        return 0;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);
  
  // Extract current data from readings
  const latestReading = readings && readings.length > 0 ? readings[0] : null;
  
  // Signal strength (RSSI) - typical range: -30 dBm (excellent) to -90 dBm (poor)
  const signalStrength = latestReading?.signalStrength !== undefined 
    ? latestReading.signalStrength 
    : -65; // Default value
  
  // Signal quality as percentage (transform -90 to -30 range to 0-100%)
  const signalQualityPercent = Math.min(100, Math.max(0, ((signalStrength + 90) / 60) * 100));
  
  // Connected devices
  const connectedDevices = latestReading?.connectedDevices || 5;
  
  // Packet loss percentage
  const packetLoss = latestReading?.packetLoss !== undefined 
    ? latestReading.packetLoss 
    : 0.8; // Default value
  
  // Latency in milliseconds
  const latency = latestReading?.latency !== undefined 
    ? latestReading.latency 
    : 28; // Default value

  // Get signal quality label
  const getSignalQualityLabel = () => {
    if (signalQualityPercent >= 80) return 'Excellent';
    if (signalQualityPercent >= 60) return 'Good';
    if (signalQualityPercent >= 40) return 'Fair';
    if (signalQualityPercent >= 20) return 'Poor';
    return 'Very Poor';
  };

  // Get signal color
  const getSignalColor = () => {
    if (signalQualityPercent >= 80) return 'bg-green-500';
    if (signalQualityPercent >= 60) return 'bg-blue-500';
    if (signalQualityPercent >= 40) return 'bg-yellow-500';
    if (signalQualityPercent >= 20) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <DeviceCard device={device}>
      {/* Signal Strength Indicator */}
      <div className="mt-4 space-y-2">
        <div className="flex justify-between items-center">
          <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
            <Signal className="h-4 w-4 mr-1" />
            <span>Signal Strength</span>
          </div>
          <span className="text-xs font-medium">{formatNumber(signalStrength, 0)} dBm ({getSignalQualityLabel()})</span>
        </div>
        <Progress 
          value={signalQualityPercent} 
          className={`h-2 ${
            signalQualityPercent >= 80 ? 'bg-green-100 [&>div]:bg-green-500' :
            signalQualityPercent >= 60 ? 'bg-blue-100 [&>div]:bg-blue-500' :
            signalQualityPercent >= 40 ? 'bg-yellow-100 [&>div]:bg-yellow-500' :
            signalQualityPercent >= 20 ? 'bg-orange-100 [&>div]:bg-orange-500' :
            'bg-red-100 [&>div]:bg-red-500'
          }`}
        />
      </div>

      {/* Connection Stats */}
      <div className="mt-4 grid grid-cols-2 gap-4">
        <div className="bg-gray-50 dark:bg-gray-800 rounded p-3">
          <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mb-1">
            <Wifi className="h-3 w-3 mr-1" />
            <span>Connected Devices</span>
          </div>
          <p className="text-lg font-semibold text-gray-900 dark:text-white">
            {connectedDevices}
          </p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800 rounded p-3">
          <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mb-1">
            <Clock className="h-3 w-3 mr-1" />
            <span>Uptime</span>
          </div>
          <p className="text-lg font-semibold text-gray-900 dark:text-white">
            {Math.floor(uptime)}d {Math.floor((uptime % 1) * 24)}h
          </p>
        </div>
      </div>

      {/* Network Performance */}
      <div className="mt-4 flex justify-between text-xs text-gray-500 dark:text-gray-400">
        <div className="flex items-center">
          <Activity className="h-3 w-3 mr-1" />
          <span>Latency: {formatNumber(latency, 0)} ms</span>
        </div>
        <span>Packet Loss: {formatNumber(packetLoss, 1)}%</span>
      </div>
    </DeviceCard>
  );
}