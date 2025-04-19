import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  TrendingUp,
  AlertCircle,
  Battery,
  Flame,
  Calendar,
  Clock,
  BarChart,
  LineChart,
  RefreshCw,
  ZapIcon,
  ClockIcon,
  ThermometerIcon,
  Hash,
  AreaChart,
  BatteryMedium,
  Info,
} from "lucide-react";

interface BatteryAnalyticsPanelProps {
  deviceId: number;
}

const BatteryAnalyticsPanel: React.FC<BatteryAnalyticsPanelProps> = ({ deviceId }) => {
  const [timeframe, setTimeframe] = useState<string>("week");
  const [analysisType, setAnalysisType] = useState<string>("degradation");
  
  // Fetch device data
  const { data: device, isLoading: deviceLoading } = useQuery({
    queryKey: [`/api/devices/${deviceId}`],
  });
  
  // Fetch analytics data (when we implement this API)
  const { data: analyticsData, isLoading: analyticsLoading } = useQuery({
    queryKey: [`/api/devices/${deviceId}/battery/analytics/${analysisType}/${timeframe}`],
    enabled: false, // Disabled until we implement the API
  });
  
  // Format percentage with sign
  const formatPercentWithSign = (value?: number): string => {
    if (value === undefined) return "N/A";
    const sign = value >= 0 ? "+" : "";
    return `${sign}${value.toFixed(2)}%`;
  };
  
  // Helper to format date string
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
  // Mock data for now - will be replaced with actual API data
  const mockAnalyticsData = {
    degradationRate: -0.23, // % per month
    estimatedLifetime: 96, // months
    optimalChargingPattern: "Slow overnight charging at 0.2C",
    recommendations: [
      "Avoid frequent rapid charging to extend battery life",
      "Maintain state of charge between 20% and 80% for optimal lifespan",
      "Consider recalibration test to improve state of health accuracy"
    ],
    temperatureImpact: -0.45, // % degradation due to temperature
    cycleImpact: -1.2, // % degradation due to cycling
    chargeRateImpact: -0.35, // % degradation due to high charge rates
    projectedCapacity: [
      { month: 1, capacity: 99.5 },
      { month: 6, capacity: 97.8 },
      { month: 12, capacity: 95.2 },
      { month: 24, capacity: 89.6 },
      { month: 36, capacity: 84.1 }
    ],
    optimalParameters: {
      maxChargeRate: 0.5, // C
      minSoC: 20, // %
      maxSoC: 80, // %
      idealTemperature: 25 // °C
    },
    recentEvents: [
      { 
        date: "2025-03-18", 
        type: "warning", 
        description: "High discharge rate detected (2.2C)", 
        impact: "Minor increase in degradation rate" 
      },
      { 
        date: "2025-02-25", 
        type: "info", 
        description: "Optimal charging pattern detected", 
        impact: "Positive effect on battery health" 
      }
    ],
    financialAnalysis: {
      replacementCost: 5200, // $
      currentValue: 3800, // $
      depreciationRate: 0.8, // % per month
      optimizedLifespanSavings: 1200 // $ saved with optimization
    }
  };
  
  // Use mock data for now
  const data = mockAnalyticsData;
  
  if (deviceLoading) {
    return <div className="flex justify-center p-8">Loading battery analytics data...</div>;
  }
  
  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <Select value={analysisType} onValueChange={setAnalysisType}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Analysis Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="degradation">Degradation Analysis</SelectItem>
              <SelectItem value="efficiency">Efficiency Analysis</SelectItem>
              <SelectItem value="thermal">Thermal Analysis</SelectItem>
              <SelectItem value="economic">Economic Analysis</SelectItem>
              <SelectItem value="optimization">Charging Optimization</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={timeframe} onValueChange={setTimeframe}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Timeframe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Past Week</SelectItem>
              <SelectItem value="month">Past Month</SelectItem>
              <SelectItem value="quarter">Past Quarter</SelectItem>
              <SelectItem value="year">Past Year</SelectItem>
              <SelectItem value="lifetime">Lifetime</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <Button variant="outline" size="sm" className="gap-1">
          <RefreshCw className="h-4 w-4" /> Refresh Analysis
        </Button>
      </div>
      
      {/* Main Analysis Card */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-xl">Battery Degradation Analysis</CardTitle>
              <CardDescription>
                Comprehensive analysis of battery health and degradation factors
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-xs">
              Last updated: {formatDate(new Date().toISOString())}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-background/50 border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center">
                  <TrendingUp className="h-4 w-4 mr-2 text-primary" />
                  Degradation Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col">
                  <span className="text-2xl font-bold text-primary">
                    {formatPercentWithSign(data.degradationRate)} <span className="text-sm text-muted-foreground">per month</span>
                  </span>
                  <span className="text-xs text-muted-foreground mt-1">
                    {Math.abs(data.degradationRate) < 0.3 ? "Excellent" : 
                     Math.abs(data.degradationRate) < 0.5 ? "Good" : 
                     Math.abs(data.degradationRate) < 0.8 ? "Average" : "High"} degradation rate
                  </span>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-background/50 border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center">
                  <Calendar className="h-4 w-4 mr-2 text-primary" />
                  Estimated Lifetime
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col">
                  <span className="text-2xl font-bold text-primary">
                    {data.estimatedLifetime} <span className="text-sm text-muted-foreground">months</span>
                  </span>
                  <span className="text-xs text-muted-foreground mt-1">
                    {Math.floor(data.estimatedLifetime / 12)} years and {data.estimatedLifetime % 12} months remaining
                  </span>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-background/50 border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center">
                  <Battery className="h-4 w-4 mr-2 text-primary" />
                  Optimal Charging
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col">
                  <span className="text-md font-medium text-primary">
                    {data.optimalChargingPattern}
                  </span>
                  <span className="text-xs text-muted-foreground mt-1">
                    Following this pattern can extend battery life by up to 20%
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Degradation Factors */}
          <div>
            <h3 className="text-lg font-medium mb-4">Degradation Factors</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg border bg-background/50">
                <div className="flex items-center">
                  <ThermometerIcon className="h-10 w-10 p-2 rounded-full bg-orange-100 text-orange-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium">Temperature Impact</p>
                    <p className="text-xl font-bold text-orange-600">{formatPercentWithSign(data.temperatureImpact)}</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {Math.abs(data.temperatureImpact) < 0.3 ? "Minor" : "Significant"} degradation due to operating temperature
                </p>
              </div>
              
              <div className="p-4 rounded-lg border bg-background/50">
                <div className="flex items-center">
                  <AreaChart className="h-10 w-10 p-2 rounded-full bg-blue-100 text-blue-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium">Cycling Impact</p>
                    <p className="text-xl font-bold text-blue-600">{formatPercentWithSign(data.cycleImpact)}</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {Math.abs(data.cycleImpact) < 1 ? "Normal" : "High"} degradation from charge/discharge cycles
                </p>
              </div>
              
              <div className="p-4 rounded-lg border bg-background/50">
                <div className="flex items-center">
                  <ZapIcon className="h-10 w-10 p-2 rounded-full bg-purple-100 text-purple-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium">Charge Rate Impact</p>
                    <p className="text-xl font-bold text-purple-600">{formatPercentWithSign(data.chargeRateImpact)}</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {Math.abs(data.chargeRateImpact) < 0.5 ? "Low" : "High"} impact from fast-charging events
                </p>
              </div>
            </div>
          </div>
          
          {/* Projected Capacity */}
          <div>
            <h3 className="text-lg font-medium mb-4">Capacity Projection</h3>
            <div className="h-[200px] bg-card/50 rounded-lg border p-4 flex items-center justify-center">
              <div className="text-center text-muted-foreground space-y-2">
                <BarChart3 className="h-8 w-8 mx-auto" />
                <p className="text-sm">Capacity projection chart will appear here</p>
                <p className="text-xs">
                  Showing projected capacity from {data.projectedCapacity[0].capacity}% now
                  to {data.projectedCapacity[data.projectedCapacity.length-1].capacity}% in {data.projectedCapacity[data.projectedCapacity.length-1].month} months
                </p>
              </div>
            </div>
          </div>
          
          {/* Optimization Parameters */}
          <div>
            <h3 className="text-lg font-medium mb-4">Optimal Operating Parameters</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-lg border bg-card/50">
                <div className="text-center">
                  <BatteryMedium className="h-8 w-8 mx-auto text-primary mb-2" />
                  <p className="text-sm font-medium">Max Charge Rate</p>
                  <p className="text-xl font-bold">{data.optimalParameters.maxChargeRate}C</p>
                </div>
              </div>
              
              <div className="p-4 rounded-lg border bg-card/50">
                <div className="text-center">
                  <Battery className="h-8 w-8 mx-auto text-primary mb-2" strokeWidth={1.5} />
                  <p className="text-sm font-medium">Min SoC</p>
                  <p className="text-xl font-bold">{data.optimalParameters.minSoC}%</p>
                </div>
              </div>
              
              <div className="p-4 rounded-lg border bg-card/50">
                <div className="text-center">
                  <Battery className="h-8 w-8 mx-auto text-primary mb-2" />
                  <p className="text-sm font-medium">Max SoC</p>
                  <p className="text-xl font-bold">{data.optimalParameters.maxSoC}%</p>
                </div>
              </div>
              
              <div className="p-4 rounded-lg border bg-card/50">
                <div className="text-center">
                  <ThermometerIcon className="h-8 w-8 mx-auto text-primary mb-2" />
                  <p className="text-sm font-medium">Ideal Temperature</p>
                  <p className="text-xl font-bold">{data.optimalParameters.idealTemperature}°C</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Recommendations */}
          <div>
            <h3 className="text-lg font-medium mb-4">Recommendations</h3>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Optimization Suggestions</AlertTitle>
              <AlertDescription>
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  {data.recommendations.map((rec, index) => (
                    <li key={index} className="text-sm">{rec}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          </div>
          
          {/* Recent Events */}
          <div>
            <h3 className="text-lg font-medium mb-4">Recent Events</h3>
            <div className="space-y-3">
              {data.recentEvents.map((event, index) => (
                <div key={index} className="flex items-start space-x-3 p-3 rounded-md bg-card/50 border">
                  {event.type === 'warning' && <AlertCircle className="h-5 w-5 mt-0.5 text-amber-500" />}
                  {event.type === 'info' && <Info className="h-5 w-5 mt-0.5 text-blue-500" />}
                  
                  <div className="flex-1">
                    <div className="flex justify-between">
                      <p className="text-sm font-medium">{event.description}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(event.date)}</p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{event.impact}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Financial Analysis */}
          <div>
            <h3 className="text-lg font-medium mb-4">Financial Impact</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Replacement Cost</span>
                  <span>${data.financialAnalysis.replacementCost.toLocaleString()}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Current Value</span>
                  <span>${data.financialAnalysis.currentValue.toLocaleString()}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Depreciation Rate</span>
                  <span>{data.financialAnalysis.depreciationRate}% per month</span>
                </div>
              </div>
              
              <div className="p-4 rounded-lg border bg-green-50 dark:bg-green-950">
                <div className="text-center space-y-2">
                  <p className="text-sm font-medium text-green-800 dark:text-green-300">Potential Savings with Optimization</p>
                  <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                    ${data.financialAnalysis.optimizedLifespanSavings.toLocaleString()}
                  </p>
                  <p className="text-xs text-green-700 dark:text-green-300">
                    By following recommended optimization strategies
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BatteryAnalyticsPanel;