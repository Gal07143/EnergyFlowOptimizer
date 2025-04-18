import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { queryClient, apiRequest } from '@/lib/queryClient';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Battery, Zap, BarChart2, Clock, Calendar, RefreshCw, Info } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useSiteContext } from '@/hooks/use-site-context';

// Types for arbitrage strategies
type ArbitrageStrategy = 
  | 'simple_threshold'
  | 'time_of_use'
  | 'dynamic_price'
  | 'peak_shaving'
  | 'self_consumption'
  | 'ai_optimized'
  | 'lifecycle_optimized'
  | 'grid_services';

// Strategy info
const strategyInfo = {
  simple_threshold: {
    name: 'Simple Threshold',
    description: 'Charge when prices are low, discharge when prices are high based on simple thresholds',
    icon: <Zap className="h-5 w-5" />,
    complexity: 'Low',
    impact: {
      savings: 'Medium',
      battery: 'Medium'
    }
  },
  time_of_use: {
    name: 'Time of Use',
    description: 'Optimize based on fixed time-of-use tariff schedules',
    icon: <Clock className="h-5 w-5" />,
    complexity: 'Low',
    impact: {
      savings: 'Medium',
      battery: 'Medium-High'
    }
  },
  dynamic_price: {
    name: 'Dynamic Price',
    description: 'Optimize based on forecasted prices and price volatility',
    icon: <BarChart2 className="h-5 w-5" />,
    complexity: 'Medium',
    impact: {
      savings: 'High',
      battery: 'High'
    }
  },
  peak_shaving: {
    name: 'Peak Shaving',
    description: 'Reduce peak demand charges by discharging during peak periods',
    icon: <Battery className="h-5 w-5" />,
    complexity: 'Medium',
    impact: {
      savings: 'High',
      battery: 'Medium'
    }
  },
  self_consumption: {
    name: 'Self Consumption',
    description: 'Maximize self-consumption of on-site generation (solar PV)',
    icon: <Zap className="h-5 w-5" />,
    complexity: 'Medium',
    impact: {
      savings: 'Medium',
      battery: 'Low'
    }
  },
  ai_optimized: {
    name: 'AI Optimized',
    description: 'Use advanced AI to optimize battery usage based on multiple factors',
    icon: <Zap className="h-5 w-5" />,
    complexity: 'High',
    impact: {
      savings: 'Very High',
      battery: 'Medium-High'
    }
  },
  lifecycle_optimized: {
    name: 'Lifecycle Optimized',
    description: 'Optimize for battery longevity while still capturing value',
    icon: <Battery className="h-5 w-5" />,
    complexity: 'Medium',
    impact: {
      savings: 'Medium',
      battery: 'Low'
    }
  },
  grid_services: {
    name: 'Grid Services',
    description: 'Provide grid services like frequency regulation to earn revenue',
    icon: <Zap className="h-5 w-5" />,
    complexity: 'High',
    impact: {
      savings: 'High',
      battery: 'Low'
    }
  }
};

