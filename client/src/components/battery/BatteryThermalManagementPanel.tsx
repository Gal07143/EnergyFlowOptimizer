import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useQuery } from "@tanstack/react-query";
import {
  ThermometerSun,
  ThermometerSnowflake,
  Fan,
  Droplets,
  AlertTriangle,
  CheckCircle,
  CloudSun,
  Sun,
  Flame,
  Snowflake,
  LineChart,
  BarChart,
  RefreshCw,
  LayoutGrid,
  Clock,
  CalendarDays,
  ThermometerIcon,
  CloudRain,
  Info as InfoIcon,
} from "lucide-react";

interface BatteryThermalManagementPanelProps {
  deviceId: number;
}

const BatteryThermalManagementPanel: React.FC<BatteryThermalManagementPanelProps> = ({ deviceId }) => {
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [coolingMode, setCoolingMode] = useState<string>("auto");
  const [timeframe, setTimeframe] = useState<string>("day");
  
  // Fetch device data
  const { data: device, isLoading: deviceLoading } = useQuery({
    queryKey: [`/api/devices/${deviceId}`],
  });
  
  // Fetch thermal data (when API is implemented)
  const { data: thermalData, isLoading: thermalLoading } = useQuery({
    queryKey: [`/api/devices/${deviceId}/battery/thermal/${timeframe}`],
    enabled: false, // Disabled until we implement the API
  });
  
  // Mock data for now - will be replaced with actual API data
  const mockThermalData = {
    currentTemperature: 28.5, // °C
    minTemperature: 22.4, // °C (last 24 hours)
    maxTemperature: 31.6, // °C (last 24 hours)
    optimalTemperatureRange: {
      min: 18, // °C
      max: 30, // °C
    },
    criticalTemperatureThreshold: 40, // °C
    temperatureHistory: [
      { time: "00:00", value: 26.2 },
      { time: "04:00", value: 23.8 },
      { time: "08:00", value: 25.6 },
      { time: "12:00", value: 29.8 },
      { time: "16:00", value: 31.6 },
      { time: "20:00", value: 28.5 }
    ],
    cellTemperatureDifference: 2.4, // °C (difference between hottest and coldest cell)
    hotspots: [
      { cell: "B3", temperature: 31.6, status: "warning" },
      { cell: "C4", temperature: 31.2, status: "warning" },
      { cell: "A7", temperature: 29.8, status: "normal" }
    ],
    coolingSystem: {
      type: "liquid", // liquid, air, passive
      status: "active",
      currentPower: 60, // % of max cooling power
      fanSpeed: 1200, // RPM
      pumpFlow: 4.5, // L/min
      efficiency: 84, // %
      maintenanceStatus: "good", 
      lastMaintenance: "2025-01-15", // Date
      nextMaintenance: "2025-07-15" // Date
    },
    ambientConditions: {
      temperature: 32.8, // °C
      humidity: 45, // %
      weatherCondition: "sunny", // sunny, cloudy, rainy, etc.
      forecast: [
        { day: "Today", maxTemp: 33.5, condition: "sunny" },
        { day: "Tomorrow", maxTemp: 34.2, condition: "sunny" },
        { day: "Wednesday", maxTemp: 30.1, condition: "cloudy" }
      ]
    },
    thermalPerformance: {
      coolingEfficiency: 87, // % 
      energyUsedForCooling: 0.42, // kWh last 24 hours
      coolingPowerRatio: 3.2, // % of battery capacity used for cooling
      temperatureRegulationScore: 92 // 0-100
    },
    israeliClimateAdaptation: {
      summerSettings: {
        active: true,
        maxFanSpeed: 2400, // RPM
        coolingStartThreshold: 28, // °C
        coolingAggressiveness: "high", // low, medium, high
        nightModeCooling: true
      },
      hamsinSettings: { // Special settings for extremely hot and dry days
        active: false,
        trigger: "manual", // manual, automatic
        coolingStartThreshold: 26, // °C
        overrideNormalLimits: true
      },
      desertModeSettings: { // Dust protection settings
        active: true,
        filteringLevel: "high", // low, medium, high
        cleaningInterval: 14 // days
      }
    },
    optimizationRecommendations: [
      {
        id: "summer_preset",
        name: "Summer Optimization",
        description: "Optimized for Israeli summer with pre-cooling during off-peak hours",
        estimatedEfficiencyGain: 4.2, // %
        estimatedEnergyReduction: 0.18 // kWh/day
      },
      {
        id: "desert_preset",
        name: "Desert Protection",
        description: "Enhanced dust protection with advanced filtering",
        estimatedEfficiencyGain: 2.8, // %
        estimatedEnergyReduction: 0.11 // kWh/day
      }
    ],
    thermalEvents: [
      {
        date: "2025-04-16T14:30:00",
        type: "warning",
        description: "Cell temperature differential exceeded 2°C",
        action: "Increased circulation pump speed",
        resolved: true
      },
      {
        date: "2025-04-17T13:15:00",
        type: "info",
        description: "Initiated preventative cooling for forecasted heat wave",
        action: "Activated pre-cooling protocol",
        resolved: true
      }
    ]
  };
  
  // Use mock data for now
  const data = mockThermalData;
  
  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
  // Get temperature status color
  const getTemperatureStatusColor = (temp: number): string => {
    if (temp >= data.criticalTemperatureThreshold) return "text-red-500";
    if (temp > data.optimalTemperatureRange.max) return "text-amber-500";
    if (temp < data.optimalTemperatureRange.min) return "text-blue-500";
    return "text-green-500";
  };
  
  // Get temperature badge variant
  const getTemperatureBadgeVariant = (temp: number): "destructive" | "secondary" | "outline" => {
    if (temp >= data.criticalTemperatureThreshold) return "destructive";
    if (temp > data.optimalTemperatureRange.max) return "secondary";
    if (temp < data.optimalTemperatureRange.min) return "secondary";
    return "outline";
  };
  
  // Get cooling system status
  const getCoolingSystemStatus = () => {
    if (data.coolingSystem.status === "active") {
      if (data.coolingSystem.currentPower > 80) return "High";
      if (data.coolingSystem.currentPower > 40) return "Medium";
      return "Low";
    }
    return "Idle";
  };
  
  // Update fan speed
  const handleFanSpeedUpdate = (values: number[]) => {
    console.log("Setting fan speed to:", values[0]);
    // Would update fan speed via API in a real implementation
  };
  
  // Update cooling mode
  const handleCoolingModeChange = (value: string) => {
    setCoolingMode(value);
    console.log("Setting cooling mode to:", value);
    // Would update cooling mode via API in a real implementation
  };
  
  // Toggle summer settings
  const handleToggleSummerSettings = (checked: boolean) => {
    console.log("Summer settings:", checked ? "enabled" : "disabled");
    // Would update settings via API in a real implementation
  };
  
  if (deviceLoading) {
    return <div className="flex justify-center p-8">Loading thermal management data...</div>;
  }
  
  return (
    <div className="space-y-6">
      {/* Main Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex justify-between">
              <div>
                <CardTitle>Temperature Management</CardTitle>
                <CardDescription>
                  Battery thermal monitoring and control system
                </CardDescription>
              </div>
              <Select value={coolingMode} onValueChange={handleCoolingModeChange}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Cooling Mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto</SelectItem>
                  <SelectItem value="eco">Eco</SelectItem>
                  <SelectItem value="max">Max Cooling</SelectItem>
                  <SelectItem value="off">Off</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between gap-4">
              <div className="flex-1 p-4 rounded-lg bg-background/50 border text-center">
                <div className="flex justify-center">
                  <ThermometerIcon className={`h-8 w-8 mb-2 ${getTemperatureStatusColor(data.currentTemperature)}`} />
                </div>
                <div className={`text-3xl font-bold ${getTemperatureStatusColor(data.currentTemperature)}`}>
                  {data.currentTemperature}°C
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Current Temperature
                </p>
                <div className="mt-3 flex justify-center">
                  <Badge variant={getTemperatureBadgeVariant(data.currentTemperature)}>
                    {data.currentTemperature <= data.optimalTemperatureRange.min ? "Below Optimal" :
                     data.currentTemperature <= data.optimalTemperatureRange.max ? "Optimal" :
                     data.currentTemperature < data.criticalTemperatureThreshold ? "Above Optimal" : "Critical"}
                  </Badge>
                </div>
              </div>
              
              <div className="flex-1 p-4 rounded-lg bg-background/50 border">
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-1.5">
                    <ThermometerSnowflake className="h-5 w-5 text-blue-500" />
                    <span className="text-sm font-medium">Min</span>
                  </div>
                  <span className="text-lg font-semibold">{data.minTemperature}°C</span>
                </div>
                
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-1.5">
                    <ThermometerSun className="h-5 w-5 text-amber-500" />
                    <span className="text-sm font-medium">Max</span>
                  </div>
                  <span className="text-lg font-semibold">{data.maxTemperature}°C</span>
                </div>
                
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-1.5">
                    <CloudSun className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm font-medium">Ambient</span>
                  </div>
                  <span className="text-lg font-semibold">{data.ambientConditions.temperature}°C</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1.5">
                    <Droplets className="h-5 w-5 text-sky-500" />
                    <span className="text-sm font-medium">Humidity</span>
                  </div>
                  <span className="text-lg font-semibold">{data.ambientConditions.humidity}%</span>
                </div>
              </div>
              
              <div className="flex-1 p-4 rounded-lg bg-background/50 border">
                <h3 className="text-sm font-medium text-center mb-3">Cooling System</h3>
                
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <Badge variant={data.coolingSystem.status === "active" ? "default" : "outline"}>
                    {data.coolingSystem.status === "active" ? "Active" : "Idle"}
                  </Badge>
                </div>
                
                <div className="space-y-1 mb-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Cooling Power</span>
                    <span className="font-medium">{data.coolingSystem.currentPower}%</span>
                  </div>
                  <Progress value={data.coolingSystem.currentPower} className="h-1.5" />
                </div>
                
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-muted-foreground">Mode</span>
                  <span className="text-sm font-medium capitalize">{getCoolingSystemStatus()}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Efficiency</span>
                  <span className="text-sm font-medium">{data.thermalPerformance.coolingEfficiency}%</span>
                </div>
              </div>
            </div>
            
            <div className="h-[180px] bg-card/50 rounded-lg border p-4 flex items-center justify-center">
              <div className="text-center text-muted-foreground space-y-2">
                <LineChart className="h-8 w-8 mx-auto" />
                <p className="text-sm">Temperature history chart will appear here</p>
                <p className="text-xs">
                  Showing temperature range from {data.minTemperature}°C to {data.maxTemperature}°C over the past 24 hours
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Climate Conditions</CardTitle>
            <CardDescription>
              Environmental factors affecting battery temperature
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex gap-2 items-center justify-center p-4 rounded-lg bg-background/50 border">
              {data.ambientConditions.weatherCondition === "sunny" && (
                <Sun className="h-12 w-12 text-amber-500" />
              )}
              {data.ambientConditions.weatherCondition === "cloudy" && (
                <CloudSun className="h-12 w-12 text-sky-500" />
              )}
              {data.ambientConditions.weatherCondition === "rainy" && (
                <CloudRain className="h-12 w-12 text-blue-500" />
              )}
              <div>
                <div className="text-xl font-bold">{data.ambientConditions.temperature}°C</div>
                <div className="text-sm text-muted-foreground capitalize">
                  {data.ambientConditions.weatherCondition}
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              <h3 className="text-sm font-medium">Forecast</h3>
              {data.ambientConditions.forecast.map((day, index) => (
                <div key={index} className="flex justify-between items-center p-2 rounded border bg-background/50">
                  <div className="flex items-center gap-2">
                    {day.condition === "sunny" && <Sun className="h-4 w-4 text-amber-500" />}
                    {day.condition === "cloudy" && <CloudSun className="h-4 w-4 text-sky-500" />}
                    {day.condition === "rainy" && <CloudRain className="h-4 w-4 text-blue-500" />}
                    <span className="text-sm">{day.day}</span>
                  </div>
                  <span className="text-sm font-medium">{day.maxTemp}°C</span>
                </div>
              ))}
            </div>
            
            {data.ambientConditions.temperature > 32 && (
              <Alert className="mt-4 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 bg-amber-50/50 dark:bg-amber-900/20">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>High Temperature Alert</AlertTitle>
                <AlertDescription>
                  Ambient temperature is high. Battery cooling system is operating at increased capacity.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Tabs for Detailed Views */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="controls">
            <LayoutGrid className="h-4 w-4 mr-2" />
            Controls
          </TabsTrigger>
          <TabsTrigger value="hotspots">
            <Flame className="h-4 w-4 mr-2" />
            Hotspots
          </TabsTrigger>
          <TabsTrigger value="israeli-climate">
            <Sun className="h-4 w-4 mr-2" />
            Israeli Climate
          </TabsTrigger>
          <TabsTrigger value="maintenance">
            <RefreshCw className="h-4 w-4 mr-2" />
            Maintenance
          </TabsTrigger>
        </TabsList>
        
        {/* Controls Tab */}
        <TabsContent value="controls" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cooling System Controls</CardTitle>
              <CardDescription>
                Adjust cooling settings for optimal battery temperature
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label htmlFor="fan-speed">Fan Speed ({data.coolingSystem.fanSpeed} RPM)</Label>
                      <span className="text-sm text-muted-foreground">
                        {data.coolingSystem.fanSpeed > 2000 ? "High" : 
                         data.coolingSystem.fanSpeed > 1000 ? "Medium" : "Low"}
                      </span>
                    </div>
                    <Slider
                      id="fan-speed"
                      defaultValue={[data.coolingSystem.fanSpeed]}
                      max={3000}
                      step={100}
                      onValueChange={handleFanSpeedUpdate}
                    />
                  </div>
                  
                  {data.coolingSystem.type === "liquid" && (
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <Label htmlFor="pump-flow">Pump Flow ({data.coolingSystem.pumpFlow} L/min)</Label>
                        <span className="text-sm text-muted-foreground">
                          {data.coolingSystem.pumpFlow > 5 ? "High" : 
                          data.coolingSystem.pumpFlow > 3 ? "Medium" : "Low"}
                        </span>
                      </div>
                      <Slider
                        id="pump-flow"
                        defaultValue={[data.coolingSystem.pumpFlow]}
                        max={7}
                        step={0.1}
                        onValueChange={(values) => console.log("Pump flow set to:", values[0])}
                      />
                    </div>
                  )}
                  
                  <div className="flex items-center space-x-2 pt-2">
                    <Switch id="night-mode" defaultChecked={data.israeliClimateAdaptation.summerSettings.nightModeCooling} />
                    <Label htmlFor="night-mode">Night Mode Cooling</Label>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Temperature Thresholds</Label>
                    <div className="p-4 rounded-lg border bg-background/50 space-y-3">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <ThermometerSun className="h-4 w-4 text-amber-500" />
                          <span className="text-sm">Cooling Start</span>
                        </div>
                        <span className="text-sm font-medium">{data.israeliClimateAdaptation.summerSettings.coolingStartThreshold}°C</span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <Snowflake className="h-4 w-4 text-blue-500" />
                          <span className="text-sm">Optimal Min</span>
                        </div>
                        <span className="text-sm font-medium">{data.optimalTemperatureRange.min}°C</span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <Flame className="h-4 w-4 text-orange-500" />
                          <span className="text-sm">Optimal Max</span>
                        </div>
                        <span className="text-sm font-medium">{data.optimalTemperatureRange.max}°C</span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                          <span className="text-sm">Critical</span>
                        </div>
                        <span className="text-sm font-medium">{data.criticalTemperatureThreshold}°C</span>
                      </div>
                    </div>
                  </div>
                  
                  <Button variant="outline" className="w-full gap-1">
                    <RefreshCw className="h-4 w-4" />
                    Reset to Default Values
                  </Button>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button>Apply Changes</Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        {/* Hotspots Tab */}
        <TabsContent value="hotspots" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Temperature Hotspots</CardTitle>
              <CardDescription>
                Cell-level temperature monitoring and analysis
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex justify-between items-center p-4 rounded-lg border bg-background/50">
                <div>
                  <h3 className="text-sm font-medium">Cell Temperature Differential</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Difference between hottest and coldest cell
                  </p>
                </div>
                <Badge variant={data.cellTemperatureDifference > 3 ? "destructive" : "outline"}>
                  {data.cellTemperatureDifference}°C
                </Badge>
              </div>
              
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Detected Hotspots</h3>
                
                {data.hotspots.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {data.hotspots.map((hotspot, index) => (
                      <div 
                        key={index} 
                        className={`p-4 rounded-lg border flex justify-between items-center ${
                          hotspot.status === "warning" 
                            ? "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900" 
                            : "bg-background/50"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-full ${
                            hotspot.status === "warning" 
                              ? "bg-amber-100 dark:bg-amber-900" 
                              : "bg-card"
                          }`}>
                            <Flame className={`h-5 w-5 ${
                              hotspot.status === "warning" 
                                ? "text-amber-600 dark:text-amber-500" 
                                : "text-muted-foreground"
                            }`} />
                          </div>
                          <div>
                            <p className="font-medium">Cell {hotspot.cell}</p>
                            <p className="text-sm text-muted-foreground">
                              {hotspot.status === "warning" 
                                ? "Above optimal temperature" 
                                : "Within normal range"}
                            </p>
                          </div>
                        </div>
                        <div className={`text-lg font-bold ${
                          hotspot.status === "warning" 
                            ? "text-amber-600 dark:text-amber-500" 
                            : ""
                        }`}>
                          {hotspot.temperature}°C
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center p-6 text-center bg-background/50 rounded-lg border">
                    <CheckCircle className="h-12 w-12 text-green-500 mb-3" />
                    <h3 className="text-lg font-medium">No Hotspots Detected</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      All cells are operating within the optimal temperature range
                    </p>
                  </div>
                )}
              </div>
              
              <div className="h-[250px] bg-card/50 rounded-lg border p-4 flex items-center justify-center">
                <div className="text-center text-muted-foreground space-y-2">
                  <LayoutGrid className="h-8 w-8 mx-auto" />
                  <p className="text-sm">Cell temperature heat map will appear here</p>
                  <p className="text-xs">
                    Showing temperature distribution across battery cells
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Israeli Climate Tab */}
        <TabsContent value="israeli-climate" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Israeli Climate Adaptation</CardTitle>
              <CardDescription>
                Specialized settings for Israel's unique climate conditions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-6">
                <div className="p-4 rounded-lg border bg-background/50">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-medium">Summer Settings</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Optimized for hot Mediterranean summers with temperatures exceeding 35°C
                      </p>
                    </div>
                    <Switch 
                      defaultChecked={data.israeliClimateAdaptation.summerSettings.active}
                      onCheckedChange={handleToggleSummerSettings}
                    />
                  </div>
                  
                  <Separator className="my-4" />
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Max Fan Speed</span>
                        <span className="text-sm font-medium">{data.israeliClimateAdaptation.summerSettings.maxFanSpeed} RPM</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Cooling Threshold</span>
                        <span className="text-sm font-medium">{data.israeliClimateAdaptation.summerSettings.coolingStartThreshold}°C</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Night Mode Cooling</span>
                        <Badge variant="outline">
                          {data.israeliClimateAdaptation.summerSettings.nightModeCooling ? "Enabled" : "Disabled"}
                        </Badge>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Cooling Aggressiveness</span>
                        <Badge variant="outline" className="capitalize">
                          {data.israeliClimateAdaptation.summerSettings.coolingAggressiveness}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Pre-cooling</span>
                        <Badge variant="outline">Enabled</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Dust Protection</span>
                        <Badge variant="outline">Enhanced</Badge>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 rounded-lg border bg-amber-50/50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/50">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-medium text-amber-800 dark:text-amber-300">Hamsin Mode</h3>
                      <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                        Special protection during extreme heat waves (sharav/hamsin)
                      </p>
                    </div>
                    <Switch defaultChecked={data.israeliClimateAdaptation.hamsinSettings.active} />
                  </div>
                  
                  <Separator className="my-4 bg-amber-200 dark:bg-amber-800" />
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-amber-800 dark:text-amber-300">Activation</span>
                        <Badge variant="outline" className="capitalize border-amber-300 dark:border-amber-700">
                          {data.israeliClimateAdaptation.hamsinSettings.trigger}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-amber-800 dark:text-amber-300">Cooling Threshold</span>
                        <span className="text-sm font-medium text-amber-800 dark:text-amber-300">
                          {data.israeliClimateAdaptation.hamsinSettings.coolingStartThreshold}°C
                        </span>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-amber-800 dark:text-amber-300">Override Normal Limits</span>
                        <Badge variant="outline" className="border-amber-300 dark:border-amber-700">
                          {data.israeliClimateAdaptation.hamsinSettings.overrideNormalLimits ? "Yes" : "No"}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-amber-800 dark:text-amber-300">Power Reduction</span>
                        <Badge variant="outline" className="border-amber-300 dark:border-amber-700">
                          Optional
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 rounded-lg border bg-background/50">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-medium">Desert Mode</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Protection against desert dust and sandy conditions
                      </p>
                    </div>
                    <Switch defaultChecked={data.israeliClimateAdaptation.desertModeSettings.active} />
                  </div>
                  
                  <Separator className="my-4" />
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Filtering Level</span>
                        <Badge variant="outline" className="capitalize">
                          {data.israeliClimateAdaptation.desertModeSettings.filteringLevel}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Cleaning Interval</span>
                        <span className="text-sm font-medium">
                          {data.israeliClimateAdaptation.desertModeSettings.cleaningInterval} days
                        </span>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Dust Sensor</span>
                        <Badge variant="outline">Active</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Intake Regulation</span>
                        <Badge variant="outline">Adaptive</Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" className="gap-1">
                <RefreshCw className="h-4 w-4" />
                Reset to Defaults
              </Button>
              <Button className="gap-1">
                Apply Changes
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        {/* Maintenance Tab */}
        <TabsContent value="maintenance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cooling System Maintenance</CardTitle>
              <CardDescription>
                Maintenance history and schedule for thermal management components
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg border bg-background/50 text-center">
                  <Clock className="h-6 w-6 mx-auto mb-2 text-primary" />
                  <h3 className="text-sm font-medium">Last Maintenance</h3>
                  <p className="text-lg font-bold mt-1">{formatDate(data.coolingSystem.lastMaintenance)}</p>
                </div>
                
                <div className="p-4 rounded-lg border bg-background/50 text-center">
                  <CalendarDays className="h-6 w-6 mx-auto mb-2 text-primary" />
                  <h3 className="text-sm font-medium">Next Scheduled</h3>
                  <p className="text-lg font-bold mt-1">{formatDate(data.coolingSystem.nextMaintenance)}</p>
                </div>
                
                <div className="p-4 rounded-lg border bg-background/50 text-center">
                  <CheckCircle className="h-6 w-6 mx-auto mb-2 text-primary" />
                  <h3 className="text-sm font-medium">System Status</h3>
                  <p className="text-lg font-bold mt-1 capitalize">{data.coolingSystem.maintenanceStatus}</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Maintenance Components</h3>
                
                <div className="space-y-3">
                  <div className="p-3 rounded-lg border bg-background/50">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <Fan className="h-5 w-5 text-primary" />
                        <div>
                          <p className="font-medium">Cooling Fans</p>
                          <p className="text-xs text-muted-foreground">Last cleaned: {formatDate("2025-01-15")}</p>
                        </div>
                      </div>
                      <Badge variant="outline">{data.coolingSystem.type === "air" ? "Primary" : "Secondary"}</Badge>
                    </div>
                  </div>
                  
                  {data.coolingSystem.type === "liquid" && (
                    <>
                      <div className="p-3 rounded-lg border bg-background/50">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-3">
                            <Droplets className="h-5 w-5 text-blue-500" />
                            <div>
                              <p className="font-medium">Coolant System</p>
                              <p className="text-xs text-muted-foreground">Last replaced: {formatDate("2024-10-12")}</p>
                            </div>
                          </div>
                          <Badge variant="outline">Primary</Badge>
                        </div>
                      </div>
                      
                      <div className="p-3 rounded-lg border bg-background/50">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-3">
                            <RefreshCw className="h-5 w-5 text-green-500" />
                            <div>
                              <p className="font-medium">Circulation Pump</p>
                              <p className="text-xs text-muted-foreground">Last inspected: {formatDate("2025-01-15")}</p>
                            </div>
                          </div>
                          <Badge variant="outline">Primary</Badge>
                        </div>
                      </div>
                    </>
                  )}
                  
                  <div className="p-3 rounded-lg border bg-background/50">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <ThermometerIcon className="h-5 w-5 text-red-500" />
                        <div>
                          <p className="font-medium">Temperature Sensors</p>
                          <p className="text-xs text-muted-foreground">Last calibrated: {formatDate("2025-02-23")}</p>
                        </div>
                      </div>
                      <Badge variant="outline">Essential</Badge>
                    </div>
                  </div>
                  
                  {data.israeliClimateAdaptation.desertModeSettings.active && (
                    <div className="p-3 rounded-lg border bg-background/50">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <Fan className="h-5 w-5 text-amber-500" />
                          <div>
                            <p className="font-medium">Dust Filters</p>
                            <p className="text-xs text-muted-foreground">
                              Last replaced: {formatDate("2025-03-05")}
                            </p>
                          </div>
                        </div>
                        <Badge variant="secondary">Recommended Service</Badge>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Recent Thermal Events</h3>
                
                <div className="max-h-[250px] overflow-y-auto space-y-3">
                  {data.thermalEvents.map((event, index) => (
                    <div key={index} className="p-3 rounded-lg border bg-background/50">
                      <div className="flex justify-between items-start">
                        <div className="flex items-start gap-3">
                          {event.type === "warning" ? (
                            <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
                          ) : (
                            <InfoIcon className="h-5 w-5 text-blue-500 mt-0.5" />
                          )}
                          <div>
                            <p className="font-medium">{event.description}</p>
                            <p className="text-sm text-muted-foreground">Action: {event.action}</p>
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(event.date).toLocaleString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {data.thermalEvents.length === 0 && (
                    <div className="flex flex-col items-center justify-center p-6 text-center">
                      <CheckCircle className="h-8 w-8 text-green-500 mb-2" />
                      <p className="text-sm font-medium">No thermal events recorded</p>
                      <p className="text-xs text-muted-foreground">System is operating normally</p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="gap-1 w-full">
                <CalendarDays className="h-4 w-4" />
                Schedule Maintenance
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default BatteryThermalManagementPanel;