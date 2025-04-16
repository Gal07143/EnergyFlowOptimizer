import { useState, useEffect } from 'react';
import { ConnectionStatus } from './ConnectionStatus';
import { useLatestEnergyReading, useRealTimeEnergyData } from '@/hooks/useEnergyData';
import { useDevices } from '@/hooks/useDevices';
import { useSiteSelector } from '@/hooks/useSiteData';
import { useOptimizationSettings } from '@/hooks/useOptimization';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useInitializeDemoData } from '@/hooks/useSiteData';
import ImprovedEnergyForecast from '@/components/forecasting/ImprovedEnergyForecast';
import EnergyFlowWidget from './EnergyFlowWidget';
import ElectricityPriceWidget from './ElectricityPriceWidget';
import CostBalanceWidget from './CostBalanceWidget';
import WeatherWidget from '@/components/weather/WeatherWidget';

export default function Dashboard() {
  const { currentSiteId } = useSiteSelector();
  const { data: latestReading, isLoading: isLoadingReading, error: readingError } = useLatestEnergyReading(currentSiteId);
  const { data: devices, isLoading: isLoadingDevices } = useDevices(currentSiteId);
  const { data: optimizationSettings } = useOptimizationSettings(currentSiteId);
  const { isConnected, subscribe } = useRealTimeEnergyData(currentSiteId);
  const { mutate: initializeDemoData, isPending: isInitializingDemo } = useInitializeDemoData();

  // Subscribe to real-time updates for the site
  useEffect(() => {
    if (isConnected && currentSiteId) {
      subscribe();
    }
  }, [isConnected, currentSiteId, subscribe]);

  const handleInitializeDemoData = () => {
    initializeDemoData();
  };

  // Show loading state
  if (isLoadingReading || isLoadingDevices) {
    return (
      <div className="py-6 px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="pb-5 border-b border-gray-200 dark:border-gray-800">
          <Skeleton className="h-8 w-64" />
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-80 rounded-lg" />
        <Skeleton className="h-96 rounded-lg" />
      </div>
    );
  }

  // Show error state with option to initialize demo data
  if (readingError || (!latestReading && !isLoadingReading)) {
    return (
      <div className="py-6 px-4 sm:px-6 lg:px-8">
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {readingError ? `Failed to load energy data: ${readingError}` : 'No energy data available.'}
          </AlertDescription>
        </Alert>
        
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <h3 className="mb-4 text-xl font-medium">Initialize Demo Data</h3>
          <p className="mb-6 text-gray-600 dark:text-gray-400 max-w-md">
            No energy data was found. Click the button below to initialize the system with demo data.
          </p>
          <Button 
            onClick={handleInitializeDemoData}
            disabled={isInitializingDemo}
          >
            {isInitializingDemo ? 'Initializing...' : 'Initialize Demo Data'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="py-6">
      <div className="px-4 sm:px-6 lg:px-8 mb-4 flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Dashboard
        </h2>
        <ConnectionStatus siteId={currentSiteId} />
      </div>
      
      {/* Main Dashboard Grid */}
      <div className="px-4 sm:px-6 lg:px-8 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* First row with 3 widgets */}
          <EnergyFlowWidget siteId={currentSiteId} />
          <ElectricityPriceWidget siteId={currentSiteId} />
          <CostBalanceWidget siteId={currentSiteId} />
        </div>
      </div>
      
      {/* Second row with weather data and energy forecast */}
      <div className="px-4 sm:px-6 lg:px-8 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1">
            <WeatherWidget siteId={currentSiteId} />
          </div>
          <div className="md:col-span-2">
            <ImprovedEnergyForecast siteId={currentSiteId} />
          </div>
        </div>
      </div>
      
      {/* Additional widgets in a 2x2 grid */}
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <h3 className="text-lg font-medium mb-4">Smart steering of your assets</h3>
            <div className="text-muted-foreground">
              <p>Your household is already performing optimally. No automated optimization needed.</p>
              <div className="mt-2 flex items-center">
                <span className="inline-block w-3 h-3 bg-green-500 rounded-full mr-2"></span>
                <span>3 times optimized based on electricity price today</span>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <h3 className="text-lg font-medium mb-4">Production and consumption</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="border p-3 rounded-md">
                <div className="text-sm text-muted-foreground">Consumption</div>
                <div className="text-xl font-medium mt-1">{latestReading?.homeConsumption?.toFixed(1) || "0.0"} kWh</div>
              </div>
              <div className="border p-3 rounded-md">
                <div className="text-sm text-muted-foreground">Production</div>
                <div className="text-xl font-medium mt-1">{latestReading?.solarProduction?.toFixed(1) || "0.0"} kWh</div>
              </div>
            </div>
            <div className="mt-4">
              <div className="text-sm text-muted-foreground">Daily balance</div>
              <div className="h-2 bg-gray-200 rounded-full mt-2">
                <div className="h-2 bg-green-500 rounded-full" style={{ width: '65%' }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
