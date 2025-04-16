import { useState } from 'react';
import DeviceCard from './DeviceCard';
import { Device } from '@/types/devices';
import { useDeviceReadings, useDeviceControl } from '@/hooks/useDevices';
import { formatNumber } from '@/lib/utils/data-utils';
import { Button } from '@/components/ui/button';

interface EVChargerCardProps {
  device: Device;
}

export default function EVChargerCard({ device }: EVChargerCardProps) {
  const { data: readings } = useDeviceReadings(device.id, 1);
  const { mutate: sendCommand } = useDeviceControl();
  
  const [activeMode, setActiveMode] = useState<string>('solar_only');

  const latestReading = readings && readings.length > 0 ? readings[0] : null;
  
  // Get charging power and EV battery state
  const chargingPower = latestReading?.power !== undefined 
    ? latestReading.power 
    : 7.4; // Default value for display
    
  const evBatterySOC = latestReading?.stateOfCharge !== undefined 
    ? latestReading.stateOfCharge 
    : 67; // Default value for display

  const handleModeChange = (mode: string) => {
    setActiveMode(mode);
    sendCommand({
      deviceId: device.id,
      action: 'setChargingMode',
      parameters: { mode }
    });
  };

  return (
    <DeviceCard device={device}>
      <div className="mt-4 grid grid-cols-2 gap-4">
        <div className="bg-gray-50 dark:bg-gray-800 rounded p-3">
          <p className="text-xs text-gray-500 dark:text-gray-400">Charging Power</p>
          <p className="text-lg font-semibold text-gray-900 dark:text-white">
            {formatNumber(chargingPower, 1)} kW
          </p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800 rounded p-3">
          <p className="text-xs text-gray-500 dark:text-gray-400">EV Battery</p>
          <p className="text-lg font-semibold text-gray-900 dark:text-white">
            {formatNumber(evBatterySOC, 0)}% SoC
          </p>
        </div>
      </div>

      {/* EV Mode Controls */}
      <div className="mt-4 flex space-x-2">
        <Button 
          size="sm" 
          className="flex-1 py-2 text-xs" 
          variant={activeMode === 'solar_only' ? 'default' : 'outline'}
          onClick={() => handleModeChange('solar_only')}
        >
          Solar Only
        </Button>
        <Button 
          size="sm" 
          className="flex-1 py-2 text-xs" 
          variant={activeMode === 'balanced' ? 'default' : 'outline'}
          onClick={() => handleModeChange('balanced')}
        >
          Balanced
        </Button>
        <Button 
          size="sm" 
          className="flex-1 py-2 text-xs" 
          variant={activeMode === 'fast' ? 'default' : 'outline'}
          onClick={() => handleModeChange('fast')}
        >
          Fast
        </Button>
      </div>
    </DeviceCard>
  );
}
