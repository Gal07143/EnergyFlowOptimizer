import { useState } from 'react';
import DeviceCard from './DeviceCard';
import { Device } from '@/types/devices';
import { useDeviceReadings } from '@/hooks/useDevices';
import { formatNumber } from '@/lib/utils/data-utils';
import { Progress } from '@/components/ui/progress';
import { Battery, BatteryCharging, BatteryWarning, Zap, Clock } from 'lucide-react';

interface BatteryCardProps {
  device: Device;
}

export default function BatteryCard({ device }: BatteryCardProps) {
  const { data: readings } = useDeviceReadings(device.id, 1);
  const latestReading = readings && readings.length > 0 ? readings[0] : null;
  
  // State of charge and power flow (positive for charging, negative for discharging)
  const stateOfCharge = latestReading?.stateOfCharge !== undefined 
    ? latestReading.stateOfCharge 
    : 82; // Default value for display
  
  const powerFlow = latestReading?.power !== undefined 
    ? latestReading.power 
    : -2.8; // Default value for display
  
  const isCharging = powerFlow > 0;

  return (
    <DeviceCard device={device}>
      {/* Battery SOC Visualization */}
      <div className="mt-4 flex items-center space-x-4">
        <div className="relative flex-shrink-0">
          {isCharging ? (
            <BatteryCharging className="w-12 h-12 text-green-500" />
          ) : stateOfCharge < 20 ? (
            <BatteryWarning className="w-12 h-12 text-red-500" />
          ) : (
            <Battery className="w-12 h-12 text-blue-500" />
          )}
        </div>
        
        <div className="flex-grow">
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm font-medium">
              {isCharging ? 'Charging' : 'Discharging'}
            </span>
            <span className="text-sm font-bold">{formatNumber(stateOfCharge, 0)}%</span>
          </div>
          <Progress 
            value={stateOfCharge} 
            className="h-3" 
            style={{ 
              background: 'rgba(0,0,0,0.1)',
              // Apply gradient based on SOC value
              '--tw-gradient-from': stateOfCharge < 20 ? '#ef4444' : 
                                   stateOfCharge < 50 ? '#f59e0b' : '#10b981',
              '--tw-gradient-stops': 'var(--tw-gradient-from)',
            }}
          />
        </div>
      </div>

      {/* Battery Stats */}
      <div className="mt-4 grid grid-cols-2 gap-4">
        <div className="bg-gray-50 dark:bg-gray-800 rounded p-3">
          <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mb-1">
            <Zap className="h-3 w-3 mr-1" />
            <span>Power Flow</span>
          </div>
          <p className={`text-lg font-semibold flex items-center ${isCharging ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'}`}>
            {isCharging ? '+' : ''}
            {formatNumber(Math.abs(powerFlow), 1)} kW
          </p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800 rounded p-3">
          <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mb-1">
            <Clock className="h-3 w-3 mr-1" />
            <span>{isCharging ? 'Time to Full' : 'Runtime Left'}</span>
          </div>
          <p className="text-lg font-semibold text-gray-900 dark:text-white">
            {isCharging 
              ? `${formatNumber((100 - stateOfCharge) / 100 * device.capacity / Math.abs(powerFlow), 1)}h` 
              : `${formatNumber(stateOfCharge / 100 * device.capacity / Math.abs(powerFlow), 1)}h`}
          </p>
        </div>
      </div>
      
      {/* Health Stats */}
      <div className="mt-4 flex justify-between text-xs">
        <span className="text-gray-500 dark:text-gray-400">
          Health: {formatNumber(latestReading?.batteryHealth || 98, 0)}%
        </span>
        <span className="text-gray-500 dark:text-gray-400">
          Cycles: {formatNumber(latestReading?.batteryCycles || 123, 0)}
        </span>
        <span className="text-gray-500 dark:text-gray-400">
          Temp: {formatNumber(latestReading?.temperature || 25, 0)}°C
        </span>
      </div>
    </DeviceCard>
  );
}
