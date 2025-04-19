import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { ConnectionStatus } from './ConnectionStatus';
import { useLatestEnergyReading, useRealTimeEnergyData } from '@/hooks/useEnergyData';
import { useDevices } from '@/hooks/useDevices';
import { useSiteSelector } from '@/hooks/useSiteData';
import { useOptimizationSettings } from '@/hooks/useOptimization';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  AlertCircle, 
  Bell, 
  Battery, 
  Check, 
  AlertTriangle, 
  BarChart3, 
  Calculator, 
  Settings, 
  Zap, 
  ChevronRight, 
  Activity, 
  LayoutGrid, 
  Plug,
  ArrowUpDown,
  RefreshCw,
  Lightbulb,
  ThermometerSun
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useInitializeDemoData } from '@/hooks/useSiteData';
import ImprovedEnergyForecast from '@/components/forecasting/ImprovedEnergyForecast';
import EnergyFlowWidget from './EnergyFlowWidget';
import ElectricityPriceWidget from './ElectricityPriceWidget';
import CostBalanceWidget from './CostBalanceWidget';
import TariffWidget from './TariffWidget';
import WeatherWidget from '@/components/weather/WeatherWidget';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";

// Interface for system alarm data
interface SystemAlarm {
  id: string;
  deviceId: string;
  deviceName: string;
  deviceType: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  timestamp: string;
  status: 'active' | 'acknowledged' | 'resolved';
}

// Interface for operation summary
interface OperationSummary {
  status: 'optimal' | 'warning' | 'alert';
  batteryLevel: number;
  batteryStatus: 'charging' | 'discharging' | 'idle';
  solarStatus: 'producing' | 'idle' | 'maintenance';
  gridStatus: 'connected' | 'disconnected';
  optimizationActive: boolean;
  optimizationCount: number;
  lastOptimizationTime: string;
  currentPowerFlow: {
    fromSolar: number;
    fromGrid: number;
    toBattery: number;
    toLoad: number;
    toGrid: number;
  };
  systemMode: 'normal' | 'eco' | 'backup' | 'peak-shaving';
  peakShavingActive: boolean;
  evCharging: boolean;
  heatPumpActive: boolean;
}

