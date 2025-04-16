import { useEffect } from 'react';
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
  const { currentSiteId, currentSite } = useSiteSelector();
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
    );
  }

  // Show error state with option to initialize demo data
  if (readingError || (!latestReading && !isLoadingReading)) {
    return (
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
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            {currentSite?.name || 'Home Energy Dashboard'}
          </h1>
          <p className="text-muted-foreground mt-1">
            Real-time energy monitoring and management
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ConnectionStatus siteId={currentSiteId} />
        </div>
      </div>
      
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:col-span-3 mb-0">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 flex flex-col items-center">
            <span className="text-xs uppercase font-semibold text-muted-foreground mb-1">Active Energy Assets</span>
            <span className="text-4xl font-bold text-primary">
              {devices?.filter(d => d.status === 'online').length || 0}
            </span>
            <span className="text-sm text-muted-foreground mt-1">of {devices?.length || 0} total</span>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 flex flex-col items-center">
            <span className="text-xs uppercase font-semibold text-muted-foreground mb-1">Solar Production</span>
            <span className="text-4xl font-bold text-yellow-500">
              {latestReading?.solarProduction?.toFixed(1) || '0.0'}
            </span>
            <span className="text-sm text-muted-foreground mt-1">kWh per day</span>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 flex flex-col items-center">
            <span className="text-xs uppercase font-semibold text-muted-foreground mb-1">Battery Status</span>
            <span className="text-4xl font-bold text-green-500">
              {latestReading?.batteryLevel || '75'}%
            </span>
            <span className="text-sm text-muted-foreground mt-1">
              {parseFloat(String(latestReading?.batteryCharge || 0)) > 0 ? 'Charging' : 'Ready'}
            </span>
          </div>
        </div>
      </div>
        
      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* First Row */}
        <EnergyFlowWidget siteId={currentSiteId} className="shadow-sm border border-gray-100 dark:border-gray-700" />
        <ElectricityPriceWidget siteId={currentSiteId} className="shadow-sm border border-gray-100 dark:border-gray-700" />
        <CostBalanceWidget siteId={currentSiteId} className="shadow-sm border border-gray-100 dark:border-gray-700" />
        
        {/* Second Row */}
        <div className="md:col-span-2">
          <EnergyForecastNew siteId={currentSiteId} className="shadow-sm border border-gray-100 dark:border-gray-700" />
        </div>
        <WeatherWidget siteId={currentSiteId} className="shadow-sm border border-gray-100 dark:border-gray-700" />
        
        {/* System Highlights */}
        <div className="md:col-span-3 mt-2">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold mb-2">EV Charging</h3>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">{latestReading?.evConsumption?.toFixed(1) || '0.0'} kW</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${parseFloat(String(latestReading?.evConsumption || 0)) > 0 ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'}`}>
                  {parseFloat(String(latestReading?.evConsumption || 0)) > 0 ? 'Active' : 'Idle'}
                </span>
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold mb-2">Home Consumption</h3>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">{latestReading?.homeConsumption?.toFixed(1) || '0.0'} kW</span>
                <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                  Now
                </span>
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold mb-2">Grid Interaction</h3>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">
                  {(parseFloat(String(latestReading?.gridImport || 0)) - parseFloat(String(latestReading?.gridExport || 0))).toFixed(1)} kW
                </span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${parseFloat(String(latestReading?.gridExport || 0)) > parseFloat(String(latestReading?.gridImport || 0)) ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'}`}>
                  {parseFloat(String(latestReading?.gridExport || 0)) > parseFloat(String(latestReading?.gridImport || 0)) ? 'Exporting' : 'Importing'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
