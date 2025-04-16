import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { 
  Loader2, 
  RefreshCw, 
  BarChart3, 
  TrendingUp, 
  Zap, 
  Battery, 
  Droplets, 
  Flame, 
  Sun, 
  Power, 
  MoveHorizontal 
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Register required Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface EnergyForecastProps {
  siteId: number;
}

type ForecastInterval = '1h' | '6h' | '24h' | '7d' | '30d';

export default function EnergyForecast({ siteId }: EnergyForecastProps) {
  const [interval, setInterval] = useState<ForecastInterval>('24h');

  // Get the latest forecast
  const { data: forecast, isLoading, error } = useQuery({
    queryKey: ['/api/sites', siteId, 'forecasts', 'latest', interval],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/sites/${siteId}/forecasts/latest?interval=${interval}`);
      return await res.json();
    },
    refetchOnWindowFocus: false,
  });

  // Generate a new forecast
  const generateForecastMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', `/api/sites/${siteId}/forecasts/generate?interval=${interval}`);
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['/api/sites', siteId, 'forecasts', 'latest', interval], data);
    },
  });

  // Prepare chart data if forecast is available
  const chartData = React.useMemo(() => {
    if (!forecast || !forecast.metadata || !forecast.metadata.data) {
      return null;
    }

    const data = forecast.metadata.data;
    
    // Format dates for x-axis
    const labels = data.timestamps.map((timestamp: number) => 
      format(new Date(timestamp), 'MMM d, h aaa')
    );

    return {
      labels,
      datasets: [
        {
          label: 'Production',
          data: data.production,
          borderColor: 'rgba(46, 204, 113, 1.0)',
          backgroundColor: 'rgba(46, 204, 113, 0.2)',
          fill: true,
          tension: 0.4,
        },
        {
          label: 'Consumption',
          data: data.consumption,
          borderColor: 'rgba(231, 76, 60, 1.0)',
          backgroundColor: 'rgba(231, 76, 60, 0.2)',
          fill: true,
          tension: 0.4,
        },
        {
          label: 'Grid Import',
          data: data.gridImport,
          borderColor: 'rgba(52, 152, 219, 1.0)',
          backgroundColor: 'rgba(52, 152, 219, 0.0)',
          borderDash: [5, 5],
          fill: false,
          tension: 0.4,
        },
        {
          label: 'Grid Export',
          data: data.gridExport,
          borderColor: 'rgba(155, 89, 182, 1.0)',
          backgroundColor: 'rgba(155, 89, 182, 0.0)',
          borderDash: [5, 5],
          fill: false,
          tension: 0.4,
        },
      ],
    };
  }, [forecast]);

  // Chart options
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Energy (kWh)',
        },
      },
      x: {
        title: {
          display: true,
          text: 'Time',
        },
      },
    },
    plugins: {
      legend: {
        position: 'top' as const,
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
      },
    },
  };

  // Format forecast date
  const getForecastTimeframe = () => {
    if (!forecast || !forecast.forecastDate) return 'Not available';
    
    const forecastDate = new Date(forecast.forecastDate);
    const intervalMap: Record<ForecastInterval, string> = {
      '1h': 'Hour',
      '6h': '6 Hours',
      '24h': 'Day',
      '7d': 'Week',
      '30d': 'Month'
    };
    
    return `${intervalMap[interval]} ending ${format(forecastDate, 'MMM d, yyyy h:mm a')}`;
  };

  // Calculate summary stats if forecast is available
  const summaryStats = React.useMemo(() => {
    if (!forecast || !forecast.metadata || !forecast.metadata.data) {
      return null;
    }
    
    const data = forecast.metadata.data;
    
    // Calculate total values
    const totalProduction = data.production.reduce((sum: number, val: number) => sum + val, 0);
    const totalConsumption = data.consumption.reduce((sum: number, val: number) => sum + val, 0);
    const totalGridImport = data.gridImport.reduce((sum: number, val: number) => sum + val, 0);
    const totalGridExport = data.gridExport.reduce((sum: number, val: number) => sum + val, 0);
    
    // Calculate self-sufficiency (how much of consumption is covered by production)
    const selfSufficiency = totalConsumption > 0 
      ? Math.min(100, (totalProduction / totalConsumption) * 100) 
      : 0;
      
    // Calculate grid independence (how much we don't need to import)
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

  return (
    <Card className="w-full bg-gradient-to-br from-background to-background border-2">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <CardTitle className="text-xl bg-gradient-to-br from-primary to-primary/80 bg-clip-text text-transparent font-bold">
              Energy Forecasts & Optimization
            </CardTitle>
          </div>
          <CardDescription>Predicted energy flow with optimization opportunities</CardDescription>
        </div>
        <div className="flex space-x-2">
          <Select
            value={interval}
            onValueChange={(value) => setInterval(value as ForecastInterval)}
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Interval" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1h">1 Hour</SelectItem>
              <SelectItem value="6h">6 Hours</SelectItem>
              <SelectItem value="24h">24 Hours</SelectItem>
              <SelectItem value="7d">7 Days</SelectItem>
              <SelectItem value="30d">30 Days</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => generateForecastMutation.mutate()}
            disabled={generateForecastMutation.isPending}
            className="bg-primary/10 hover:bg-primary/20 text-primary border-primary/20"
          >
            {generateForecastMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        {isLoading || generateForecastMutation.isPending ? (
          <div className="flex items-center justify-center h-80">
            <div className="text-center">
              <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
              <p className="text-muted-foreground">Generating energy forecast...</p>
            </div>
          </div>
        ) : error ? (
          <Alert variant="destructive">
            <AlertTitle>Error loading forecast</AlertTitle>
            <AlertDescription>
              {error instanceof Error ? error.message : 'Failed to load forecast data'}
            </AlertDescription>
          </Alert>
        ) : forecast ? (
          <Tabs defaultValue="forecast" className="w-full">
            <TabsList className="mb-4 w-full max-w-md mx-auto grid grid-cols-2">
              <TabsTrigger value="forecast" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" /> Energy Forecast
              </TabsTrigger>
              <TabsTrigger value="optimization" className="flex items-center gap-2">
                <Zap className="h-4 w-4" /> Optimization Insights
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="forecast" className="mt-0">
              <div className="mb-4 flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  <span className="font-medium">Forecast Period:</span> {getForecastTimeframe()}
                  {forecast.confidence && 
                    <Badge variant="outline" className="ml-2 bg-primary/10 text-primary border-0">
                      {Math.round(Number(forecast.confidence) * 100)}% confidence
                    </Badge>
                  }
                </div>
                
                {summaryStats && (
                  <div className="flex gap-2">
                    <Badge variant="outline" className="bg-[rgba(46,204,113,0.1)] text-[rgba(46,204,113,1.0)] border-0">
                      <Sun className="h-3 w-3 mr-1" /> {summaryStats.totalProduction} kWh
                    </Badge>
                    <Badge variant="outline" className="bg-[rgba(231,76,60,0.1)] text-[rgba(231,76,60,1.0)] border-0">
                      <Flame className="h-3 w-3 mr-1" /> {summaryStats.totalConsumption} kWh
                    </Badge>
                  </div>
                )}
              </div>
              
              <div className="h-72 bg-card/50 rounded-lg p-2">
                {chartData ? (
                  <Line data={chartData} options={options} />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-muted-foreground">No forecast data available</p>
                  </div>
                )}
              </div>

              {summaryStats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4">
                  <Card className="bg-[rgba(46,204,113,0.1)] border-0">
                    <CardContent className="p-3">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-xs text-muted-foreground">Production</p>
                          <p className="text-lg font-semibold text-[rgba(46,204,113,1.0)]">{summaryStats.totalProduction} kWh</p>
                        </div>
                        <Sun className="h-8 w-8 text-[rgba(46,204,113,1.0)] opacity-80" />
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-[rgba(231,76,60,0.1)] border-0">
                    <CardContent className="p-3">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-xs text-muted-foreground">Consumption</p>
                          <p className="text-lg font-semibold text-[rgba(231,76,60,1.0)]">{summaryStats.totalConsumption} kWh</p>
                        </div>
                        <Flame className="h-8 w-8 text-[rgba(231,76,60,1.0)] opacity-80" />
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-[rgba(52,152,219,0.1)] border-0">
                    <CardContent className="p-3">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-xs text-muted-foreground">Grid Import</p>
                          <p className="text-lg font-semibold text-[rgba(52,152,219,1.0)]">{summaryStats.totalGridImport} kWh</p>
                        </div>
                        <MoveHorizontal className="h-8 w-8 text-[rgba(52,152,219,1.0)] opacity-80" />
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-[rgba(155,89,182,0.1)] border-0">
                    <CardContent className="p-3">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-xs text-muted-foreground">Grid Export</p>
                          <p className="text-lg font-semibold text-[rgba(155,89,182,1.0)]">{summaryStats.totalGridExport} kWh</p>
                        </div>
                        <Power className="h-8 w-8 text-[rgba(155,89,182,1.0)] opacity-80" />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="optimization" className="mt-0">
              <div className="bg-card/50 rounded-lg p-4 mb-4">
                <h3 className="text-lg font-semibold mb-2 flex items-center">
                  <Zap className="h-5 w-5 mr-2 text-primary" />
                  Optimization Insights
                </h3>
                
                {summaryStats && (
                  <div className="space-y-4">
                    <div className="flex flex-col space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Self-Sufficiency</span>
                        <Badge variant={Number(summaryStats.selfSufficiency) > 50 ? "success" : "outline"}>
                          {summaryStats.selfSufficiency}%
                        </Badge>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2.5">
                        <div 
                          className="bg-primary h-2.5 rounded-full" 
                          style={{ width: `${summaryStats.selfSufficiency}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Percentage of your energy needs covered by your own production.
                      </p>
                    </div>
                    
                    <div className="flex flex-col space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Grid Independence</span>
                        <Badge variant={Number(summaryStats.gridIndependence) > 70 ? "success" : "outline"}>
                          {summaryStats.gridIndependence}%
                        </Badge>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2.5">
                        <div 
                          className="bg-primary h-2.5 rounded-full" 
                          style={{ width: `${summaryStats.gridIndependence}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        How much you can operate without relying on grid imports.
                      </p>
                    </div>
                    
                    <div className="border-t border-border pt-3 mt-3">
                      <h4 className="font-medium text-sm mb-2">Optimization Recommendations</h4>
                      <ul className="space-y-2">
                        <li className="flex items-start gap-2">
                          <Battery className="h-4 w-4 mt-0.5 text-green-500" />
                          <span className="text-sm">
                            {Number(summaryStats.selfSufficiency) < 70 
                              ? "Consider adding more battery storage to increase self-sufficiency." 
                              : "Battery storage is well-optimized for your current usage patterns."}
                          </span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Sun className="h-4 w-4 mt-0.5 text-yellow-500" />
                          <span className="text-sm">
                            {Number(summaryStats.gridExport) > Number(summaryStats.gridImport) * 1.5
                              ? "You're exporting significant excess energy. Consider time-shifting loads to increase self-consumption."
                              : "Your solar production is well-balanced with your consumption patterns."}
                          </span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Droplets className="h-4 w-4 mt-0.5 text-blue-500" />
                          <span className="text-sm">
                            Shift flexible loads (EV charging, water heating) to high production periods to maximize savings.
                          </span>
                        </li>
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        ) : (
          <div className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">No forecast data available</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}