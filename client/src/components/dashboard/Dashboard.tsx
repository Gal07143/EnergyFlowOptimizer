import { useState, useEffect } from 'react';
import EnergyOverview from './EnergyOverview';
import EnergyFlow from './EnergyFlow';
import DeviceManagement from './DeviceManagement';
import EnergyOptimization from './EnergyOptimization';
import AdvancedFeatures from './AdvancedFeatures';
import { useLatestEnergyReading, useRealTimeEnergyData } from '@/hooks/useEnergyData';
import { useDevices } from '@/hooks/useDevices';
import { useSiteSelector } from '@/hooks/useSiteData';
import { useOptimizationSettings } from '@/hooks/useOptimization';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useInitializeDemoData } from '@/hooks/useSiteData';

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
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
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
      <EnergyOverview latestReading={latestReading} />
      <EnergyFlow latestReading={latestReading} devices={devices} />
      <DeviceManagement devices={devices} siteId={currentSiteId} />
      <EnergyOptimization siteId={currentSiteId} settings={optimizationSettings} />
      <AdvancedFeatures siteId={currentSiteId} settings={optimizationSettings} />
    </div>
  );
}