const BatteryArbitragePage = () => {
  const { toast } = useToast();
  const { currentSiteId } = useSiteContext();
  const [activeTab, setActiveTab] = useState('strategies');

  // Fetch active strategies
  const { data: activeStrategies = [], isLoading: isLoadingStrategies } = useQuery({
    queryKey: ['/api/arbitrage/strategies', currentSiteId],
    queryFn: async () => {
      try {
        const res = await apiRequest('GET', `/api/arbitrage/strategies?siteId=${currentSiteId}`);
        return await res.json();
      } catch (error) {
        console.error('Error fetching active strategies:', error);
        return [];
      }
    },
    enabled: !!currentSiteId,
  });

  // Fetch arbitrage performance
  const { data: performance, isLoading: isLoadingPerformance } = useQuery({
    queryKey: ['/api/arbitrage/performance', currentSiteId],
    queryFn: async () => {
      try {
        const res = await apiRequest('GET', `/api/arbitrage/performance?siteId=${currentSiteId}`);
        return await res.json();
      } catch (error) {
        console.error('Error fetching arbitrage performance:', error);
        return {
          totalSavings: 0,
          cyclesUsed: 0,
          lastOptimizationTime: null,
          forecastAccuracy: 0
        };
      }
    },
    enabled: !!currentSiteId,
  });

  // Fetch optimization result
  const { data: optimizationResult, isLoading: isLoadingOptimization } = useQuery({
    queryKey: ['/api/arbitrage/optimization', currentSiteId],
    queryFn: async () => {
      try {
        const res = await apiRequest('GET', `/api/arbitrage/optimization?siteId=${currentSiteId}`);
        return await res.json();
      } catch (error) {
        console.error('Error fetching optimization result:', error);
        return null;
      }
    },
    enabled: !!currentSiteId,
  });

  // Toggle strategy mutation
  const toggleStrategyMutation = useMutation({
    mutationFn: async ({ strategy, enabled }: { strategy: ArbitrageStrategy, enabled: boolean }) => {
      const action = enabled ? 'enable' : 'disable';
      const res = await apiRequest('POST', `/api/arbitrage/${action}`, {
        siteId: currentSiteId,
        strategy
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/arbitrage/strategies', currentSiteId] });
      toast({
        title: 'Strategy Updated',
        description: 'The arbitrage strategy has been updated successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to update strategy: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  // Run optimization mutation
  const runOptimizationMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/arbitrage/optimize', {
        siteId: currentSiteId
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/arbitrage/optimization', currentSiteId] });
      queryClient.invalidateQueries({ queryKey: ['/api/arbitrage/performance', currentSiteId] });
      toast({
        title: 'Optimization Complete',
        description: 'Battery arbitrage optimization has been run successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to run optimization: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  // Handle strategy toggle
  const handleStrategyToggle = (strategy: ArbitrageStrategy, checked: boolean) => {
    toggleStrategyMutation.mutate({ strategy, enabled: checked });
  };

  // Handle run optimization
  const handleRunOptimization = () => {
    runOptimizationMutation.mutate();
  };

  // Check if a strategy is active
  const isStrategyActive = (strategy: ArbitrageStrategy) => {
    return activeStrategies.includes(strategy);
  };

  // Format date
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex flex-col space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Battery Arbitrage</h1>
            <p className="text-muted-foreground">
              Optimize battery charging and discharging for maximum savings
            </p>
          </div>
          <Button 
            onClick={handleRunOptimization} 
            disabled={runOptimizationMutation.isPending}
            className="flex items-center gap-2"
          >
            {runOptimizationMutation.isPending ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Zap className="h-4 w-4" />
            )}
            Run Optimization
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium">Total Savings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${performance?.totalSavings?.toFixed(2) || '0.00'}
              </div>
              <p className="text-xs text-muted-foreground">
                Last updated: {formatDate(performance?.lastOptimizationTime)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium">Battery Cycles Used</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {performance?.cyclesUsed?.toFixed(1) || '0.0'}
              </div>
              <Progress value={Math.min((performance?.cyclesUsed || 0) * 10, 100)} className="mt-2" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium">Forecast Accuracy</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Math.round((performance?.forecastAccuracy || 0) * 100)}%
              </div>
              <Progress value={(performance?.forecastAccuracy || 0) * 100} className="mt-2" />
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="strategies" value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="strategies">Strategies</TabsTrigger>
            <TabsTrigger value="schedule">Schedule</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
          </TabsList>
          
          <TabsContent value="strategies">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
              {Object.entries(strategyInfo).map(([key, info]) => {
                const strategyKey = key as ArbitrageStrategy;
                const isActive = isStrategyActive(strategyKey);
                
                return (
                  <Card key={key} className={isActive ? 'border-primary/50' : ''}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="rounded-full bg-primary/10 p-2">
                          {info.icon}
                        </div>
                        <Switch 
                          checked={isActive}
                          onCheckedChange={(checked) => handleStrategyToggle(strategyKey, checked)}
                          disabled={toggleStrategyMutation.isPending}
                        />
                      </div>
                      <CardTitle className="text-base font-medium mt-2">{info.name}</CardTitle>
                      <CardDescription>{info.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between text-sm">
                        <div>
                          <p className="text-muted-foreground">Complexity</p>
                          <p className="font-medium">{info.complexity}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Savings</p>
                          <p className="font-medium">{info.impact.savings}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Battery Impact</p>
                          <p className="font-medium">{info.impact.battery}</p>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter>
                      {isActive && (
                        <Badge variant="outline" className="bg-primary/10">
                          Active
                        </Badge>
                      )}
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
          
          <TabsContent value="schedule">
            <Card>
              <CardHeader>
                <CardTitle>Optimization Schedule</CardTitle>
                <CardDescription>
                  Current battery charge/discharge schedule based on selected strategies
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingOptimization ? (
                  <div className="flex justify-center py-8">
                    <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : !optimizationResult || !optimizationResult.schedules || optimizationResult.schedules.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Battery className="h-16 w-16 text-muted-foreground mb-4" />
                    <h3 className="text-xl font-medium">No Active Schedule</h3>
                    <p className="text-muted-foreground mt-2 max-w-md">
                      Enable at least one arbitrage strategy and run the optimization to generate a battery schedule.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <div className="min-w-[800px]">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <p className="text-sm font-medium">Expected Savings</p>
                          <p className="text-lg font-bold">${optimizationResult.expectedSavings.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium">Strategy</p>
                          <p className="text-lg font-bold">
                            {strategyInfo[optimizationResult.strategy as ArbitrageStrategy]?.name || 'Multiple'}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium">Battery Impact</p>
                          <p className="text-lg font-bold">{optimizationResult.batteryImpact.toFixed(1)} cycles</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-24 gap-1">
                        {/* Time headers */}
                        {Array.from({ length: 24 }).map((_, i) => (
                          <div key={i} className="text-center text-xs text-muted-foreground">
                            {i}:00
                          </div>
                        ))}
                        
                        {/* Battery schedules */}
                        {optimizationResult.schedules.map((batterySchedule: any, index: number) => (
                          <React.Fragment key={batterySchedule.batteryId}>
                            <div className="col-span-24 pl-2 pt-4 pb-1 text-sm font-medium">
                              Battery {index + 1} (ID: {batterySchedule.batteryId})
                            </div>
                            {batterySchedule.schedule.slice(0, 24).map((hour: any, hourIndex: number) => {
                              let bgColor = 'bg-muted';
                              if (hour.action === 'charge') bgColor = 'bg-green-100 dark:bg-green-900';
                              if (hour.action === 'discharge') bgColor = 'bg-blue-100 dark:bg-blue-900';
                              
                              return (
                                <TooltipProvider key={hourIndex}>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div className={`h-10 rounded ${bgColor} flex items-center justify-center`}>
                                        {hour.action === 'charge' && <Battery className="h-4 w-4 text-green-600 dark:text-green-400" />}
                                        {hour.action === 'discharge' && <Zap className="h-4 w-4 text-blue-600 dark:text-blue-400" />}
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p><strong>Time:</strong> {new Date(hour.time).toLocaleTimeString()}</p>
                                      <p><strong>Action:</strong> {hour.action}</p>
                                      <p><strong>Power:</strong> {hour.power}kW</p>
                                      {hour.price && <p><strong>Price:</strong> ${hour.price.toFixed(4)}/kWh</p>}
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              );
                            })}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="performance">
            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
                <CardDescription>
                  Historical performance of the battery arbitrage system
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingPerformance ? (
                  <div className="flex justify-center py-8">
                    <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="flex flex-col space-y-8">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                      <Card>
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-base font-medium">Daily Savings</CardTitle>
                            <Zap className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">
                            ${((performance?.totalSavings || 0) / 30).toFixed(2)}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Average per day (last 30 days)
                          </p>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-base font-medium">Annual Projection</CardTitle>
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">
                            ${((performance?.totalSavings || 0) / 30 * 365).toFixed(2)}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Estimated annual savings
                          </p>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-base font-medium">Battery Efficiency</CardTitle>
                            <Battery className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">
                            ${(performance?.totalSavings || 0) / (performance?.cyclesUsed || 1)}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Savings per battery cycle
                          </p>
                        </CardContent>
                      </Card>
                    </div>
                    
                    <div className="flex items-center justify-center py-8">
                      <div className="text-center max-w-md">
                        <Info className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-xl font-medium">Performance History</h3>
                        <p className="text-muted-foreground mt-2">
                          Detailed performance charts and historical data will be available in future updates.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default BatteryArbitragePage;