import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";

export interface HealthMetricsPoint {
  timestamp: string;
  overallHealthScore?: number;
  temperatureVariance?: number;
  chargeDischargeRate?: number;
  depthOfDischarge?: number;
  cycleCount?: number;
  capacityFading?: number;
  internalResistance?: number;
  voltageStability?: number;
  operatingTemperature?: number;
  // Solar specific
  efficiencyRatio?: number;
  degradationRate?: number;
  soilingLossRate?: number;
  shadingImpact?: number;
  hotspotCount?: number;
  connectionIntegrityScore?: number;
  inverterEfficiency?: number;
  dcAcConversionRatio?: number;
  maximumPowerPointTracking?: number;
}

interface DeviceHealthMetricsChartProps {
  deviceType: string;
  metricsHistory: HealthMetricsPoint[];
  isLoading?: boolean;
}

interface MetricConfig {
  key: string;
  label: string;
  color: string;
  unit?: string;
}

const batteryMetrics: MetricConfig[] = [
  { key: "overallHealthScore", label: "Health Score", color: "#10b981", unit: "%" },
  { key: "capacityFading", label: "Capacity Fading", color: "#f97316", unit: "%" },
  { key: "cycleCount", label: "Cycle Count", color: "#6366f1" },
  { key: "depthOfDischarge", label: "Depth of Discharge", color: "#8b5cf6", unit: "%" },
  { key: "internalResistance", label: "Internal Resistance", color: "#ec4899", unit: "mΩ" },
  { key: "chargeDischargeRate", label: "Charge/Discharge Rate", color: "#3b82f6", unit: "kW" },
  { key: "voltageStability", label: "Voltage Stability", color: "#14b8a6", unit: "%" },
  { key: "operatingTemperature", label: "Operating Temperature", color: "#ef4444", unit: "°C" },
];

const solarMetrics: MetricConfig[] = [
  { key: "overallHealthScore", label: "Health Score", color: "#10b981", unit: "%" },
  { key: "efficiencyRatio", label: "Efficiency Ratio", color: "#3b82f6", unit: "%" },
  { key: "degradationRate", label: "Degradation Rate", color: "#f97316", unit: "%" },
  { key: "soilingLossRate", label: "Soiling Loss", color: "#8b5cf6", unit: "%" },
  { key: "inverterEfficiency", label: "Inverter Efficiency", color: "#06b6d4", unit: "%" },
  { key: "shadingImpact", label: "Shading Impact", color: "#6366f1", unit: "%" },
  { key: "connectionIntegrityScore", label: "Connection Integrity", color: "#14b8a6", unit: "%" },
  { key: "operatingTemperature", label: "Operating Temperature", color: "#ef4444", unit: "°C" },
];

const timeRanges = [
  { value: "7d", label: "7 Days" },
  { value: "30d", label: "30 Days" },
  { value: "90d", label: "90 Days" },
  { value: "1y", label: "1 Year" },
  { value: "all", label: "All Time" },
];

const DeviceHealthMetricsChart: React.FC<DeviceHealthMetricsChartProps> = ({
  deviceType,
  metricsHistory,
  isLoading = false,
}) => {
  const [timeRange, setTimeRange] = useState<string>("30d");
  const [selectedTab, setSelectedTab] = useState<string>("health");
  
  const metrics = deviceType === "battery_storage" ? batteryMetrics : solarMetrics;
  
  // Determine what metrics to show based on the selected tab
  const getMetricsForTab = (tab: string): MetricConfig[] => {
    switch (tab) {
      case "health":
        return metrics.filter(m => m.key === "overallHealthScore");
      case "temperature":
        return metrics.filter(m => m.key === "operatingTemperature");
      case "efficiency":
        return deviceType === "battery_storage" 
          ? metrics.filter(m => ["chargeDischargeRate", "depthOfDischarge", "voltageStability"].includes(m.key))
          : metrics.filter(m => ["efficiencyRatio", "inverterEfficiency", "connectionIntegrityScore"].includes(m.key));
      case "degradation":
        return deviceType === "battery_storage"
          ? metrics.filter(m => ["capacityFading", "cycleCount", "internalResistance"].includes(m.key))
          : metrics.filter(m => ["degradationRate", "soilingLossRate", "shadingImpact"].includes(m.key));
      default:
        return [metrics[0]];
    }
  };
  
  const currentMetrics = getMetricsForTab(selectedTab);
  
  // Filter data based on selected time range
  const getFilteredData = () => {
    if (timeRange === "all") return metricsHistory;
    
    const now = new Date();
    let daysToSubtract = 30;
    
    if (timeRange === "7d") daysToSubtract = 7;
    else if (timeRange === "30d") daysToSubtract = 30;
    else if (timeRange === "90d") daysToSubtract = 90;
    else if (timeRange === "1y") daysToSubtract = 365;
    
    const cutoffDate = new Date(now.setDate(now.getDate() - daysToSubtract));
    
    return metricsHistory.filter(point => new Date(point.timestamp) >= cutoffDate);
  };
  
  const filteredData = getFilteredData();
  
  // Format dates on X-axis
  const formatXAxis = (tickItem: string) => {
    const date = new Date(tickItem);
    return date.toLocaleDateString();
  };
  
  // Custom tooltip formatter
  const renderTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="p-2 bg-white border rounded shadow-sm">
          <p className="text-xs font-medium">{new Date(label).toLocaleString()}</p>
          <div className="mt-1">
            {payload.map((entry: any, index: number) => {
              const metric = metrics.find(m => m.key === entry.dataKey);
              return (
                <p key={index} className="text-xs" style={{ color: entry.color }}>
                  {metric?.label}: {entry.value}{metric?.unit || ''}
                </p>
              );
            })}
          </div>
        </div>
      );
    }
    return null;
  };
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Health Metrics</CardTitle>
          <CardDescription>Loading metrics data...</CardDescription>
        </CardHeader>
        <CardContent className="min-h-80 flex items-center justify-center">
          <div className="animate-pulse w-full">
            <div className="h-64 bg-slate-200 rounded w-full"></div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>Health Metrics</CardTitle>
            <CardDescription>
              Tracking device performance over time
            </CardDescription>
          </div>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[120px] h-8">
              <SelectValue placeholder="Time Range" />
            </SelectTrigger>
            <SelectContent>
              {timeRanges.map((range) => (
                <SelectItem key={range.value} value={range.value}>
                  {range.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="health" value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="health">Health Score</TabsTrigger>
            <TabsTrigger value="temperature">Temperature</TabsTrigger>
            <TabsTrigger value="efficiency">Efficiency</TabsTrigger>
            <TabsTrigger value="degradation">Degradation</TabsTrigger>
          </TabsList>
          
          <TabsContent value={selectedTab} className="min-h-[350px]">
            {filteredData.length === 0 ? (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                No metrics data available for this time range
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={350}>
                <LineChart
                  data={filteredData}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="timestamp" 
                    tickFormatter={formatXAxis}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis />
                  <Tooltip content={renderTooltip} />
                  <Legend />
                  {currentMetrics.map((metric) => (
                    <Line
                      key={metric.key}
                      type="monotone"
                      dataKey={metric.key}
                      name={metric.label}
                      stroke={metric.color}
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default DeviceHealthMetricsChart;