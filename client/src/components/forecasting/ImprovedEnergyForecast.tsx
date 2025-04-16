import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatNumber } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Zap, Battery, Sun, Home, PlugZap, AreaChart, ArrowUpRight, Calendar, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EnergyForecastProps {
  siteId: number;
  className?: string;
}

const timeframes = [
  { id: 'today', label: 'Today' },
  { id: 'tomorrow', label: 'Tomorrow' },
  { id: '7days', label: '7 days' }
];

const ImprovedEnergyForecast: React.FC<EnergyForecastProps> = ({ siteId, className }) => {
  const [activeTimeframe, setActiveTimeframe] = useState('today');
  const [activeTab, setActiveTab] = useState('production');
  
  // Fetch energy forecast data
  const { data: forecastData, isLoading, error, refetch } = useQuery({
    queryKey: ['/api/sites', siteId, 'forecasts', activeTimeframe],
    queryFn: async () => {
      const res = await fetch(`/api/sites/${siteId}/forecasts/latest`);
      if (!res.ok) throw new Error('Failed to fetch forecast data');
      return await res.json();
    },
    enabled: !!siteId
  });

  if (isLoading) {
    return (
      <Card className={cn("w-full", className)}>
        <CardHeader>
          <CardTitle>
            <Skeleton className="h-6 w-64" />
          </CardTitle>
          <CardDescription>
            <Skeleton className="h-4 w-48" />
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={cn("w-full", className)}>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Zap className="mr-2 h-5 w-5 text-primary" />
            Energy Forecasts & Optimization
          </CardTitle>
          <CardDescription>
            Error loading forecast data
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-muted-foreground mb-4">
            {error instanceof Error ? error.message : 'Failed to load forecast data'}
          </p>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => refetch()}
            className="mx-auto"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Prepare chart data
  const getChartData = () => {
    if (!forecastData) return null;
    
    // These are example values for the chart - in a real app, this would come from the backend
    const chartHours = Array.from({ length: 24 }, (_, i) => i);
    
    let solarData = chartHours.map(hour => {
      // Solar generation peaks at midday
      const baseValue = hour >= 6 && hour <= 20 
        ? Math.sin((hour - 6) * Math.PI / 14) * 3.5 
        : 0;
      return Math.max(0, baseValue + (Math.random() * 0.5 - 0.25));
    });
    
    let consumptionData = chartHours.map(hour => {
      // Morning peak and evening peak
      let baseValue = 0.8;
      if (hour >= 6 && hour <= 9) baseValue = 1.5; // Morning peak
      if (hour >= 17 && hour <= 22) baseValue = 2.2; // Evening peak
      if (hour >= 23 || hour <= 5) baseValue = 0.5; // Night low
      
      return baseValue + (Math.random() * 0.4 - 0.2);
    });
    
    let batteryData = chartHours.map(hour => {
      // Battery discharges in evening, charges in day
      let baseValue = 0;
      if (hour >= 17 && hour <= 22) baseValue = 1.2; // Evening discharge
      if (hour >= 10 && hour <= 16) baseValue = -0.8; // Day charging
      
      return baseValue + (Math.random() * 0.3 - 0.15);
    });
    
    let gridData = chartHours.map((hour, i) => {
      // Grid is used when consumption exceeds production + battery
      const total = consumptionData[i] - solarData[i] - (batteryData[i] > 0 ? batteryData[i] : 0);
      return Math.max(0, total);
    });
    
    return {
      hours: chartHours,
      solar: solarData,
      consumption: consumptionData,
      battery: batteryData,
      grid: gridData
    };
  };

  const chartData = getChartData();
  
  // Calculate forecast metrics
  const getSelfSufficiencyRate = () => {
    if (!chartData) return 0;
    
    const totalConsumption = chartData.consumption.reduce((sum, val) => sum + val, 0);
    const totalSolar = chartData.solar.reduce((sum, val) => sum + val, 0);
    const totalBatteryDischarge = chartData.battery
      .filter(val => val > 0)
      .reduce((sum, val) => sum + val, 0);
    
    // Self-sufficiency = (solar + battery discharge) / consumption
    return Math.min(100, Math.round((totalSolar + totalBatteryDischarge) / totalConsumption * 100));
  };
  
  const getGridIndependenceRate = () => {
    if (!chartData) return 0;
    
    const totalConsumption = chartData.consumption.reduce((sum, val) => sum + val, 0);
    const totalGrid = chartData.grid.reduce((sum, val) => sum + val, 0);
    
    // Grid independence = (1 - grid / consumption) * 100
    return Math.min(100, Math.round((1 - totalGrid / totalConsumption) * 100));
  };
  
  const selfSufficiencyRate = getSelfSufficiencyRate();
  const gridIndependenceRate = getGridIndependenceRate();

  // Calculate max value for chart scaling
  const getMaxValue = () => {
    if (!chartData) return 5;
    
    const allValues = [
      ...chartData.solar,
      ...chartData.consumption,
      ...chartData.battery.map(v => Math.abs(v)),
      ...chartData.grid
    ];
    
    return Math.max(...allValues, 3) * 1.1; // Add 10% margin
  };
  
  const maxValue = getMaxValue();

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center">
              <Zap className="mr-2 h-5 w-5 text-primary" />
              Energy Forecasts & Optimization
            </CardTitle>
            <CardDescription>
              Predict production & consumption to optimize your energy flow
            </CardDescription>
          </div>
          
          <Tabs value={activeTimeframe} onValueChange={setActiveTimeframe} className="w-auto ml-auto">
            <TabsList className="h-8">
              {timeframes.map(tf => (
                <TabsTrigger key={tf.id} value={tf.id} className="text-xs px-3">
                  {tf.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left side - Chart and summary */}
          <div className="md:col-span-2">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="w-full mb-4">
                <TabsTrigger value="production" className="flex-1">Production and consumption</TabsTrigger>
                <TabsTrigger value="daily" className="flex-1">Daily balance</TabsTrigger>
                <TabsTrigger value="weekly" className="flex-1">Weekly balance</TabsTrigger>
              </TabsList>
              
              <TabsContent value="production" className="mt-0">
                <div className="h-64 relative">
                  {/* Chart visualization */}
                  {chartData && (
                    <div className="inset-0 absolute">
                      {/* Time labels on x-axis */}
                      <div className="absolute left-0 right-0 bottom-0 flex justify-between text-xs text-muted-foreground px-2">
                        {[0, 6, 12, 18, 23].map(hour => (
                          <span key={hour}>{hour}:00</span>
                        ))}
                      </div>
                      
                      {/* Chart grid lines */}
                      <div className="absolute inset-0 flex flex-col justify-between pb-5">
                        {[0, 1, 2, 3].map(i => (
                          <div key={i} className="border-t border-gray-200 dark:border-gray-700 w-full h-0"></div>
                        ))}
                      </div>
                      
                      {/* Chart bars/lines */}
                      <div className="absolute inset-0 flex pb-5 pt-1">
                        {chartData.hours.map((hour, i) => {
                          const solarHeight = (chartData.solar[i] / maxValue) * 100;
                          const consumptionHeight = (chartData.consumption[i] / maxValue) * 100;
                          const batteryHeight = (Math.abs(chartData.battery[i]) / maxValue) * 100;
                          const gridHeight = (chartData.grid[i] / maxValue) * 100;
                          
                          return (
                            <div key={hour} className="flex-1 flex flex-col items-center justify-end relative">
                              {/* Solar production - yellow bar */}
                              {chartData.solar[i] > 0 && (
                                <div 
                                  className="w-2.5 bg-yellow-400 rounded-sm absolute bottom-0 mb-[2px]"
                                  style={{ height: `${solarHeight}%`, left: 'calc(50% - 5px)' }}
                                ></div>
                              )}
                              
                              {/* Consumption - purple line */}
                              <div className="absolute bottom-0 left-0 right-0 flex items-center justify-center">
                                <div className="w-3 h-3 bg-purple-500 rounded-full z-10"></div>
                                {i < chartData.hours.length - 1 && (
                                  <div className="h-0.5 bg-purple-500 w-full absolute right-0" style={{ width: '100%' }}></div>
                                )}
                              </div>
                              
                              {/* Battery - green/red bar */}
                              {Math.abs(chartData.battery[i]) > 0.1 && (
                                <div 
                                  className={`w-2.5 rounded-sm absolute bottom-0 ${chartData.battery[i] > 0 ? 'bg-green-500' : 'bg-red-500'}`}
                                  style={{ 
                                    height: `${batteryHeight}%`, 
                                    left: 'calc(50% + 5px)',
                                    bottom: chartData.battery[i] < 0 ? '0' : 'auto',
                                    top: chartData.battery[i] > 0 ? '0' : 'auto',
                                  }}
                                ></div>
                              )}
                              
                              {/* Grid - blue bar */}
                              {chartData.grid[i] > 0.1 && (
                                <div 
                                  className="w-2.5 bg-blue-500 rounded-sm absolute bottom-0"
                                  style={{ 
                                    height: `${gridHeight}%`, 
                                    left: 'calc(50% - 15px)',
                                  }}
                                ></div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Chart legend */}
                <div className="flex flex-wrap justify-center gap-4 mt-2">
                  <div className="flex items-center">
                    <Sun className="h-4 w-4 text-yellow-400 mr-1" />
                    <span className="text-xs">Solar Production</span>
                  </div>
                  <div className="flex items-center">
                    <Home className="h-4 w-4 text-purple-500 mr-1" />
                    <span className="text-xs">Consumption</span>
                  </div>
                  <div className="flex items-center">
                    <Battery className="h-4 w-4 text-green-500 mr-1" />
                    <span className="text-xs">Battery</span>
                  </div>
                  <div className="flex items-center">
                    <Zap className="h-4 w-4 text-blue-500 mr-1" />
                    <span className="text-xs">Grid</span>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="daily" className="mt-0">
                <div className="h-64 flex items-center justify-center text-center">
                  <div>
                    <AreaChart className="h-16 w-16 text-primary mx-auto mb-2" />
                    <p className="text-muted-foreground">Daily energy balance chart coming soon</p>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="weekly" className="mt-0">
                <div className="h-64 flex items-center justify-center text-center">
                  <div>
                    <Calendar className="h-16 w-16 text-primary mx-auto mb-2" />
                    <p className="text-muted-foreground">Weekly energy balance chart coming soon</p>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
          
          {/* Right side - Performance metrics */}
          <div className="space-y-6">
            {/* Self-sufficiency rate */}
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
              <h3 className="text-sm font-medium mb-2 flex items-center">
                <Sun className="h-4 w-4 mr-2 text-green-500" />
                Self-sufficiency rate
              </h3>
              
              <div className="flex items-end justify-between mb-2">
                <div>
                  <span className="text-3xl font-bold text-green-600 dark:text-green-400">{selfSufficiencyRate}%</span>
                </div>
                <Badge variant="outline" className="bg-green-100 dark:bg-green-800/30 text-green-800 dark:text-green-200">
                  <ArrowUpRight className="h-3 w-3 mr-1" />
                  +5%
                </Badge>
              </div>
              
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full">
                <div 
                  className="h-2 bg-green-500 rounded-full" 
                  style={{ width: `${selfSufficiencyRate}%` }}
                ></div>
              </div>
              
              <p className="text-xs text-muted-foreground mt-2">
                Energy produced on-site vs. total energy consumed
              </p>
            </div>
            
            {/* Grid independence */}
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <h3 className="text-sm font-medium mb-2 flex items-center">
                <Zap className="h-4 w-4 mr-2 text-blue-500" />
                Grid independence
              </h3>
              
              <div className="flex items-end justify-between mb-2">
                <div>
                  <span className="text-3xl font-bold text-blue-600 dark:text-blue-400">{gridIndependenceRate}%</span>
                </div>
                <Badge variant="outline" className="bg-blue-100 dark:bg-blue-800/30 text-blue-800 dark:text-blue-200">
                  <ArrowUpRight className="h-3 w-3 mr-1" />
                  +8%
                </Badge>
              </div>
              
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full">
                <div 
                  className="h-2 bg-blue-500 rounded-full" 
                  style={{ width: `${gridIndependenceRate}%` }}
                ></div>
              </div>
              
              <p className="text-xs text-muted-foreground mt-2">
                Time operating without grid power
              </p>
            </div>
            
            {/* Optimization recommendations */}
            <div className="border border-gray-200 dark:border-gray-700 p-4 rounded-lg">
              <h3 className="text-sm font-medium mb-3">Optimization recommendations</h3>
              
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <div className="bg-amber-100 dark:bg-amber-800/30 rounded-full p-1 mt-0.5">
                    <Battery className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div className="text-xs">
                    <p className="font-medium">Charge battery now</p>
                    <p className="text-muted-foreground">Low electricity prices for the next 2 hours</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-2">
                  <div className="bg-purple-100 dark:bg-purple-800/30 rounded-full p-1 mt-0.5">
                    <PlugZap className="h-3 w-3 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div className="text-xs">
                    <p className="font-medium">Delay EV charging</p>
                    <p className="text-muted-foreground">Better to charge after 10 PM at lower rates</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ImprovedEnergyForecast;