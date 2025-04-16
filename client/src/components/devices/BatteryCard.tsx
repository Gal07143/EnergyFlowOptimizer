import { useState } from 'react';
import DeviceCard from './DeviceCard';
import { Device } from '@/types/devices';
import { useDeviceReadings } from '@/hooks/useDevices';
import { formatNumber } from '@/lib/utils/data-utils';
import { Progress } from '@/components/ui/progress';

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
      <div className="mt-4 grid grid-cols-2 gap-4">
        <div className="bg-gray-50 dark:bg-gray-800 rounded p-3">
          <p className="text-xs text-gray-500 dark:text-gray-400">State of Charge</p>
          <p className="text-lg font-semibold text-gray-900 dark:text-white">
            {formatNumber(stateOfCharge, 0)}%
          </p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800 rounded p-3">
          <p className="text-xs text-gray-500 dark:text-gray-400">Power Flow</p>
          <p className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
            {isCharging ? '+' : ''}
            {formatNumber(powerFlow, 1)} kW
          </p>
        </div>
      </div>

      {/* Battery Level Visualization */}
      <div className="mt-4 space-y-2">
        <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
          <span>0%</span>
          <span>50%</span>
          <span>100%</span>
        </div>
        <Progress value={stateOfCharge} className="h-3" />
      </div>
    </DeviceCard>
  );
}
