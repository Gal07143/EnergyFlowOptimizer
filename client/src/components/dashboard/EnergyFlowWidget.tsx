import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { formatNumber } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { BatteryMedium, Zap, Home, ArrowDownRight, ArrowUpRight, Sun, PlugZap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EnergyFlowWidgetProps {
  siteId: number;
  className?: string;
}

const EnergyFlowWidget: React.FC<EnergyFlowWidgetProps> = ({ siteId, className }) => {
  // Fetch latest energy data
  const { data: energyData, isLoading } = useQuery({
    queryKey: ['/api/sites', siteId, 'energy/latest'],
    queryFn: async () => {
      const res = await fetch(`/api/sites/${siteId}/energy/latest`);
      if (!res.ok) throw new Error('Failed to fetch energy data');
      return await res.json();
    },
    enabled: !!siteId,
    refetchInterval: 10000 // Refresh every 10 seconds
  });

  if (isLoading) {
    return (
      <Card className={cn("w-full", className)}>
        <CardHeader>
          <CardTitle>
            <Skeleton className="h-6 w-48" />
          </CardTitle>
          <CardDescription>
            <Skeleton className="h-4 w-36" />
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  // Get energy data values or use defaults
  const solarProduction = energyData?.solarProduction || 3.2;
  const gridImport = energyData?.gridImport || 0.0;
  const gridExport = energyData?.gridExport || 0.3;
  const batteryCharging = energyData?.batteryCharging || 0.0;
  const batteryDischarging = energyData?.batteryDischarging || 0.8;
  const homeConsumption = energyData?.homeConsumption || 3.7;
  const evCharging = energyData?.evCharging || 0.0;
  
  // Calculate total input/output
  const totalInput = solarProduction + gridImport + batteryDischarging;
  const totalOutput = homeConsumption + gridExport + batteryCharging + evCharging;
  
  // Calculate percentages for visual display
  const solarPercent = (solarProduction / totalInput) * 100;
  const gridImportPercent = (gridImport / totalInput) * 100;
  const batteryDischargingPercent = (batteryDischarging / totalInput) * 100;
  
  const homePercent = (homeConsumption / totalOutput) * 100;
  const gridExportPercent = (gridExport / totalOutput) * 100;
  const batteryChargingPercent = (batteryCharging / totalOutput) * 100;
  const evChargingPercent = (evCharging / totalOutput) * 100;

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-2">
        <CardTitle>Energy Flow</CardTitle>
        <CardDescription>
          Real-time energy flow visualization
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mt-2 relative h-60">
          {/* Energy flow diagram */}
          <div className="absolute inset-0 flex">
            {/* Left side - Energy sources */}
            <div className="w-1/3 pr-2 flex flex-col justify-around">
              {/* Solar power */}
              <div className="flex flex-col items-end">
                <div className="flex items-center mb-1">
                  <span className="text-sm mr-2">Solar</span>
                  <Sun className="h-4 w-4 text-yellow-500" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{formatNumber(solarProduction, 1)} kW</span>
                  <div className="w-[60px] h-3 bg-gray-100 rounded-sm">
                    <div className="h-full bg-yellow-400 rounded-sm" style={{ width: `${solarPercent}%` }}></div>
                  </div>
                </div>
              </div>
              
              {/* Grid import */}
              <div className="flex flex-col items-end">
                <div className="flex items-center mb-1">
                  <span className="text-sm mr-2">Grid</span>
                  <Zap className="h-4 w-4 text-blue-500" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{formatNumber(gridImport, 1)} kW</span>
                  <div className="w-[60px] h-3 bg-gray-100 rounded-sm">
                    <div className="h-full bg-blue-400 rounded-sm" style={{ width: `${gridImportPercent}%` }}></div>
                  </div>
                </div>
              </div>
              
              {/* Battery discharge */}
              <div className="flex flex-col items-end">
                <div className="flex items-center mb-1">
                  <span className="text-sm mr-2">Battery</span>
                  <BatteryMedium className="h-4 w-4 text-green-500" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{formatNumber(batteryDischarging, 1)} kW</span>
                  <div className="w-[60px] h-3 bg-gray-100 rounded-sm">
                    <div className="h-full bg-green-400 rounded-sm" style={{ width: `${batteryDischargingPercent}%` }}></div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Middle - Flow arrows */}
            <div className="w-1/3 flex flex-col items-center justify-center">
              <div className="bg-gray-100 dark:bg-gray-800 rounded-full w-20 h-20 flex items-center justify-center mb-3">
                <span className="text-xl font-bold">{formatNumber(totalInput, 1)}</span>
                <span className="text-xs ml-1">kW</span>
              </div>
              
              {/* Flow arrows */}
              <div className="flex flex-col items-center">
                <ArrowDownRight className="h-6 w-6 text-green-500" />
                <div className="h-8 w-0.5 bg-gray-300"></div>
                <ArrowUpRight className="h-6 w-6 text-blue-500" />
              </div>
              
              <div className="flex items-center text-sm mt-3">
                <span className="flex items-center bg-green-100 dark:bg-green-900/20 rounded-full px-2 py-0.5 mr-2">
                  <ArrowDownRight className="h-3 w-3 mr-1 text-green-500" />
                  <span className="text-green-700 dark:text-green-300 text-xs">Input</span>
                </span>
                
                <span className="flex items-center bg-blue-100 dark:bg-blue-900/20 rounded-full px-2 py-0.5">
                  <ArrowUpRight className="h-3 w-3 mr-1 text-blue-500" />
                  <span className="text-blue-700 dark:text-blue-300 text-xs">Output</span>
                </span>
              </div>
            </div>
            
            {/* Right side - Energy consumers */}
            <div className="w-1/3 pl-2 flex flex-col justify-around">
              {/* Home consumption */}
              <div className="flex flex-col">
                <div className="flex items-center mb-1">
                  <Home className="h-4 w-4 text-purple-500 mr-2" />
                  <span className="text-sm">Home</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-[60px] h-3 bg-gray-100 rounded-sm">
                    <div className="h-full bg-purple-400 rounded-sm" style={{ width: `${homePercent}%` }}></div>
                  </div>
                  <span className="text-sm font-medium">{formatNumber(homeConsumption, 1)} kW</span>
                </div>
              </div>
              
              {/* Grid export */}
              <div className="flex flex-col">
                <div className="flex items-center mb-1">
                  <Zap className="h-4 w-4 text-blue-500 mr-2" />
                  <span className="text-sm">Grid Export</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-[60px] h-3 bg-gray-100 rounded-sm">
                    <div className="h-full bg-blue-400 rounded-sm" style={{ width: `${gridExportPercent}%` }}></div>
                  </div>
                  <span className="text-sm font-medium">{formatNumber(gridExport, 1)} kW</span>
                </div>
              </div>
              
              {/* Battery charging */}
              <div className="flex flex-col">
                <div className="flex items-center mb-1">
                  <BatteryMedium className="h-4 w-4 text-green-500 mr-2" />
                  <span className="text-sm">Battery</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-[60px] h-3 bg-gray-100 rounded-sm">
                    <div className="h-full bg-green-400 rounded-sm" style={{ width: `${batteryChargingPercent}%` }}></div>
                  </div>
                  <span className="text-sm font-medium">{formatNumber(batteryCharging, 1)} kW</span>
                </div>
              </div>
              
              {/* EV charging */}
              <div className="flex flex-col">
                <div className="flex items-center mb-1">
                  <PlugZap className="h-4 w-4 text-indigo-500 mr-2" />
                  <span className="text-sm">EV</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-[60px] h-3 bg-gray-100 rounded-sm">
                    <div className="h-full bg-indigo-400 rounded-sm" style={{ width: `${evChargingPercent}%` }}></div>
                  </div>
                  <span className="text-sm font-medium">{formatNumber(evCharging, 1)} kW</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="text-center text-xs text-muted-foreground mt-3">
          Last updated: {new Date().toLocaleTimeString()}
        </div>
      </CardContent>
    </Card>
  );
};

export default EnergyFlowWidget;