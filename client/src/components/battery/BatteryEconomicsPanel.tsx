import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";
import {
  LineChart,
  BarChart,
  PieChart,
  CandlestickChart,
  DollarSign,
  TrendingUp,
  BatteryCharging,
  Clock,
  Calendar,
  AlertTriangle,
  PiggyBank,
  ArrowUpDown,
  Sparkles,
  Zap,
  BarChart3,
  CircleDollarSign,
  Coins,
  Banknote,
} from "lucide-react";

interface BatteryEconomicsPanelProps {
  deviceId: number;
}

const BatteryEconomicsPanel: React.FC<BatteryEconomicsPanelProps> = ({ deviceId }) => {
  const [optimizationMode, setOptimizationMode] = useState<string>("cost_saving");
  const [timeframe, setTimeframe] = useState<string>("day");
  
  // Fetch device data
  const { data: device, isLoading: deviceLoading } = useQuery({
    queryKey: [`/api/devices/${deviceId}`],
  });
  
  // Fetch tariff data (when API is implemented)
  const { data: tariffData, isLoading: tariffLoading } = useQuery({
    queryKey: [`/api/devices/${deviceId}/tariff`],
    enabled: false, // Disabled until we implement the API
  });
  
  // Mock data for now - will be replaced with actual API data
  const mockEconomicsData = {
    optimizationProfiles: [
      { id: "cost_saving", name: "Cost Saving", primaryMetric: "Cost reduction" },
      { id: "self_sufficiency", name: "Self Sufficiency", primaryMetric: "Grid independence" },
      { id: "peak_shaving", name: "Peak Shaving", primaryMetric: "Peak demand reduction" },
      { id: "battery_life", name: "Battery Life", primaryMetric: "Lifespan extension" },
      { id: "tariff_optimization", name: "Tariff Optimization", primaryMetric: "TOU tariff savings" },
      { id: "arbitrage", name: "Energy Arbitrage", primaryMetric: "Trading profit" },
    ],
    costSavings: {
      daily: 8.4,
      weekly: 54.9,
      monthly: 238.6,
      yearly: 2875.2,
      lifetime: 11520.8
    },
    projectedSavings: [
      { period: "Day", value: 9.2 },
      { period: "Week", value: 58.6 },
      { period: "Month", value: 245.3 },
      { period: "Year", value: 2938.4 }
    ],
    batteryLifeImpact: {
      withOptimization: 96, // months
      withoutOptimization: 72, // months
      lifetimeExtension: 24, // months
      financialBenefit: 3200 // $
    },
    tariffAnalysis: {
      currentRate: 0.28, // $/kWh
      currentTariffPeriod: "mid-peak",
      nextTariffChange: "18:00", // Time when tariff changes next
      nextTariffRate: 0.42, // $/kWh
      nextTariffPeriod: "peak",
      optimalChargeTimes: [
        { startTime: "02:00", endTime: "06:00", rate: 0.15, ratePeriod: "off-peak" },
        { startTime: "13:00", endTime: "16:00", rate: 0.28, ratePeriod: "mid-peak" }
      ],
      optimalDischargeTimes: [
        { startTime: "18:00", endTime: "21:00", rate: 0.42, ratePeriod: "peak" },
        { startTime: "07:30", endTime: "09:30", rate: 0.35, ratePeriod: "peak" }
      ]
    },
    arbitrageOpportunities: [
      {
        buyTime: "02:30",
        buyRate: 0.15,
        sellTime: "19:00",
        sellRate: 0.42,
        potentialProfit: 0.27, // $/kWh
        recommendedVolume: 5.2, // kWh
        totalProfit: 1.4 // $
      },
      {
        buyTime: "14:00",
        buyRate: 0.28,
        sellTime: "20:00",
        sellRate: 0.42,
        potentialProfit: 0.14, // $/kWh
        recommendedVolume: 3.8, // kWh
        totalProfit: 0.53 // $
      }
    ],
    adaptiveStrategies: [
      {
        id: "israeli_tou_weekday",
        name: "Israeli TOU Weekday",
        description: "Optimized for Israeli electricity time-of-use tariffs on weekdays",
        recommendedDays: ["Monday", "Tuesday", "Wednesday", "Thursday"],
        estimatedSavings: 32.4, // $ per month
        chargingWindows: [
          { startTime: "00:00", endTime: "06:30", priority: "high" },
          { startTime: "16:00", endTime: "17:00", priority: "medium" }
        ],
        dischargingWindows: [
          { startTime: "17:00", endTime: "22:00", priority: "high" },
          { startTime: "07:00", endTime: "09:00", priority: "medium" }
        ]
      },
      {
        id: "israeli_tou_weekend",
        name: "Israeli TOU Weekend",
        description: "Optimized for Israeli electricity time-of-use tariffs on weekends",
        recommendedDays: ["Friday", "Saturday"],
        estimatedSavings: 14.8, // $ per month
        chargingWindows: [
          { startTime: "00:00", endTime: "08:00", priority: "medium" },
          { startTime: "14:00", endTime: "16:00", priority: "low" }
        ],
        dischargingWindows: [
          { startTime: "18:00", endTime: "22:00", priority: "medium" }
        ]
      }
    ],
    economicHealthScore: 84, // 0-100
    currentStrategy: "israeli_tou_weekday",
    lifetimeValue: {
      savingsToDate: 1285.75, // $
      projectedLifetimeSavings: 11520.8, // $
      replacementCost: 5200, // $
      currentValue: 3800, // $
      roi: 2.2, // ratio
      paybackPeriod: 42 // months
    }
  };
  
  // Use mock data for now
  const data = mockEconomicsData;
  
  // Format currency
  const formatCurrency = (value: number, currency: string = "$"): string => {
    return `${currency}${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };
  
  // Format time
  const formatTime = (timeString: string): string => {
    return timeString;
  };
  
  // Get optimization profile details
  const getActiveProfile = () => {
    return data.optimizationProfiles.find(profile => profile.id === optimizationMode) || data.optimizationProfiles[0];
  };
  
  // Calculate percentage increase
  const calculateIncrease = (optimized: number, baseline: number): number => {
    return Math.round((optimized - baseline) / baseline * 100);
  };
  
  // Get savings for current timeframe
  const getSavingsForTimeframe = (): number => {
    switch (timeframe) {
      case 'day': return data.costSavings.daily;
      case 'week': return data.costSavings.weekly;
      case 'month': return data.costSavings.monthly;
      case 'year': return data.costSavings.yearly;
      default: return data.costSavings.daily;
    }
  };
  
  // Get appropriate timeframe label
  const getTimeframeLabel = (): string => {
    switch (timeframe) {
      case 'day': return 'Daily';
      case 'week': return 'Weekly';
      case 'month': return 'Monthly';
      case 'year': return 'Yearly';
      default: return 'Daily';
    }
  };
  
  if (deviceLoading) {
    return <div className="flex justify-center p-8">Loading battery economics data...</div>;
  }
  
  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div className="flex items-center space-x-4">
          <Select value={optimizationMode} onValueChange={setOptimizationMode}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Optimization Mode" />
            </SelectTrigger>
            <SelectContent>
              {data.optimizationProfiles.map(profile => (
                <SelectItem key={profile.id} value={profile.id}>{profile.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={timeframe} onValueChange={setTimeframe}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Timeframe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Day</SelectItem>
              <SelectItem value="week">Week</SelectItem>
              <SelectItem value="month">Month</SelectItem>
              <SelectItem value="year">Year</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <Badge variant="outline" className="gap-1">
          <CircleDollarSign className="h-3.5 w-3.5" />
          Economic Health Score: {data.economicHealthScore}/100
        </Badge>
      </div>
      
      {/* Cost Savings Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <PiggyBank className="h-5 w-5 text-primary" />
              {getTimeframeLabel()} Savings
            </CardTitle>
            <CardDescription>
              Financial savings with current optimization strategy
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 pb-8">
            <div className="flex flex-col items-center">
              <div className="text-4xl font-bold text-primary">
                {formatCurrency(getSavingsForTimeframe())}
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                {optimizationMode === "cost_saving" 
                  ? `With optimized charging patterns` 
                  : `With ${getActiveProfile()?.name} strategy`}
              </p>
            </div>
            
            <div className="mt-8 space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">Projected Savings</span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {data.projectedSavings.map((item, index) => (
                    <div key={index} className="flex flex-col items-center p-2 rounded-lg bg-background/50 border">
                      <span className="text-xs text-muted-foreground">{item.period}</span>
                      <span className="text-sm font-medium">{formatCurrency(item.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <BatteryCharging className="h-5 w-5 text-primary" />
              Battery Lifecycle Economics
            </CardTitle>
            <CardDescription>
              Financial impact of optimization on battery lifecycle
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-background/50 border">
                  <div className="text-sm text-muted-foreground mb-1">Life with Optimization</div>
                  <div className="flex items-end gap-1">
                    <span className="text-2xl font-bold">{data.batteryLifeImpact.withOptimization}</span>
                    <span className="text-sm text-muted-foreground">months</span>
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-background/50 border">
                  <div className="text-sm text-muted-foreground mb-1">Without Optimization</div>
                  <div className="flex items-end gap-1">
                    <span className="text-2xl font-bold">{data.batteryLifeImpact.withoutOptimization}</span>
                    <span className="text-sm text-muted-foreground">months</span>
                  </div>
                </div>
              </div>
              
              <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Lifetime Extension Value</span>
                  <Badge variant="secondary">{data.batteryLifeImpact.lifetimeExtension} months</Badge>
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <span className="text-xl font-bold text-primary">{formatCurrency(data.batteryLifeImpact.financialBenefit)}</span>
                  <span className="text-sm text-muted-foreground">financial benefit</span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-background/50 border">
                  <div className="text-sm text-muted-foreground mb-1">ROI</div>
                  <div className="flex items-end gap-1">
                    <span className="text-2xl font-bold">{data.lifetimeValue.roi}x</span>
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-background/50 border">
                  <div className="text-sm text-muted-foreground mb-1">Payback Period</div>
                  <div className="flex items-end gap-1">
                    <span className="text-2xl font-bold">{data.lifetimeValue.paybackPeriod}</span>
                    <span className="text-sm text-muted-foreground">months</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Tariff & Arbitrage Analysis */}
      <Tabs defaultValue="tariff" className="space-y-4">
        <TabsList>
          <TabsTrigger value="tariff">
            <Clock className="h-4 w-4 mr-2" />
            Tariff Optimization
          </TabsTrigger>
          <TabsTrigger value="arbitrage">
            <ArrowUpDown className="h-4 w-4 mr-2" />
            Energy Arbitrage
          </TabsTrigger>
          <TabsTrigger value="strategies">
            <Sparkles className="h-4 w-4 mr-2" />
            Adaptive Strategies
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="tariff" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Tariff-Based Optimization</CardTitle>
              <CardDescription>
                Time-of-use tariff analysis and charging recommendations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-background/50 border flex flex-col">
                  <div className="text-sm text-muted-foreground">Current Tariff</div>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-2xl font-bold">{formatCurrency(data.tariffAnalysis.currentRate, "$")}/kWh</span>
                  </div>
                  <Badge variant="outline" className="w-fit mt-1 capitalize">
                    {data.tariffAnalysis.currentTariffPeriod}
                  </Badge>
                </div>
                
                <div className="p-4 rounded-lg bg-background/50 border flex flex-col">
                  <div className="text-sm text-muted-foreground">Next Tariff Change</div>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-2xl font-bold">{data.tariffAnalysis.nextTariffChange}</span>
                  </div>
                  <div className="mt-1 flex items-center gap-1">
                    <span className="text-sm">{formatCurrency(data.tariffAnalysis.nextTariffRate, "$")}/kWh</span>
                    <Badge variant="outline" className="capitalize">
                      {data.tariffAnalysis.nextTariffPeriod}
                    </Badge>
                  </div>
                </div>
                
                <div className="p-4 rounded-lg bg-background/50 border">
                  <div className="text-sm text-muted-foreground mb-2">Tariff Impact</div>
                  <div className="flex gap-2 items-center">
                    <Zap className="h-5 w-5 text-amber-500" />
                    <div>
                      <div className="text-sm font-medium">TOU Savings Potential</div>
                      <div className="text-xs text-muted-foreground">
                        {formatCurrency(data.costSavings.monthly)} monthly with optimal scheduling
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium mb-3">Optimal Charging Windows</h3>
                  <div className="space-y-3">
                    {data.tariffAnalysis.optimalChargeTimes.map((window, index) => (
                      <div key={index} className="p-3 rounded-lg bg-background/50 border">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <BatteryCharging className="h-5 w-5 text-green-500" />
                            <span>{window.startTime} - {window.endTime}</span>
                          </div>
                          <Badge variant="outline">
                            {formatCurrency(window.rate, "$")}/kWh
                          </Badge>
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground capitalize">
                          {window.ratePeriod} period
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium mb-3">Optimal Discharging Windows</h3>
                  <div className="space-y-3">
                    {data.tariffAnalysis.optimalDischargeTimes.map((window, index) => (
                      <div key={index} className="p-3 rounded-lg bg-background/50 border">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <Zap className="h-5 w-5 text-amber-500" />
                            <span>{window.startTime} - {window.endTime}</span>
                          </div>
                          <Badge variant="outline">
                            {formatCurrency(window.rate, "$")}/kWh
                          </Badge>
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground capitalize">
                          {window.ratePeriod} period
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="arbitrage" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Energy Arbitrage Opportunities</CardTitle>
              <CardDescription>
                Buy low, sell high energy trading opportunities
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {data.arbitrageOpportunities.map((opportunity, index) => (
                  <Card key={index} className="border bg-background/50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">Daily Arbitrage Opportunity #{index + 1}</CardTitle>
                      <CardDescription>
                        Potential profit: {formatCurrency(opportunity.totalProfit)}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900">
                          <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                            <ArrowUpDown className="h-4 w-4" />
                            <span className="text-sm font-medium">Buy</span>
                          </div>
                          <div className="mt-1 text-xl font-semibold">
                            {opportunity.buyTime}
                          </div>
                          <div className="mt-1 text-sm text-green-600 dark:text-green-400">
                            {formatCurrency(opportunity.buyRate)}/kWh
                          </div>
                        </div>
                        
                        <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900">
                          <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                            <ArrowUpDown className="h-4 w-4" />
                            <span className="text-sm font-medium">Sell</span>
                          </div>
                          <div className="mt-1 text-xl font-semibold">
                            {opportunity.sellTime}
                          </div>
                          <div className="mt-1 text-sm text-amber-600 dark:text-amber-400">
                            {formatCurrency(opportunity.sellRate)}/kWh
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Profit per kWh</span>
                          <span className="font-medium">{formatCurrency(opportunity.potentialProfit)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Recommended volume</span>
                          <span className="font-medium">{opportunity.recommendedVolume} kWh</span>
                        </div>
                        <div className="flex justify-between text-sm mt-2">
                          <span className="font-medium">Total profit</span>
                          <span className="font-bold text-primary">{formatCurrency(opportunity.totalProfit)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              
              <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-medium text-amber-800 dark:text-amber-300">Arbitrage Considerations</h3>
                    <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
                      Energy arbitrage depends on battery efficiency, depth of discharge limitations, and local regulations. Actual profits may vary.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="strategies" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Adaptive Optimization Strategies</CardTitle>
              <CardDescription>
                Location and schedule-specific battery optimization strategies
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {data.adaptiveStrategies.map((strategy, index) => (
                  <div key={index} className="border rounded-lg p-4 relative">
                    {strategy.id === data.currentStrategy && (
                      <Badge className="absolute top-4 right-4" variant="secondary">Active</Badge>
                    )}
                    <h3 className="text-lg font-medium">{strategy.name}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {strategy.description}
                    </p>
                    
                    <div className="mt-4 flex flex-wrap gap-1">
                      {strategy.recommendedDays.map((day, dayIndex) => (
                        <Badge key={dayIndex} variant="outline">
                          {day}
                        </Badge>
                      ))}
                    </div>
                    
                    <div className="mt-4">
                      <div className="flex justify-between text-sm mb-2">
                        <span className="font-medium">Estimated Monthly Savings</span>
                        <span className="font-bold text-primary">{formatCurrency(strategy.estimatedSavings)}</span>
                      </div>
                      
                      <div className="space-y-3 mt-4">
                        <div>
                          <h4 className="text-sm font-medium mb-2">Charging Windows</h4>
                          <div className="space-y-2">
                            {strategy.chargingWindows.map((window, windowIndex) => (
                              <div key={windowIndex} className="flex justify-between items-center p-2 border rounded bg-background/50 text-sm">
                                <div className="flex items-center gap-2">
                                  <BatteryCharging className="h-4 w-4 text-green-500" />
                                  <span>{window.startTime} - {window.endTime}</span>
                                </div>
                                <Badge variant="outline" className="capitalize">
                                  {window.priority} priority
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        <div>
                          <h4 className="text-sm font-medium mb-2">Discharging Windows</h4>
                          <div className="space-y-2">
                            {strategy.dischargingWindows.map((window, windowIndex) => (
                              <div key={windowIndex} className="flex justify-between items-center p-2 border rounded bg-background/50 text-sm">
                                <div className="flex items-center gap-2">
                                  <Zap className="h-4 w-4 text-amber-500" />
                                  <span>{window.startTime} - {window.endTime}</span>
                                </div>
                                <Badge variant="outline" className="capitalize">
                                  {window.priority} priority
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-4">
                      <Button 
                        variant={strategy.id === data.currentStrategy ? "outline" : "secondary"} 
                        className="w-full"
                        disabled={strategy.id === data.currentStrategy}
                      >
                        {strategy.id === data.currentStrategy ? "Currently Active" : "Activate Strategy"}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Lifetime Value Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-primary" />
            Battery Lifetime Value
          </CardTitle>
          <CardDescription>
            Total financial impact over the battery's lifespan
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-lg bg-background/50 border flex flex-col">
              <div className="text-sm text-muted-foreground">Savings to Date</div>
              <div className="mt-1 text-xl font-bold text-primary">
                {formatCurrency(data.lifetimeValue.savingsToDate)}
              </div>
            </div>
            
            <div className="p-4 rounded-lg bg-background/50 border flex flex-col">
              <div className="text-sm text-muted-foreground">Lifetime Savings</div>
              <div className="mt-1 text-xl font-bold text-primary">
                {formatCurrency(data.lifetimeValue.projectedLifetimeSavings)}
              </div>
            </div>
            
            <div className="p-4 rounded-lg bg-background/50 border flex flex-col">
              <div className="text-sm text-muted-foreground">Replacement Cost</div>
              <div className="mt-1 text-xl font-bold">
                {formatCurrency(data.lifetimeValue.replacementCost)}
              </div>
            </div>
            
            <div className="p-4 rounded-lg bg-background/50 border flex flex-col">
              <div className="text-sm text-muted-foreground">Current Value</div>
              <div className="mt-1 text-xl font-bold">
                {formatCurrency(data.lifetimeValue.currentValue)}
              </div>
            </div>
          </div>
          
          <div className="h-[200px] bg-card/50 rounded-lg border p-4 flex items-center justify-center">
            <div className="text-center text-muted-foreground space-y-2">
              <BarChart3 className="h-8 w-8 mx-auto" />
              <p className="text-sm">Lifetime value projection chart will appear here</p>
              <p className="text-xs">
                Showing financial returns over {Math.ceil(data.batteryLifeImpact.withOptimization / 12)} years of optimized battery operation
              </p>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" className="gap-1">
            <Calendar className="h-4 w-4" />
            View Detailed Projections
          </Button>
          <Button className="gap-1">
            <Sparkles className="h-4 w-4" />
            Optimize Strategy
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default BatteryEconomicsPanel;