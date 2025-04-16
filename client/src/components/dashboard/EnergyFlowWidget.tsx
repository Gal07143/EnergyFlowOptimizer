import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { formatNumber } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { ArrowDown, ArrowUp, Battery, Home, Zap, Sun, Car } from 'lucide-react';

interface EnergyFlowWidgetProps {
  siteId: number;
  className?: string;
}

const EnergyFlowWidget: React.FC<EnergyFlowWidgetProps> = ({ siteId, className }) => {
  // Fetch the latest energy reading
  const { data: latestReading, isLoading } = useQuery({
    queryKey: ['/api/sites', siteId, 'energy/latest'],
    queryFn: async () => {
      const response = await fetch(`/api/sites/${siteId}/energy/latest`);
      if (!response.ok) {
        throw new Error('Failed to fetch latest energy data');
      }
      return await response.json();
    },
    enabled: !!siteId,
    refetchInterval: 30000, // Refresh every 30 seconds
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

  // Retrieve values from the energy reading or use defaults
  const solarProduction = latestReading?.solarProduction || 2.4;
  const gridImport = latestReading?.gridImport || 0.0;
  const gridExport = latestReading?.gridExport || 1.1;
  const homeConsumption = latestReading?.homeConsumption || 1.1;
  const evConsumption = latestReading?.evConsumption || 0.0;
  const batteryCharge = latestReading?.batteryCharge || 0.2;
  const batteryDischarge = latestReading?.batteryDischarge || 0.0;
  const batteryLevel = latestReading?.batteryLevel || 75;
  
  // Calculate net values
  const netProduction = solarProduction + batteryDischarge;
  const netConsumption = homeConsumption + evConsumption + batteryCharge;
  const netBatteryFlow = batteryDischarge - batteryCharge;
  const netGridFlow = gridImport - gridExport;
  
  // Determine the system status
  const getSystemStatus = () => {
    if (solarProduction > netConsumption && batteryLevel >= 95) {
      return {
        status: 'Exporting',
        description: 'Sending clean energy to the grid',
        color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
      };
    } else if (solarProduction > homeConsumption && batteryCharge > 0) {
      return {
        status: 'Charging',
        description: 'Storing excess solar energy',
        color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
      };
    } else if (batteryDischarge > 0 && gridImport === 0) {
      return {
        status: 'Self-sufficient',
        description: 'Running on stored energy',
        color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
      };
    } else if (gridImport > 0 && solarProduction === 0) {
      return {
        status: 'Grid-powered',
        description: 'Drawing power from the grid',
        color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
      };
    } else {
      return {
        status: 'Hybrid',
        description: 'Using multiple energy sources',
        color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
      };
    }
  };

  const systemStatus = getSystemStatus();

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-2">
        <div className="flex justify-between">
          <div>
            <CardTitle>Live energy flow</CardTitle>
            <CardDescription>Real-time energy distribution</CardDescription>
          </div>
          <Badge variant="outline" className={cn(systemStatus.color)}>
            {systemStatus.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative h-64 mt-2">
          {/* Energy flow diagram */}
          <div className="absolute inset-0 flex flex-col items-center">
            {/* Solar Row */}
            <div className="flex items-center justify-center w-full mb-2">
              <div className="p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg flex items-center">
                <Sun className="h-6 w-6 text-yellow-500 mr-2" />
                <div>
                  <p className="text-sm font-medium">Solar</p>
                  <p className="text-xl font-bold text-yellow-600 dark:text-yellow-400">
                    {formatNumber(solarProduction, 1)} kW
                  </p>
                </div>
              </div>
              <div className="w-6 h-12 flex justify-center">
                <div className="w-1 h-full bg-yellow-300 dark:bg-yellow-700"></div>
              </div>
            </div>

            {/* Center Row with Grid, Battery, Home */}
            <div className="flex items-center justify-between w-full px-4 my-3">
              {/* Grid */}
              <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex flex-col items-center">
                <Zap className="h-6 w-6 text-blue-500 mb-1" />
                <p className="text-sm font-medium">Grid</p>
                <div className="flex flex-col items-center">
                  {gridImport > 0 && (
                    <div className="flex items-center text-green-600 dark:text-green-400">
                      <ArrowDown className="h-3 w-3 mr-1" />
                      <span className="text-sm font-medium">{formatNumber(gridImport, 1)}</span>
                    </div>
                  )}
                  {gridExport > 0 && (
                    <div className="flex items-center text-red-600 dark:text-red-400">
                      <ArrowUp className="h-3 w-3 mr-1" />
                      <span className="text-sm font-medium">{formatNumber(gridExport, 1)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Connector Lines */}
              <div className="flex-1 h-1 bg-gray-200 dark:bg-gray-700 mx-2"></div>

              {/* Battery */}
              <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg flex flex-col items-center">
                <Battery className="h-6 w-6 text-green-500 mb-1" />
                <p className="text-sm font-medium">Battery</p>
                <div className="flex flex-col items-center">
                  <span className="text-sm font-bold">{formatNumber(batteryLevel, 0)}%</span>
                  {batteryCharge > 0 && (
                    <div className="flex items-center text-green-600 dark:text-green-400">
                      <ArrowDown className="h-3 w-3 mr-1" />
                      <span className="text-sm font-medium">{formatNumber(batteryCharge, 1)}</span>
                    </div>
                  )}
                  {batteryDischarge > 0 && (
                    <div className="flex items-center text-red-600 dark:text-red-400">
                      <ArrowUp className="h-3 w-3 mr-1" />
                      <span className="text-sm font-medium">{formatNumber(batteryDischarge, 1)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Connector Lines */}
              <div className="flex-1 h-1 bg-gray-200 dark:bg-gray-700 mx-2"></div>

              {/* Home */}
              <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg flex flex-col items-center">
                <Home className="h-6 w-6 text-purple-500 mb-1" />
                <p className="text-sm font-medium">Home</p>
                <p className="text-sm font-bold text-purple-600 dark:text-purple-400">
                  {formatNumber(homeConsumption, 1)} kW
                </p>
              </div>
            </div>

            {/* EV Row at bottom */}
            <div className="flex items-center justify-center w-full mt-2">
              <div className="w-6 h-12 flex justify-center">
                <div className="w-1 h-full bg-indigo-300 dark:bg-indigo-700"></div>
              </div>
              <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg flex items-center">
                <Car className="h-6 w-6 text-indigo-500 mr-2" />
                <div>
                  <p className="text-sm font-medium">EV</p>
                  <p className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
                    {formatNumber(evConsumption, 1)} kW
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* System status description */}
        <div className="text-center mt-2 text-sm text-muted-foreground">
          {systemStatus.description}
        </div>
      </CardContent>
    </Card>
  );
};

export default EnergyFlowWidget;