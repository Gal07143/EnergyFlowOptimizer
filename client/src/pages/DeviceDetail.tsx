import { useState, useEffect } from "react";
import { useParams, Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useWebSocketContext } from "@/hooks/WebSocketProvider";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  Activity,
  Battery,
  Zap,
  Thermometer,
  BarChart3,
  RefreshCw,
  Play,
  Pause,
  Power,
  AlertTriangle,
  Check,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { WebSocketStatus } from "@/components/ui/websocket-status";
import { getQueryFn } from "@/lib/queryClient";

// Device reading types
interface DeviceReading {
  deviceId: number;
  timestamp: string;
  power?: number;
  energy?: number;
  voltage?: number;
  temperature?: number;
  stateOfCharge?: number;
  frequency?: number;
  additionalData?: Record<string, any>;
}

// Device type
interface Device {
  id: number;
  name: string;
  type: string;
  model: string;
  manufacturer: string;
  status: string;
  siteId: number;
  createdAt: string;
}

// Component for displaying the latest reading data
const LatestReadingCard = ({ 
  title, 
  value, 
  unit, 
  icon, 
  className = "", 
  loading = false,
  trend = 0 // 1 = up, -1 = down, 0 = neutral
}) => {
  if (loading) {
    return (
      <Card className="col-span-1">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            <Skeleton className="h-4 w-24" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center">
            <Skeleton className="h-9 w-20" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="col-span-1">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between items-center">
          <div className="space-y-1">
            <p className="text-2xl font-bold">
              {value !== undefined && value !== null 
                ? typeof value === 'number' 
                  ? value.toLocaleString(undefined, { maximumFractionDigits: 2 }) 
                  : value
                : 'N/A'}
              <span className="text-sm ml-1 text-muted-foreground">{unit}</span>
            </p>
            {trend !== 0 && (
              <p className={`text-xs ${trend > 0 ? 'text-green-500' : 'text-red-500'} flex items-center`}>
                {trend > 0 ? '↑' : '↓'} {Math.abs(trend).toFixed(1)}% from last reading
              </p>
            )}
          </div>
          <div className={`p-2 rounded-full ${className}`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Status badge component
const StatusBadge = ({ status }: { status: string }) => {
  const getStatusDetails = () => {
    switch (status?.toLowerCase()) {
      case 'online':
        return { variant: 'default', icon: <Check className="h-3 w-3 mr-1" />, label: 'Online' };
      case 'offline':
        return { variant: 'destructive', icon: <Power className="h-3 w-3 mr-1" />, label: 'Offline' };
      case 'warning':
        return { variant: 'warning', icon: <AlertTriangle className="h-3 w-3 mr-1" />, label: 'Warning' };
      case 'error':
        return { variant: 'destructive', icon: <AlertTriangle className="h-3 w-3 mr-1" />, label: 'Error' };
      case 'idle':
        return { variant: 'secondary', icon: <Pause className="h-3 w-3 mr-1" />, label: 'Idle' };
      case 'active':
        return { variant: 'success', icon: <Play className="h-3 w-3 mr-1" />, label: 'Active' };
      default:
        return { variant: 'outline', icon: <Activity className="h-3 w-3 mr-1" />, label: status || 'Unknown' };
    }
  };
  
  const { variant, icon, label } = getStatusDetails();
  
  return (
    <Badge variant={variant as any} className="ml-2 flex items-center">
      {icon}
      <span>{label}</span>
    </Badge>
  );
};

// Main component
export default function DeviceDetail() {
  const { id } = useParams<{ id: string }>();
  const deviceId = parseInt(id);
  const [, navigate] = useLocation();
  const [tab, setTab] = useState("overview");
  
  // WebSocket connection
  const { 
    subscribeDevice, 
    unsubscribeDevice, 
    isConnected, 
    lastMessages, 
    registerHandler 
  } = useWebSocketContext();
  
  // Latest device reading from WebSocket
  const [liveReading, setLiveReading] = useState<DeviceReading | null>(null);
  
  // Previous reading for trend calculation
  const [previousReading, setPreviousReading] = useState<DeviceReading | null>(null);
  
  // Fetch device details
  const { 
    data: device, 
    isLoading: isLoadingDevice,
    error: deviceError
  } = useQuery<Device>({
    queryKey: ['/api/devices', deviceId],
    queryFn: getQueryFn(),
    retry: 1,
    enabled: !isNaN(deviceId),
  });
  
  // Fetch historical readings
  const { 
    data: readings, 
    isLoading: isLoadingReadings,
    refetch: refetchReadings
  } = useQuery<DeviceReading[]>({
    queryKey: ['/api/devices', deviceId, 'readings'],
    queryFn: getQueryFn(),
    retry: 1,
    enabled: !isNaN(deviceId) && !!device,
  });
  
  // Subscribe to device updates via WebSocket
  useEffect(() => {
    if (deviceId && !isNaN(deviceId) && isConnected) {
      console.log(`Subscribing to device ${deviceId} updates`);
      subscribeDevice(deviceId);
      
      // Return cleanup function
      return () => {
        console.log(`Unsubscribing from device ${deviceId} updates`);
        unsubscribeDevice();
      };
    }
  }, [deviceId, isConnected, subscribeDevice, unsubscribeDevice]);
  
  // Handle device reading updates
  useEffect(() => {
    if (!deviceId || isNaN(deviceId)) return;
    
    const handleDeviceReading = (data: DeviceReading) => {
      if (data.deviceId === deviceId) {
        console.log('Received device reading:', data);
        
        // Save previous reading for trend calculation
        if (liveReading) {
          setPreviousReading(liveReading);
        }
        
        // Update with new reading
        setLiveReading(data);
      }
    };
    
    // Register handler
    const cleanupHandler = registerHandler('deviceReading', handleDeviceReading);
    
    // Get last device reading message if available
    const lastDeviceReading = lastMessages['deviceReading'];
    if (lastDeviceReading && lastDeviceReading.deviceId === deviceId) {
      setLiveReading(lastDeviceReading);
    }
    
    return cleanupHandler;
  }, [deviceId, lastMessages, registerHandler, liveReading]);
  
  // Calculate trend percentage between readings
  const calculateTrend = (current?: number, previous?: number): number => {
    if (current === undefined || previous === undefined || previous === 0) {
      return 0;
    }
    return ((current - previous) / Math.abs(previous)) * 100;
  };
  
  // Format the device type for display
  const formatDeviceType = (type: string) => {
    return type.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };
  
  // If device is not found or loading
  if (isLoadingDevice) {
    return (
      <div className="container mx-auto p-4 space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-64" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Skeleton className="h-32 col-span-1" />
          <Skeleton className="h-32 col-span-1" />
          <Skeleton className="h-32 col-span-1" />
          <Skeleton className="h-32 col-span-1" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  
  if (deviceError || !device) {
    return (
      <div className="container mx-auto p-4">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Failed to load device information. The device may have been deleted or you do not have access.
          </AlertDescription>
        </Alert>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/devices')}>
          <ChevronLeft className="mr-2 h-4 w-4" /> Back to Devices
        </Button>
      </div>
    );
  }
  
  // Display device details
  return (
    <div className="container mx-auto p-4 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center">
          <Button variant="outline" size="sm" onClick={() => navigate('/devices')}>
            <ChevronLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <h1 className="ml-4 text-xl font-bold">
            {device.name}
            <StatusBadge status={liveReading?.additionalData?.status || device.status} />
          </h1>
        </div>
        
        <div className="flex items-center gap-2">
          <WebSocketStatus className="mr-1" />
          <Badge variant="outline" className="mr-2">
            {formatDeviceType(device.type)}
          </Badge>
          <Button size="sm" variant="outline" onClick={() => refetchReadings()}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
        </div>
      </div>
      
      <Tabs defaultValue="overview" value={tab} onValueChange={setTab} className="space-y-4">
        <div className="flex justify-between items-center">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="readings">Readings</TabsTrigger>
            <TabsTrigger value="controls">Controls</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>
          <div className="text-sm text-muted-foreground">
            Last update: {liveReading ? new Date(liveReading.timestamp).toLocaleString() : 'No live data'}
          </div>
        </div>
        
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Power reading */}
            <LatestReadingCard
              title="Power"
              value={liveReading?.power}
              unit="W"
              icon={<Zap className="h-6 w-6 text-yellow-500" />}
              className="bg-yellow-100 dark:bg-yellow-900/20"
              loading={isLoadingReadings && !liveReading}
              trend={calculateTrend(liveReading?.power, previousReading?.power)}
            />
            
            {/* Energy reading */}
            <LatestReadingCard
              title="Energy"
              value={liveReading?.energy}
              unit="kWh"
              icon={<Activity className="h-6 w-6 text-blue-500" />}
              className="bg-blue-100 dark:bg-blue-900/20"
              loading={isLoadingReadings && !liveReading}
              trend={calculateTrend(liveReading?.energy, previousReading?.energy)}
            />
            
            {/* Based on device type, show relevant readings */}
            {device.type === 'battery_storage' && (
              <LatestReadingCard
                title="State of Charge"
                value={liveReading?.stateOfCharge}
                unit="%"
                icon={<Battery className="h-6 w-6 text-green-500" />}
                className="bg-green-100 dark:bg-green-900/20"
                loading={isLoadingReadings && !liveReading}
                trend={calculateTrend(liveReading?.stateOfCharge, previousReading?.stateOfCharge)}
              />
            )}
            
            {/* Temperature reading (if available) */}
            {(liveReading?.temperature !== undefined || device.type === 'heat_pump' || device.type === 'solar_pv') && (
              <LatestReadingCard
                title="Temperature"
                value={liveReading?.temperature}
                unit="°C"
                icon={<Thermometer className="h-6 w-6 text-red-500" />}
                className="bg-red-100 dark:bg-red-900/20"
                loading={isLoadingReadings && !liveReading}
                trend={calculateTrend(liveReading?.temperature, previousReading?.temperature)}
              />
            )}
            
            {/* Voltage reading */}
            <LatestReadingCard
              title="Voltage"
              value={liveReading?.voltage}
              unit="V"
              icon={<BarChart3 className="h-6 w-6 text-purple-500" />}
              className="bg-purple-100 dark:bg-purple-900/20"
              loading={isLoadingReadings && !liveReading}
              trend={calculateTrend(liveReading?.voltage, previousReading?.voltage)}
            />
          </div>
          
          {/* Device info card */}
          <Card>
            <CardHeader>
              <CardTitle>Device Information</CardTitle>
              <CardDescription>
                Technical details and specifications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-medium text-sm text-muted-foreground mb-2">Basic Information</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="font-medium">Device ID:</span>
                      <span>{device.id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Manufacturer:</span>
                      <span>{device.manufacturer}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Model:</span>
                      <span>{device.model}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Type:</span>
                      <span>{formatDeviceType(device.type)}</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="font-medium text-sm text-muted-foreground mb-2">Additional Data</h3>
                  <div className="space-y-2">
                    {liveReading?.additionalData && Object.entries(liveReading.additionalData).map(([key, value]) => (
                      <div key={key} className="flex justify-between">
                        <span className="font-medium">
                          {key.split(/(?=[A-Z])/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}:
                        </span>
                        <span>
                          {typeof value === 'number' 
                            ? value.toLocaleString(undefined, { maximumFractionDigits: 2 })
                            : typeof value === 'boolean'
                              ? value ? 'Yes' : 'No'
                              : value === null
                                ? 'N/A'
                                : String(value)
                          }
                        </span>
                      </div>
                    ))}
                    
                    {(!liveReading?.additionalData || Object.keys(liveReading.additionalData).length === 0) && (
                      <div className="text-muted-foreground text-sm">No additional data available</div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <p className="text-sm text-muted-foreground">
                Last status update: {new Date(device.createdAt).toLocaleString()}
              </p>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="readings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Historical Readings</CardTitle>
              <CardDescription>
                Recent device readings and measurements
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingReadings ? (
                <div className="space-y-2">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : readings && readings.length > 0 ? (
                <div className="rounded-md border">
                  <div className="overflow-x-auto">
                    <table className="w-full caption-bottom text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="h-12 px-4 text-left align-middle font-medium">Timestamp</th>
                          <th className="h-12 px-4 text-left align-middle font-medium">Power (W)</th>
                          <th className="h-12 px-4 text-left align-middle font-medium">Energy (kWh)</th>
                          <th className="h-12 px-4 text-left align-middle font-medium">Voltage (V)</th>
                          {device.type === 'battery_storage' && (
                            <th className="h-12 px-4 text-left align-middle font-medium">State of Charge (%)</th>
                          )}
                          {(device.type === 'heat_pump' || device.type === 'solar_pv') && (
                            <th className="h-12 px-4 text-left align-middle font-medium">Temperature (°C)</th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {readings.map((reading, idx) => (
                          <tr key={idx} className="border-b">
                            <td className="p-4 align-middle">{new Date(reading.timestamp).toLocaleString()}</td>
                            <td className="p-4 align-middle">{reading.power?.toLocaleString(undefined, { maximumFractionDigits: 2 }) || 'N/A'}</td>
                            <td className="p-4 align-middle">{reading.energy?.toLocaleString(undefined, { maximumFractionDigits: 2 }) || 'N/A'}</td>
                            <td className="p-4 align-middle">{reading.voltage?.toLocaleString(undefined, { maximumFractionDigits: 2 }) || 'N/A'}</td>
                            {device.type === 'battery_storage' && (
                              <td className="p-4 align-middle">{reading.stateOfCharge?.toLocaleString(undefined, { maximumFractionDigits: 2 }) || 'N/A'}</td>
                            )}
                            {(device.type === 'heat_pump' || device.type === 'solar_pv') && (
                              <td className="p-4 align-middle">{reading.temperature?.toLocaleString(undefined, { maximumFractionDigits: 2 }) || 'N/A'}</td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  No historical readings available
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" size="sm" onClick={() => refetchReadings()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Data
              </Button>
              {readings && readings.length > 0 && (
                <div className="text-sm text-muted-foreground">
                  Showing {readings.length} readings
                </div>
              )}
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="controls" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Device Controls</CardTitle>
              <CardDescription>
                Control and manage device operations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {device.type === 'battery_storage' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Charge Control</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span>Charge Mode:</span>
                        <Badge variant="outline">
                          {liveReading?.additionalData?.mode || 'Auto'}
                        </Badge>
                      </div>
                      <div className="flex justify-between pt-2">
                        <Button variant="outline" size="sm">
                          Start Charging
                        </Button>
                        <Button variant="outline" size="sm">
                          Stop Charging
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Discharge Control</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span>Current SoC:</span>
                        <Badge>
                          {liveReading?.stateOfCharge?.toFixed(1) || 'N/A'}%
                        </Badge>
                      </div>
                      <div className="flex justify-between pt-2">
                        <Button variant="outline" size="sm">
                          Start Discharging
                        </Button>
                        <Button variant="outline" size="sm">
                          Stop Discharging
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
              
              {device.type === 'ev_charger' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Charging Control</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span>Status:</span>
                        <Badge variant={liveReading?.additionalData?.isCharging ? 'default' : 'secondary'}>
                          {liveReading?.additionalData?.isCharging ? 'Charging' : 'Idle'}
                        </Badge>
                      </div>
                      <div className="flex justify-between pt-2">
                        <Button variant="outline" size="sm">
                          Start Charging
                        </Button>
                        <Button variant="outline" size="sm">
                          Stop Charging
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Power Limit</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span>Current Power:</span>
                        <Badge variant="outline">
                          {liveReading?.power?.toFixed(0) || 'N/A'} W
                        </Badge>
                      </div>
                      <div className="flex justify-between pt-2">
                        <Button variant="outline" size="sm">
                          Set Limit
                        </Button>
                        <Button variant="outline" size="sm">
                          Reset Limit
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
              
              {device.type === 'heat_pump' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Mode Control</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span>Current Mode:</span>
                        <Badge variant="outline">
                          {liveReading?.additionalData?.mode || 'Unknown'}
                        </Badge>
                      </div>
                      <div className="flex justify-between pt-2">
                        <Button variant="outline" size="sm">
                          Heating Mode
                        </Button>
                        <Button variant="outline" size="sm">
                          Cooling Mode
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Temperature Control</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span>Target Temp:</span>
                        <Badge>
                          {liveReading?.additionalData?.targetTemp?.toFixed(1) || 'N/A'}°C
                        </Badge>
                      </div>
                      <div className="flex justify-between pt-2">
                        <Button variant="outline" size="sm">
                          Decrease
                        </Button>
                        <Button variant="outline" size="sm">
                          Increase
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
              
              {(device.type === 'solar_pv' || device.type === 'smart_meter') && (
                <div className="text-center py-4 text-muted-foreground">
                  This device type does not support direct controls
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Device Settings</CardTitle>
              <CardDescription>
                Configuration and preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center py-4 text-muted-foreground">
              Device settings will be implemented in a future update
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}