import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Battery, Home, Zap, PlugZap, Sun } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { formatNumber } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface EnergyFlowProps {
  siteId: number;
  className?: string;
}

const EnergyFlowWidget: React.FC<EnergyFlowProps> = ({ siteId, className }) => {
  const [view, setView] = React.useState<'live' | 'today'>('live');

  // Fetch latest energy readings
  const { data: latestReading, isLoading: isLoadingReading } = useQuery({
    queryKey: ['/api/sites', siteId, 'energy/latest'],
    queryFn: async () => {
      const res = await fetch(`/api/sites/${siteId}/energy/latest`);
      if (!res.ok) throw new Error('Failed to fetch latest energy data');
      return await res.json();
    },
    enabled: !!siteId,
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  // Fetch devices for this site
  const { data: devices, isLoading: isLoadingDevices } = useQuery({
    queryKey: ['/api/sites', siteId, 'devices'],
    queryFn: async () => {
      const res = await fetch(`/api/sites/${siteId}/devices`);
      if (!res.ok) throw new Error('Failed to fetch devices');
      return await res.json();
    },
    enabled: !!siteId
  });

  // Calculate energy values for display
  const getEnergyValues = () => {
    if (!latestReading) return null;

    // Default values if data is missing
    const gridSupply = latestReading.gridImport || 0;
    const solarProduction = latestReading.solarProduction || 0;
    const batteryDischarge = latestReading.batteryDischarge || 0;
    const batteryCharge = latestReading.batteryCharge || 0;
    const homeConsumption = latestReading.homeConsumption || 0;
    const evConsumption = latestReading.evConsumption || 0;
    
    // Calculate net values
    const netBattery = batteryDischarge - batteryCharge;
    const totalProduction = solarProduction + gridSupply + (netBattery > 0 ? netBattery : 0);
    const totalConsumption = homeConsumption + evConsumption + (netBattery < 0 ? Math.abs(netBattery) : 0);
    
    // Get battery level
    const batteryLevel = latestReading.batteryLevel !== undefined ? latestReading.batteryLevel : 75;
    
    return {
      gridSupply,
      solarProduction,
      batteryDischarge,
      batteryCharge,
      homeConsumption,
      evConsumption,
      totalConsumption,
      totalProduction,
      batteryLevel,
      timestamp: latestReading.timestamp
    };
  };

  const energyValues = getEnergyValues();
  const isLoading = isLoadingReading || isLoadingDevices;

  if (isLoading) {
    return (
      <Card className={cn("w-full", className)}>
        <CardHeader>
          <CardTitle>
            <Skeleton className="h-6 w-48" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col space-y-6">
            <Skeleton className="h-32 w-full" />
            <div className="grid grid-cols-3 gap-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle>Your system overview</CardTitle>
          <Tabs value={view} onValueChange={(v) => setView(v as 'live' | 'today')} className="w-auto">
            <TabsList className="h-8">
              <TabsTrigger value="live" className="text-xs px-3">Live</TabsTrigger>
              <TabsTrigger value="today" className="text-xs px-3">Today</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <CardDescription>
          {energyValues ? (
            <div className="flex items-center space-x-1 mt-1">
              <span>Current energy price:</span>
              <span className="font-medium text-primary">{latestReading?.electricityPrice ? formatNumber(latestReading.electricityPrice, 2) : '0.15'} ct/kWh</span>
            </div>
          ) : (
            <span>Energy flow information</span>
          )}
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {energyValues ? (
          <div className="flow-layout">
            {/* Grid layout with energy flow visualization */}
            <div className="grid grid-cols-3 gap-6">
              {/* Sources */}
              <div className="flex flex-col space-y-4">
                <div className="energy-source bg-blue-50 dark:bg-blue-950 rounded-lg p-4 flex flex-col items-center">
                  <Zap className="h-8 w-8 text-blue-500 mb-2" />
                  <p className="text-sm font-medium text-center">Grid supply</p>
                  <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                    {formatNumber(energyValues.gridSupply, 1)} kW
                  </p>
                </div>
                
                <div className="energy-source bg-yellow-50 dark:bg-yellow-950 rounded-lg p-4 flex flex-col items-center">
                  <Sun className="h-8 w-8 text-yellow-500 mb-2" />
                  <p className="text-sm font-medium text-center">PV production</p>
                  <p className="text-lg font-bold text-yellow-600 dark:text-yellow-400">
                    {formatNumber(energyValues.solarProduction, 1)} kW
                  </p>
                </div>
                
                <div className="energy-source bg-green-50 dark:bg-green-950 rounded-lg p-4 flex flex-col items-center">
                  <Battery className="h-8 w-8 text-green-500 mb-2" />
                  <p className="text-sm font-medium text-center">Battery discharge</p>
                  <p className="text-lg font-bold text-green-600 dark:text-green-400">
                    {formatNumber(energyValues.batteryDischarge, 1)} kW
                  </p>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mt-2">
                    <div className="bg-green-500 h-2.5 rounded-full" style={{ width: `${energyValues.batteryLevel}%` }}></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{energyValues.batteryLevel}%</p>
                </div>
              </div>
              
              {/* Total consumption in middle */}
              <div className="flex flex-col items-center justify-center">
                <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 flex flex-col items-center w-full">
                  <p className="text-sm font-medium mb-2">Total consumption</p>
                  <p className="text-2xl font-bold text-primary">
                    {formatNumber(energyValues.totalConsumption, 1)} kW
                  </p>
                </div>
                
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-800 p-2 rounded">
                    {view === 'live' ? 'Real-time data' : 'Today\'s average'}
                  </div>
                </div>
              </div>
              
              {/* Consumption */}
              <div className="flex flex-col space-y-4">
                <div className="energy-consumer bg-purple-50 dark:bg-purple-950 rounded-lg p-4 flex flex-col items-center">
                  <Home className="h-8 w-8 text-purple-500 mb-2" />
                  <p className="text-sm font-medium text-center">Household</p>
                  <p className="text-lg font-bold text-purple-600 dark:text-purple-400">
                    {formatNumber(energyValues.homeConsumption, 1)} kW
                  </p>
                </div>
                
                <div className="energy-consumer bg-indigo-50 dark:bg-indigo-950 rounded-lg p-4 flex flex-col items-center">
                  <PlugZap className="h-8 w-8 text-indigo-500 mb-2" />
                  <p className="text-sm font-medium text-center">EV</p>
                  <p className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
                    {formatNumber(energyValues.evConsumption, 1)} kW
                  </p>
                  {energyValues.evConsumption > 0 && (
                    <div className="text-xs bg-indigo-100 dark:bg-indigo-900 px-2 py-1 rounded mt-1">
                      87%
                    </div>
                  )}
                </div>
                
                <div className="energy-consumer bg-cyan-50 dark:bg-cyan-950 rounded-lg p-4 flex flex-col items-center">
                  <Battery className="h-8 w-8 text-cyan-500 mb-2" />
                  <p className="text-sm font-medium text-center">Battery charge</p>
                  <p className="text-lg font-bold text-cyan-600 dark:text-cyan-400">
                    {formatNumber(energyValues.batteryCharge, 1)} kW
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 text-center text-gray-500">
            No energy flow data available
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default EnergyFlowWidget;