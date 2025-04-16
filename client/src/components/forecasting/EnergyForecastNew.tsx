import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Skeleton } from '@/components/ui/skeleton';
import { formatNumber } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { 
  Loader2, 
  RefreshCw, 
  BarChart3, 
  TrendingUp, 
  Zap, 
  Battery, 
  Sun, 
  Power, 
  ArrowUp,
  ArrowDown,
  ArrowLeftRight
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from '@/components/ui/badge';

// Chart imports
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

type ForecastInterval = '1h' | '6h' | '24h' | '7d' | '30d';

interface EnergyForecastProps {
  siteId: number;
  className?: string;
}

interface ForecastSummary {
  totalProduction: string;
  totalConsumption: string;
  totalGridImport: string;
  totalGridExport: string;
  selfSufficiency: string;
  gridIndependence: string;
  gridExportRaw: number;
  gridImportRaw: number;
}

const EnergyForecastNew: React.FC<EnergyForecastProps> = ({ siteId, className }) => {
  const [interval, setInterval] = useState<ForecastInterval>('24h');
  const [view, setView] = useState<'consumption' | 'production' | 'balance'>('balance');

  // Fetch the latest energy forecast
  const { data: forecast, isLoading, error, refetch } = useQuery({
    queryKey: ['/api/sites', siteId, 'forecasts', 'latest', interval],
    queryFn: async () => {
      const response = await fetch(`/api/sites/${siteId}/forecasts/latest?interval=${interval}`);
      if (!response.ok) {
        throw new Error('Failed to fetch forecast data');
      }
      return await response.json();
    },
    enabled: !!siteId,
  });

  // Mutation to generate a new forecast
  const generateForecastMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', `/api/sites/${siteId}/forecasts/generate`, { interval });
      if (!response.ok) {
        throw new Error('Failed to generate forecast');
      }
      return await response.json();
    },
    onSuccess: () => {
      // Invalidate the forecast query to refetch the data
      queryClient.invalidateQueries({ queryKey: ['/api/sites', siteId, 'forecasts', 'latest', interval] });
    },
  });

  // Process data for chart display
  const chartData = React.useMemo(() => {
    if (!forecast || !forecast.data || !Array.isArray(forecast.data)) {
      return null;
    }

    // Extract the timestamp and relevant energy values
    const labels = forecast.data.map((point: any) => {
      const date = new Date(point.timestamp);
      
      // Format based on interval
      if (interval === '1h' || interval === '6h') {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      } else if (interval === '24h') {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      } else {
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
      }
    });

    // Create datasets
    const solarProduction = forecast.data.map((point: any) => point.solarProduction || 0);
    const homeConsumption = forecast.data.map((point: any) => point.homeConsumption || 0);
    const evConsumption = forecast.data.map((point: any) => point.evConsumption || 0);
    const batteryCharge = forecast.data.map((point: any) => point.batteryCharge || 0);
    const batteryDischarge = forecast.data.map((point: any) => point.batteryDischarge || 0);
    const gridImport = forecast.data.map((point: any) => point.gridImport || 0);
    const gridExport = forecast.data.map((point: any) => point.gridExport || 0);

    // Calculate the net energy balance
    const netBalance = forecast.data.map((point: any) => {
      const totalGen = (point.solarProduction || 0) + (point.batteryDischarge || 0);
      const totalCons = (point.homeConsumption || 0) + (point.evConsumption || 0) + (point.batteryCharge || 0);
      return totalGen - totalCons;
    });

    // Data for different views
    const consumptionData = {
      labels,
      datasets: [
        {
          label: 'Home',
          data: homeConsumption,
          backgroundColor: 'rgba(147, 51, 234, 0.7)',
          borderColor: 'rgba(147, 51, 234, 1)',
          stack: 'consumption',
        },
        {
          label: 'EV',
          data: evConsumption,
          backgroundColor: 'rgba(79, 70, 229, 0.7)',
          borderColor: 'rgba(79, 70, 229, 1)',
          stack: 'consumption',
        },
        {
          label: 'Battery Charge',
          data: batteryCharge,
          backgroundColor: 'rgba(16, 185, 129, 0.7)',
          borderColor: 'rgba(16, 185, 129, 1)',
          stack: 'consumption',
        },
      ],
    };

    const productionData = {
      labels,
      datasets: [
        {
          label: 'Solar',
          data: solarProduction,
          backgroundColor: 'rgba(245, 158, 11, 0.7)',
          borderColor: 'rgba(245, 158, 11, 1)',
          stack: 'production',
        },
        {
          label: 'Battery Discharge',
          data: batteryDischarge,
          backgroundColor: 'rgba(16, 185, 129, 0.7)',
          borderColor: 'rgba(16, 185, 129, 1)',
          stack: 'production',
        },
        {
          label: 'Grid Import',
          data: gridImport,
          backgroundColor: 'rgba(239, 68, 68, 0.7)',
          borderColor: 'rgba(239, 68, 68, 1)',
          stack: 'production',
        },
      ],
    };

    const balanceData = {
      labels,
      datasets: [
        {
          label: 'Production',
          data: forecast.data.map((point: any) => 
            (point.solarProduction || 0) + (point.batteryDischarge || 0)
          ),
          backgroundColor: 'rgba(16, 185, 129, 0.7)',
          borderColor: 'rgba(16, 185, 129, 1)',
          stack: 'balance',
        },
        {
          label: 'Consumption',
          data: forecast.data.map((point: any) => 
            -((point.homeConsumption || 0) + (point.evConsumption || 0) + (point.batteryCharge || 0))
          ),
          backgroundColor: 'rgba(239, 68, 68, 0.7)',
          borderColor: 'rgba(239, 68, 68, 1)',
          stack: 'balance',
        },
      ],
    };

    return {
      consumption: consumptionData,
      production: productionData,
      balance: balanceData,
      netBalance,
    };
  }, [forecast, interval]);

  // Calculate summary statistics
  const forecastSummary = React.useMemo((): ForecastSummary | null => {
    if (!forecast || !forecast.data || !Array.isArray(forecast.data)) {
      return null;
    }

    // Calculate totals
    let totalProduction = 0;
    let totalConsumption = 0;
    let totalGridImport = 0;
    let totalGridExport = 0;

    forecast.data.forEach((point: any) => {
      // Production
      totalProduction += (point.solarProduction || 0) + (point.batteryDischarge || 0);
      
      // Consumption
      totalConsumption += (point.homeConsumption || 0) + (point.evConsumption || 0) + (point.batteryCharge || 0);
      
      // Grid interaction
      totalGridImport += (point.gridImport || 0);
      totalGridExport += (point.gridExport || 0);
    });

    // Calculate self-sufficiency (percentage of consumption covered by own generation)
    const selfSufficiency = totalConsumption > 0 
      ? Math.min(100, (totalProduction / totalConsumption) * 100) 
      : 0;
    
    // Calculate grid independence (percentage of consumption NOT covered by grid)
    const gridIndependence = totalConsumption > 0 
      ? Math.min(100, 100 - ((totalGridImport / totalConsumption) * 100)) 
      : 0;
    
    return {
      totalProduction: totalProduction.toFixed(1),
      totalConsumption: totalConsumption.toFixed(1),
      totalGridImport: totalGridImport.toFixed(1),
      totalGridExport: totalGridExport.toFixed(1),
      selfSufficiency: selfSufficiency.toFixed(0),
      gridIndependence: gridIndependence.toFixed(0),
      // Store raw values for comparisons
      gridExportRaw: totalGridExport,
      gridImportRaw: totalGridImport
    };
  }, [forecast]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          boxWidth: 12,
          padding: 15,
        },
      },
      tooltip: {
        enabled: true,
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
      },
      y: {
        stacked: true,
        grid: {
          color: 'rgba(200, 200, 200, 0.15)',
        },
        ticks: {
          callback: (value: number) => `${value} kW`,
        },
      },
    },
  };

  // Loading state
  if (isLoading) {
    return (
      <Card className={cn("w-full", className)}>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>
              <Skeleton className="h-6 w-64" />
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-[300px] w-full" />
            <div className="grid grid-cols-3 gap-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className={cn("w-full border-red-200", className)}>
        <CardHeader>
          <CardTitle className="flex items-center text-red-500">
            <TrendingUp className="mr-2 h-5 w-5" />
            Energy Forecast Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTitle>Error loading forecast data</AlertTitle>
            <AlertDescription>
              {error instanceof Error ? error.message : 'An unknown error occurred'}
            </AlertDescription>
          </Alert>
          <Button 
            onClick={() => refetch()} 
            className="mt-4"
            variant="outline"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-lg">Production and consumption</CardTitle>
            <CardDescription>
              {forecast && forecast.timestamp ? (
                <span>
                  Generated on {new Date(forecast.timestamp).toLocaleString()}
                </span>
              ) : (
                <span>Energy forecast and optimization</span>
              )}
            </CardDescription>
          </div>
          
          <div className="flex items-center gap-2">
            <Tabs value={view} onValueChange={(v) => setView(v as any)}>
              <TabsList className="h-8">
                <TabsTrigger value="balance" className="text-xs px-3">
                  <ArrowLeftRight className="mr-1 h-3 w-3" />
                  Balance
                </TabsTrigger>
                <TabsTrigger value="production" className="text-xs px-3">
                  <ArrowUp className="mr-1 h-3 w-3" />
                  Production
                </TabsTrigger>
                <TabsTrigger value="consumption" className="text-xs px-3">
                  <ArrowDown className="mr-1 h-3 w-3" />
                  Consumption
                </TabsTrigger>
              </TabsList>
            </Tabs>
            
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => generateForecastMutation.mutate()}
              disabled={generateForecastMutation.isPending}
            >
              {generateForecastMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Chart */}
        <div className="h-[300px] w-full mb-6">
          {chartData && (
            <div className="h-full">
              <Bar
                data={chartData[view]}
                options={chartOptions}
              />
            </div>
          )}
        </div>

        {/* Metrics */}
        {forecastSummary && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-green-50/50 dark:bg-green-950/20 p-4 rounded-lg">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-green-800 dark:text-green-300 flex items-center">
                    <Sun className="mr-1 h-4 w-4" />
                    Self-Sufficiency
                  </p>
                  <h3 className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
                    {forecastSummary.selfSufficiency}%
                  </h3>
                </div>
                <Badge variant="outline" className="bg-green-100/80 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-0">
                  {parseInt(forecastSummary.selfSufficiency) > 50 ? "Excellent" : "Good"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {parseInt(forecastSummary.selfSufficiency) > 50 
                  ? "Your system produces most of your needed energy. Great job!"
                  : "Consider storing more solar energy to increase self-sufficiency."}
              </p>
            </div>

            <div className="bg-blue-50/50 dark:bg-blue-950/20 p-4 rounded-lg">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-blue-800 dark:text-blue-300 flex items-center">
                    <Battery className="mr-1 h-4 w-4" />
                    Grid Independence
                  </p>
                  <h3 className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                    {forecastSummary.gridIndependence}%
                  </h3>
                </div>
                <Badge variant="outline" className="bg-blue-100/80 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-0">
                  {parseInt(forecastSummary.gridIndependence) > 40 ? "Excellent" : "Good"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {parseInt(forecastSummary.gridIndependence) > 40
                  ? "Your system operates with minimal grid dependency."
                  : "Battery optimization could help reduce grid dependency."}
              </p>
            </div>

            <div className="bg-purple-50/50 dark:bg-purple-950/20 p-4 rounded-lg">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-purple-800 dark:text-purple-300 flex items-center">
                    <Zap className="mr-1 h-4 w-4" />
                    Energy Balance
                  </p>
                  <h3 className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">
                    {forecastSummary.gridExportRaw > forecastSummary.gridImportRaw ? "Net Export" : "Net Import"}
                  </h3>
                </div>
                <Badge variant="outline" className="bg-purple-100/80 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 border-0">
                  {forecastSummary.gridExportRaw > forecastSummary.gridImportRaw ? "Positive" : "Negative"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {forecastSummary.gridExportRaw > forecastSummary.gridImportRaw
                  ? `Exporting ${formatNumber(forecastSummary.gridExportRaw - forecastSummary.gridImportRaw, 1)} kWh more than importing.`
                  : `Importing ${formatNumber(forecastSummary.gridImportRaw - forecastSummary.gridExportRaw, 1)} kWh more than exporting.`}
              </p>
            </div>
          </div>
        )}

        {/* Optimization Recommendations */}
        {forecastSummary && (
          <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <h3 className="text-sm font-medium mb-2">Optimization Recommendations</h3>
            <ul className="space-y-2 text-sm">
              {parseInt(forecastSummary.selfSufficiency) < 50 && (
                <li className="flex items-start">
                  <Sun className="h-4 w-4 text-yellow-500 mr-2 mt-0.5" />
                  <span>Schedule high-consumption activities during peak solar production periods</span>
                </li>
              )}
              {parseInt(forecastSummary.gridIndependence) < 50 && (
                <li className="flex items-start">
                  <Battery className="h-4 w-4 text-green-500 mr-2 mt-0.5" />
                  <span>Optimize battery charging to store excess solar energy for evening use</span>
                </li>
              )}
              {forecastSummary.gridImportRaw > forecastSummary.gridExportRaw && (
                <li className="flex items-start">
                  <Zap className="h-4 w-4 text-blue-500 mr-2 mt-0.5" />
                  <span>Reduce grid import by shifting non-essential loads to high-production periods</span>
                </li>
              )}
              {forecastSummary.gridExportRaw > forecastSummary.gridImportRaw * 2 && (
                <li className="flex items-start">
                  <Power className="h-4 w-4 text-purple-500 mr-2 mt-0.5" />
                  <span>Consider adding more battery capacity to store excess energy instead of exporting</span>
                </li>
              )}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default EnergyForecastNew;