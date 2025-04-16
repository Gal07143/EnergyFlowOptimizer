import { useEffect } from 'react';
import Layout from '@/components/Layout';
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
// Import new widgets
import EnergyFlowWidget from './EnergyFlowWidget';
import ElectricityPriceWidget from './ElectricityPriceWidget';
import CostBalanceWidget from './CostBalanceWidget';
import EnergyForecastNew from '@/components/forecasting/EnergyForecastNew';
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
      <Layout>
        <div className="container py-6 space-y-6">
          <div className="pb-5 border-b border-gray-200 dark:border-gray-800">
            <Skeleton className="h-8 w-64" />
          </div>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-64 rounded-lg" />
            ))}
          </div>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            <Skeleton className="h-80 rounded-lg md:col-span-2" />
            <Skeleton className="h-80 rounded-lg" />
          </div>
        </div>
      </Layout>
    );
  }

  // Show error state with option to initialize demo data
  if (readingError || (!latestReading && !isLoadingReading)) {
    return (
      <Layout>
        <div className="container py-6">
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
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container py-6">
        <div className="mb-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold">
            Your System Overview
          </h2>
          <ConnectionStatus siteId={currentSiteId} />
        </div>
        
        {/* Main Dashboard Grid */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {/* First Row */}
          <EnergyFlowWidget siteId={currentSiteId} />
          <ElectricityPriceWidget siteId={currentSiteId} />
          <CostBalanceWidget siteId={currentSiteId} />
          
          {/* Second Row */}
          <div className="md:col-span-2">
            <EnergyForecastNew siteId={currentSiteId} />
          </div>
          <WeatherWidget siteId={currentSiteId} />
          
          {/* Optional: Additional widgets specific to your system */}
          <div className="md:col-span-3 mt-4">
            <h3 className="text-xl font-semibold mb-4">Smart steering of your assets</h3>
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              <div className="text-center text-sm text-muted-foreground">
                <p>Your household is already performing optimally.</p>
                <p>No automated optimization needed.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