export default function Dashboard() {
  const { currentSiteId } = useSiteSelector();
  const { data: latestReading, isLoading: isLoadingReading, error: readingError } = useLatestEnergyReading(currentSiteId);
  const { data: devices, isLoading: isLoadingDevices } = useDevices(currentSiteId);
  const { data: optimizationSettings } = useOptimizationSettings(currentSiteId);
  const { isConnected, subscribe } = useRealTimeEnergyData(currentSiteId);
  const { mutate: initializeDemoData, isPending: isInitializingDemo } = useInitializeDemoData();
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [timeRange, setTimeRange] = useState<string>('day');
  
  // Fetch active alarms for the site
  const { data: activeAlarms, isLoading: isLoadingAlarms } = useQuery({
    queryKey: ['/api/alarms/active', currentSiteId],
    queryFn: async () => {
      if (!currentSiteId) return [];
      
      const res = await fetch(`/api/sites/${currentSiteId}/alarms/current?status=active`);
      if (!res.ok) throw new Error('Failed to fetch active alarms');
      
      return res.json() as Promise<SystemAlarm[]>;
    },
    enabled: !!currentSiteId,
  });
  
  // Fetch operation summary for the site
  const { data: operationSummary, isLoading: isLoadingOperations } = useQuery({
    queryKey: ['/api/sites/operations', currentSiteId],
    queryFn: async () => {
      if (!currentSiteId) return null;
      
      const res = await fetch(`/api/sites/${currentSiteId}/operations/summary`);
      if (!res.ok) throw new Error('Failed to fetch operations summary');
      
      return res.json() as Promise<OperationSummary>;
    },
    enabled: !!currentSiteId,
  });

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
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
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
      <div className="px-4 sm:px-6 lg:px-8 mb-4 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Dashboard
          </h2>
          <p className="text-muted-foreground">
            Energy management system overview
          </p>
        </div>
        <div className="flex space-x-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Time Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Last 24 Hours</SelectItem>
              <SelectItem value="week">Last Week</SelectItem>
              <SelectItem value="month">Last Month</SelectItem>
              <SelectItem value="year">Last Year</SelectItem>
            </SelectContent>
          </Select>
          
          <Button size="icon" variant="outline" onClick={() => window.location.reload()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          
          <ConnectionStatus siteId={currentSiteId} />
        </div>
      </div>
      
      {/* System Status Overview */}
      <div className="px-4 sm:px-6 lg:px-8 mb-6">
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <CardTitle>System Status</CardTitle>
              {activeAlarms && activeAlarms.length > 0 && (
                <Link href="/alarms">
                  <Button variant="destructive" size="sm" className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    {activeAlarms.length} Active Alarm{activeAlarms.length > 1 ? 's' : ''}
                  </Button>
                </Link>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {/* Battery Status */}
              <Card className="border">
                <CardContent className="p-4">
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center space-x-2">
                      <Battery className="h-4 w-4 text-primary" />
                      <span className="font-medium">Battery</span>
                    </div>
                    <Badge variant={
                      operationSummary?.batteryStatus === 'charging' ? 'default' :
                      operationSummary?.batteryStatus === 'discharging' ? 'secondary' :
                      'outline'
                    }>
                      {operationSummary?.batteryStatus || 'Unknown'}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Charge Level</span>
                      <span className="font-medium">{operationSummary?.batteryLevel || 0}%</span>
                    </div>
                    <Progress 
                      value={operationSummary?.batteryLevel || 0} 
                      className="h-2"
                    />
                  </div>
                </CardContent>
              </Card>
              
              {/* Solar Status */}
              <Card className="border">
                <CardContent className="p-4">
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center space-x-2">
                      <Zap className="h-4 w-4 text-yellow-500" />
                      <span className="font-medium">Solar</span>
                    </div>
                    <Badge variant={
                      operationSummary?.solarStatus === 'producing' ? 'default' :
                      operationSummary?.solarStatus === 'maintenance' ? 'destructive' :
                      'outline'
                    }>
                      {operationSummary?.solarStatus || 'Unknown'}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Current Output</span>
                      <span className="font-medium">{latestReading?.solarProduction?.toFixed(1) || "0.0"} kW</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Today's Production</span>
                      <span className="font-medium">{(latestReading?.solarProduction || 0) * 24} kWh</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Grid Status */}
              <Card className="border">
                <CardContent className="p-4">
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center space-x-2">
                      <Plug className="h-4 w-4 text-primary" />
                      <span className="font-medium">Grid</span>
                    </div>
                    <Badge variant={
                      operationSummary?.gridStatus === 'connected' ? 'default' : 'destructive'
                    }>
                      {operationSummary?.gridStatus || 'Unknown'}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Import</span>
                      <span className="font-medium">{latestReading?.gridImport?.toFixed(1) || "0.0"} kW</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Export</span>
                      <span className="font-medium">{latestReading?.gridExport?.toFixed(1) || "0.0"} kW</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Consumption Status */}
              <Card className="border">
                <CardContent className="p-4">
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center space-x-2">
                      <Activity className="h-4 w-4 text-primary" />
                      <span className="font-medium">Consumption</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Current Load</span>
                      <span className="font-medium">{latestReading?.homeConsumption?.toFixed(1) || "0.0"} kW</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Today's Usage</span>
                      <span className="font-medium">{(latestReading?.homeConsumption || 0) * 24} kWh</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
        
        {/* Active Devices Status */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {operationSummary?.evCharging && (
            <Card className="border">
              <CardContent className="py-3 px-4 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="rounded-full bg-blue-100 p-2">
                    <Plug className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <div className="font-medium">EV Charging</div>
                    <div className="text-xs text-muted-foreground">Active</div>
                  </div>
                </div>
                <Badge>7.2 kW</Badge>
              </CardContent>
            </Card>
          )}
          
          {operationSummary?.heatPumpActive && (
            <Card className="border">
              <CardContent className="py-3 px-4 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="rounded-full bg-red-100 p-2">
                    <ThermometerSun className="h-4 w-4 text-red-600" />
                  </div>
                  <div>
                    <div className="font-medium">Heat Pump</div>
                    <div className="text-xs text-muted-foreground">Heating</div>
                  </div>
                </div>
                <Badge>2.8 kW</Badge>
              </CardContent>
            </Card>
          )}
          
          {operationSummary?.peakShavingActive && (
            <Card className="border">
              <CardContent className="py-3 px-4 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="rounded-full bg-purple-100 p-2">
                    <ArrowUpDown className="h-4 w-4 text-purple-600" />
                  </div>
                  <div>
                    <div className="font-medium">Peak Shaving</div>
                    <div className="text-xs text-muted-foreground">Active</div>
                  </div>
                </div>
                <Badge variant="outline">Optimizing</Badge>
              </CardContent>
            </Card>
          )}
          
          <Card className="border">
            <CardContent className="py-3 px-4 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="rounded-full bg-green-100 p-2">
                  <Lightbulb className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <div className="font-medium">Smart Lighting</div>
                  <div className="text-xs text-muted-foreground">3 lights active</div>
                </div>
              </div>
              <Badge>0.15 kW</Badge>
            </CardContent>
          </Card>
        </div>
      </div>

      <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="px-4 sm:px-6 lg:px-8">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <LayoutGrid className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="energy" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Energy Flow
          </TabsTrigger>
          <TabsTrigger value="optimization" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Optimization
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="pt-6 space-y-6">
          {/* Main Dashboard Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* First row with 3 widgets */}
            <EnergyFlowWidget siteId={currentSiteId} />
            <ElectricityPriceWidget siteId={currentSiteId} />
            <CostBalanceWidget siteId={currentSiteId} />
          </div>
          
          {/* Second row with weather data and energy forecast */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1">
              <WeatherWidget siteId={currentSiteId} />
            </div>
            <div className="md:col-span-2">
              <ImprovedEnergyForecast siteId={currentSiteId} />
            </div>
          </div>
          
          {/* Additional widgets in a 2x2 grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1">
              <TariffWidget siteId={currentSiteId} />
            </div>
            
            <div className="md:col-span-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Smart Steering</CardTitle>
                    <CardDescription>Automatic optimization of your energy assets</CardDescription>
                  </CardHeader>
                  <CardContent className="text-muted-foreground">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div>Optimization Status</div>
                        <Badge variant={operationSummary?.optimizationActive ? "default" : "outline"}>
                          {operationSummary?.optimizationActive ? "Active" : "Idle"}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>System Mode</div>
                        <Badge variant="outline">
                          {operationSummary?.systemMode === 'eco' ? 'Eco' : 
                            operationSummary?.systemMode === 'peak-shaving' ? 'Peak Shaving' :
                            operationSummary?.systemMode === 'backup' ? 'Backup' : 'Normal'}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>Optimizations Today</div>
                        <span className="font-medium">{operationSummary?.optimizationCount || 0}</span>
                      </div>
                      
                      <div className="flex items-center">
                        <span className="inline-block w-3 h-3 bg-green-500 rounded-full mr-2"></span>
                        <span>Last optimized: {operationSummary?.lastOptimizationTime || 'Never'}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Energy Balance</CardTitle>
                    <CardDescription>Today's production and consumption</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="border p-3 rounded-md">
                        <div className="text-sm text-muted-foreground">Consumption</div>
                        <div className="text-xl font-medium mt-1">{latestReading?.homeConsumption?.toFixed(1) || "0.0"} kWh</div>
                      </div>
                      <div className="border p-3 rounded-md">
                        <div className="text-sm text-muted-foreground">Production</div>
                        <div className="text-xl font-medium mt-1">{latestReading?.solarProduction?.toFixed(1) || "0.0"} kWh</div>
                      </div>
                    </div>
                    <div className="mt-4">
                      <div className="text-sm text-muted-foreground">Daily balance</div>
                      <Progress 
                        value={(latestReading?.solarProduction || 0) / ((latestReading?.homeConsumption || 0.1) * 100)} 
                        className="h-2 mt-2" 
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="energy" className="pt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Energy Flow Diagram</CardTitle>
              <CardDescription>Visualize energy flow between your devices</CardDescription>
            </CardHeader>
            <CardContent className="h-[400px] flex items-center justify-center border-2 border-dashed rounded-md">
              <p className="text-muted-foreground">Interactive Energy Flow Diagram will be shown here</p>
            </CardContent>
          </Card>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Power Distribution</CardTitle>
                <CardDescription>Current power flow</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>From Solar</span>
                      <span className="font-medium">{operationSummary?.currentPowerFlow?.fromSolar || 0} kW</span>
                    </div>
                    <Progress 
                      value={
                        ((operationSummary?.currentPowerFlow?.fromSolar || 0) / 
                        (Math.max(0.1, latestReading?.homeConsumption || 1))) * 100
                      } 
                      className="h-2" 
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>From Grid</span>
                      <span className="font-medium">{operationSummary?.currentPowerFlow?.fromGrid || 0} kW</span>
                    </div>
                    <Progress 
                      value={
                        ((operationSummary?.currentPowerFlow?.fromGrid || 0) / 
                        (Math.max(0.1, latestReading?.homeConsumption || 1))) * 100
                      } 
                      className="h-2" 
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>To Battery</span>
                      <span className="font-medium">{operationSummary?.currentPowerFlow?.toBattery || 0} kW</span>
                    </div>
                    <Progress 
                      value={
                        ((operationSummary?.currentPowerFlow?.toBattery || 0) / 
                        (Math.max(0.1, latestReading?.homeConsumption || 1))) * 100
                      } 
                      className="h-2" 
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>To Load</span>
                      <span className="font-medium">{operationSummary?.currentPowerFlow?.toLoad || 0} kW</span>
                    </div>
                    <Progress 
                      value={
                        ((operationSummary?.currentPowerFlow?.toLoad || 0) / 
                        (Math.max(0.1, latestReading?.homeConsumption || 1))) * 100
                      } 
                      className="h-2" 
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>To Grid</span>
                      <span className="font-medium">{operationSummary?.currentPowerFlow?.toGrid || 0} kW</span>
                    </div>
                    <Progress 
                      value={
                        ((operationSummary?.currentPowerFlow?.toGrid || 0) / 
                        (Math.max(0.1, latestReading?.solarProduction || 1))) * 100
                      } 
                      className="h-2" 
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Energy Sources</CardTitle>
                <CardDescription>Distribution by source</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px] flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <p>Energy source distribution chart will be shown here</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="optimization" className="pt-6 space-y-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Optimization Settings</CardTitle>
              <CardDescription>Configure energy optimization parameters</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium mb-2">Optimization Mode</h3>
                    <Select value={optimizationSettings?.mode || 'cost_saving'}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select mode" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cost_saving">Cost Saving</SelectItem>
                        <SelectItem value="self_sufficiency">Self Sufficiency</SelectItem>
                        <SelectItem value="peak_shaving">Peak Shaving</SelectItem>
                        <SelectItem value="battery_life">Battery Life</SelectItem>
                        <SelectItem value="backup_ready">Backup Ready</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium mb-2">Battery Reserve (%)</h3>
                    <Select value={(optimizationSettings?.batteryReserve || 20).toString()}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Reserve percentage" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10%</SelectItem>
                        <SelectItem value="20">20%</SelectItem>
                        <SelectItem value="30">30%</SelectItem>
                        <SelectItem value="50">50%</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium mb-2">Excess Solar Handling</h3>
                    <Select value={optimizationSettings?.excessSolarHandling || 'charge_battery'}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Excess solar handling" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="export_grid">Export to Grid</SelectItem>
                        <SelectItem value="charge_battery">Charge Battery</SelectItem>
                        <SelectItem value="divert_loads">Divert to Loads</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium mb-2">Peak Shaving Threshold (kW)</h3>
                    <Select value={(optimizationSettings?.peakShavingThreshold || 5).toString()}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Peak threshold" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="3">3 kW</SelectItem>
                        <SelectItem value="5">5 kW</SelectItem>
                        <SelectItem value="7">7 kW</SelectItem>
                        <SelectItem value="10">10 kW</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium mb-2">Price Thresholds</h3>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Low ($/kWh)</p>
                        <Select value={(optimizationSettings?.lowPriceThreshold || 0.10).toString()}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Low price" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0.05">$0.05</SelectItem>
                            <SelectItem value="0.10">$0.10</SelectItem>
                            <SelectItem value="0.15">$0.15</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">High ($/kWh)</p>
                        <Select value={(optimizationSettings?.highPriceThreshold || 0.25).toString()}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="High price" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0.25">$0.25</SelectItem>
                            <SelectItem value="0.30">$0.30</SelectItem>
                            <SelectItem value="0.40">$0.40</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium mb-2">EV Charging Schedule</h3>
                    <Select value={optimizationSettings?.evChargingMode || 'smart'}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="EV charging mode" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="immediate">Immediate (Full Power)</SelectItem>
                        <SelectItem value="smart">Smart (Optimize for Cost)</SelectItem>
                        <SelectItem value="solar_only">Solar Only</SelectItem>
                        <SelectItem value="scheduled">Scheduled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end mt-6">
                <Button>
                  Save Settings
                </Button>
              </div>
            </CardContent>
          </Card>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Optimization History</CardTitle>
                <CardDescription>Recent optimization events</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[1, 2, 3].map((_, i) => (
                    <div key={i} className="flex items-center p-2 border rounded-md">
                      <div className="mr-4">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-sm">Battery charged from excess solar</div>
                        <div className="text-xs text-muted-foreground">Today, {10 - i}:30 AM</div>
                      </div>
                      <Badge variant="outline">4.2 kWh</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="outline" size="sm" className="w-full">
                  View All History
                </Button>
              </CardFooter>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Savings Summary</CardTitle>
                <CardDescription>Cost savings from optimization</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Card className="border">
                      <CardContent className="p-3 text-center">
                        <p className="text-xs text-muted-foreground">Today</p>
                        <p className="text-2xl font-bold">$2.43</p>
                      </CardContent>
                    </Card>
                    
                    <Card className="border">
                      <CardContent className="p-3 text-center">
                        <p className="text-xs text-muted-foreground">This Month</p>
                        <p className="text-2xl font-bold">$36.19</p>
                      </CardContent>
                    </Card>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Battery Arbitrage</span>
                      <span className="font-medium">$1.27</span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Solar Self-Consumption</span>
                      <span className="font-medium">$0.89</span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Peak Shaving</span>
                      <span className="font-medium">$0.27</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
