import { useState } from 'react';
import DeviceCard from './DeviceCard';
import { Device } from '@/types/devices';
import { useDeviceReadings, useDeviceControl } from '@/hooks/useDevices';
import { formatNumber } from '@/lib/utils/data-utils';
import { Thermometer, ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Toggle } from '@/components/ui/toggle';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface HeatPumpCardProps {
  device: Device;
}

export default function HeatPumpCard({ device }: HeatPumpCardProps) {
  const { data: readings = [] } = useDeviceReadings(device.id, 1);
  const { mutate: sendCommand } = useDeviceControl();
  
  const latestReading = readings && readings.length > 0 ? readings[0] : null;
  
  // Extract temperature and power consumption
  const currentTemp = latestReading?.additionalData?.currentTemp ?? 21.5; // Default value for display
  const targetTemp = latestReading?.additionalData?.targetTemp ?? 22.0; // Default value for display
  const powerConsumption = latestReading?.power ?? 1.2; // Default value for display
  const mode = latestReading?.additionalData?.mode ?? 'heating'; // Default mode
  
  // Calculate COP (Coefficient of Performance) if available
  const cop = latestReading?.additionalData?.cop ?? 3.8; // Default value for display
  
  // Local state for temperature control
  const [localTargetTemp, setLocalTargetTemp] = useState(targetTemp);
  const [activeMode, setActiveMode] = useState<string>(mode);
  
  // Increment/decrement temperature by 0.5°C
  const adjustTemperature = (amount: number) => {
    const newTemp = localTargetTemp + amount;
    setLocalTargetTemp(newTemp);
    
    // Send command to device
    sendCommand({
      deviceId: device.id,
      action: 'setTemperature',
      parameters: { temperature: newTemp }
    });
  };
  
  // Change operating mode
  const handleModeChange = (newMode: string) => {
    setActiveMode(newMode);
    
    sendCommand({
      deviceId: device.id,
      action: 'setMode',
      parameters: { mode: newMode }
    });
  };

  return (
    <DeviceCard device={device}>
      {/* Main Temperature Display */}
      <div className="mt-4 flex justify-between">
        <div className="flex items-center">
          <Thermometer className="h-5 w-5 text-primary mr-1" />
          <span className="text-2xl font-semibold">{formatNumber(currentTemp, 1)}°C</span>
          <span className="text-sm text-muted-foreground ml-2">Current</span>
        </div>
        <div className="flex items-center">
          <span className="text-sm text-muted-foreground mr-2">Target</span>
          <span className="text-2xl font-semibold">{formatNumber(localTargetTemp, 1)}°C</span>
        </div>
      </div>
      
      {/* Temperature Controls */}
      <div className="mt-4 flex justify-between items-center">
        <Button 
          variant="outline" 
          size="icon"
          onClick={() => adjustTemperature(-0.5)}
        >
          <ArrowDown className="h-4 w-4" />
        </Button>
        
        <div className="flex flex-col items-center">
          <div className="text-xs text-muted-foreground">MODE</div>
          <Tabs value={activeMode} onValueChange={handleModeChange} className="mt-1">
            <TabsList className="grid grid-cols-3 h-8">
              <TabsTrigger value="heating" className="text-xs px-2 py-1">Heat</TabsTrigger>
              <TabsTrigger value="cooling" className="text-xs px-2 py-1">Cool</TabsTrigger>
              <TabsTrigger value="auto" className="text-xs px-2 py-1">Auto</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        
        <Button 
          variant="outline" 
          size="icon"
          onClick={() => adjustTemperature(0.5)}
        >
          <ArrowUp className="h-4 w-4" />
        </Button>
      </div>
      
      {/* Stats Row */}
      <div className="mt-4 grid grid-cols-2 gap-4">
        <div className="bg-gray-50 dark:bg-gray-800 rounded p-3">
          <p className="text-xs text-gray-500 dark:text-gray-400">Power Usage</p>
          <p className="text-lg font-semibold text-gray-900 dark:text-white">
            {formatNumber(powerConsumption, 1)} kW
          </p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800 rounded p-3">
          <p className="text-xs text-gray-500 dark:text-gray-400">Efficiency (COP)</p>
          <p className="text-lg font-semibold text-gray-900 dark:text-white">
            {formatNumber(cop, 1)}
          </p>
        </div>
      </div>
    </DeviceCard>
  );
}