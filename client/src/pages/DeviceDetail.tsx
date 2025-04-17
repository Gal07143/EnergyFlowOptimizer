import { useState, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription,
  CardFooter
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowUpDown, 
  Battery, 
  BatteryCharging, 
  BatteryFull, 
  Bolt, 
  ChevronLeft, 
  PlugZap, 
  Power, 
  Sun, 
  Thermometer,
  AlertTriangle,
  LineChart,
  Settings,
  RefreshCw,
  Gauge,
  Calendar,
  History
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import useDeviceWebSocket, { DeviceReading } from '@/hooks/useDeviceWebSocket';
import { queryClient } from '@/lib/queryClient';

// Component to display the device icon based on the device type
const DeviceIcon = ({ type, className = "h-6 w-6" }: { type: string, className?: string }) => {
  switch (type) {
    case 'solar_pv':
      return <Sun className={className} />;
    case 'battery_storage':
      return <Battery className={className} />;
    case 'ev_charger':
      return <PlugZap className={className} />;
    case 'smart_meter':
      return <Gauge className={className} />;
    case 'heat_pump':
      return <Thermometer className={className} />;
    default:
      return <Power className={className} />;
  }
};

// Status badge component
const StatusBadge = ({ status }: { status: string }) => {
  let variant: "default" | "secondary" | "destructive" | "outline" = "outline";
  let label = status;
  
  switch (status.toLowerCase()) {
    case 'online':
      variant = "default";
      break;
    case 'offline':
      variant = "secondary";
      break;
    case 'error':
      variant = "destructive";
      break;
    case 'maintenance':
      variant = "outline";
      break;
  }
  
  return <Badge variant={variant}>{label}</Badge>;
};

// Real-time readings display
const DeviceReadings = ({ deviceId, deviceType }: { deviceId: number, deviceType: string }) => {
  const [readings, setReadings] = useState<DeviceReading[]>([]);
  const { toast } = useToast();
  
  const { isConnected, lastMessage } = useDeviceWebSocket({
    deviceId,
    onDeviceReading: (reading) => {
      setReadings(prev => {
        const newReadings = [...prev, reading];
        // Keep only the most recent 100 readings
        if (newReadings.length > 100) {
          return newReadings.slice(newReadings.length - 100);
        }
        return newReadings;
      });
    },
    onConnect: (connectionId) => {
      console.log(`Connected to WebSocket with ID: ${connectionId}`);
    },
    onError: (error) => {
      toast({
        title: "WebSocket Error",
        description: error.message || "Failed to connect to real-time data service",
        variant: "destructive"
      });
    }
  });

  // Get the most recent reading
  const latestReading = readings.length > 0 ? readings[readings.length - 1] : null;
  
  const formatValue = (value: number | undefined, unit: string, decimals: number = 1) => {
    if (value === undefined || value === null) return 'N/A';
    return `${value.toFixed(decimals)} ${unit}`;
  };

  // Determine battery icon based on state of charge
  const getBatteryIcon = (stateOfCharge?: number) => {
    if (!stateOfCharge) return <Battery className="h-5 w-5" />;
    
    if (stateOfCharge > 80) return <BatteryFull className="h-5 w-5" />;
    if (stateOfCharge > 20) return <Battery className="h-5 w-5" />;
    return <Battery className="h-5 w-5 text-red-500" />;
  };
  
  // Render specific metrics based on device type
  const renderMetrics = () => {
    if (!latestReading) {
      return (
        <div className="flex items-center justify-center p-6">
          <p className="text-muted-foreground">No readings available</p>
        </div>
      );
    }
    
    const data = latestReading.data;
    
    // Common metrics for all device types
    const commonMetrics = (
      <>
        <div className="flex items-center justify-between p-2 border-b">
          <div className="flex items-center gap-2">
            <Power className="h-5 w-5" />
            <span>Power</span>
          </div>
          <span className="font-semibold">
            {formatValue(data.power, 'W')}
          </span>
        </div>
        
        <div className="flex items-center justify-between p-2 border-b">
          <div className="flex items-center gap-2">
            <Bolt className="h-5 w-5" />
            <span>Energy</span>
          </div>
          <span className="font-semibold">
            {formatValue(data.energy, 'kWh')}
          </span>
        </div>
        
        {data.temperature !== undefined && (
          <div className="flex items-center justify-between p-2 border-b">
            <div className="flex items-center gap-2">
              <Thermometer className="h-5 w-5" />
              <span>Temperature</span>
            </div>
            <span className="font-semibold">
              {formatValue(data.temperature, '°C')}
            </span>
          </div>
        )}
      </>
    );
    
    // Device-specific metrics
    switch (deviceType) {
      case 'solar_pv':
        return (
          <>
            {commonMetrics}
            <div className="flex items-center justify-between p-2 border-b">
              <div className="flex items-center gap-2">
                <Sun className="h-5 w-5" />
                <span>Irradiance</span>
              </div>
              <span className="font-semibold">
                {formatValue(data.irradiance, 'W/m²', 0)}
              </span>
            </div>
            <div className="flex items-center justify-between p-2">
              <div className="flex items-center gap-2">
                <ArrowUpDown className="h-5 w-5" />
                <span>Efficiency</span>
              </div>
              <span className="font-semibold">
                {formatValue(data.panelEfficiency ? data.panelEfficiency * 100 : undefined, '%', 1)}
              </span>
            </div>
          </>
        );
        
      case 'battery_storage':
        return (
          <>
            {commonMetrics}
            <div className="flex items-center justify-between p-2 border-b">
              <div className="flex items-center gap-2">
                {getBatteryIcon(data.stateOfCharge)}
                <span>State of Charge</span>
              </div>
              <span className="font-semibold">
                {formatValue(data.stateOfCharge, '%', 1)}
              </span>
            </div>
            <div className="flex items-center justify-between p-2">
              <div className="flex items-center gap-2">
                <ArrowUpDown className="h-5 w-5" />
                <span>Efficiency</span>
              </div>
              <span className="font-semibold">
                {formatValue(data.efficiency ? data.efficiency * 100 : undefined, '%', 1)}
              </span>
            </div>
          </>
        );
        
      case 'ev_charger':
        return (
          <>
            {commonMetrics}
            <div className="flex items-center justify-between p-2 border-b">
              <div className="flex items-center gap-2">
                <BatteryCharging className="h-5 w-5" />
                <span>Charging State</span>
              </div>
              <span className="font-semibold capitalize">
                {data.chargingState || 'Unknown'}
              </span>
            </div>
            {data.chargePercentage !== undefined && (
              <div className="flex items-center justify-between p-2">
                <div className="flex items-center gap-2">
                  <Battery className="h-5 w-5" />
                  <span>Vehicle Charge</span>
                </div>
                <span className="font-semibold">
                  {formatValue(data.chargePercentage, '%', 0)}
                </span>
              </div>
            )}
          </>
        );
        
      case 'smart_meter':
        return (
          <>
            {commonMetrics}
            <div className="flex items-center justify-between p-2 border-b">
              <div className="flex items-center gap-2">
                <ArrowUpDown className="h-5 w-5" />
                <span>Import Energy</span>
              </div>
              <span className="font-semibold">
                {formatValue(data.importEnergy, 'kWh')}
              </span>
            </div>
            <div className="flex items-center justify-between p-2">
              <div className="flex items-center gap-2">
                <ArrowUpDown className="h-5 w-5" />
                <span>Export Energy</span>
              </div>
              <span className="font-semibold">
                {formatValue(data.exportEnergy, 'kWh')}
              </span>
            </div>
          </>
        );
        
      case 'heat_pump':
        return (
          <>
            {commonMetrics}
            <div className="flex items-center justify-between p-2 border-b">
              <div className="flex items-center gap-2">
                <Thermometer className="h-5 w-5" />
                <span>Flow Temperature</span>
              </div>
              <span className="font-semibold">
                {formatValue(data.flowTemperature, '°C')}
              </span>
            </div>
            <div className="flex items-center justify-between p-2 border-b">
              <div className="flex items-center gap-2">
                <Thermometer className="h-5 w-5" />
                <span>Return Temperature</span>
              </div>
              <span className="font-semibold">
                {formatValue(data.returnTemperature, '°C')}
              </span>
            </div>
            <div className="flex items-center justify-between p-2">
              <div className="flex items-center gap-2">
                <ArrowUpDown className="h-5 w-5" />
                <span>COP</span>
              </div>
              <span className="font-semibold">
                {formatValue(data.cop, '', 2)}
              </span>
            </div>
          </>
        );
        
      default:
        return commonMetrics;
    }
  };
  
  // Determine if we need to show any warnings
  const getWarnings = () => {
    if (!latestReading) return null;
    
    const data = latestReading.data;
    const warnings = [];
    
    // Device type specific warnings
    switch (deviceType) {
      case 'battery_storage':
        if (data.stateOfCharge !== undefined && data.stateOfCharge < 10) {
          warnings.push("Battery charge critically low");
        }
        if (data.temperature !== undefined && data.temperature > 40) {
          warnings.push("Battery temperature high");
        }
        break;
        
      case 'solar_pv':
        if (data.power !== undefined && data.power < 50 && new Date().getHours() > 9 && new Date().getHours() < 15) {
          warnings.push("Lower than expected solar production");
        }
        break;
        
      case 'smart_meter':
        if (data.power !== undefined && Math.abs(data.power) > 5000) {
          warnings.push("High power consumption detected");
        }
        break;
    }
    
    if (warnings.length === 0) return null;
    
    return (
      <div className="mt-4">
        {warnings.map((warning, index) => (
          <div key={index} className="flex items-center gap-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300 rounded-md mt-1">
            <AlertTriangle className="h-5 w-5 flex-shrink-0" />
            <span className="text-sm">{warning}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center justify-between">
          <span>Real-time Data</span>
          <Badge variant={isConnected ? "default" : "secondary"}>
            {isConnected ? "Live" : "Disconnected"}
          </Badge>
        </CardTitle>
        <CardDescription>
          Latest readings from the device
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-1 mt-2">
          {renderMetrics()}
          {getWarnings()}
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <div className="text-xs text-muted-foreground">
          {latestReading ? 
            `Last updated: ${new Date(latestReading.timestamp).toLocaleTimeString()}` : 
            'No data available'}
        </div>
        <div className="text-xs text-muted-foreground">
          {readings.length > 0 ? `${readings.length} readings received` : ''}
        </div>
      </CardFooter>
    </Card>
  );
};

// Main device detail page component
const DeviceDetail = () => {
  const [, setLocation] = useLocation();
  const params = useParams<{ id: string }>();
  const deviceId = parseInt(params.id);
  const { toast } = useToast();
  
  // Query for device details
  const { data: device, isLoading, isError, error } = useQuery({
    queryKey: ['/api/devices', deviceId],
    queryFn: ({ signal }) => fetch(`/api/devices/${deviceId}`, { signal }).then(res => {
      if (!res.ok) throw new Error("Could not fetch device details");
      return res.json();
    }),
  });
  
  // Check if the device id is valid
  useEffect(() => {
    if (isNaN(deviceId)) {
      toast({
        title: "Invalid Device ID",
        description: "The device ID provided is not valid",
        variant: "destructive"
      });
      setLocation('/devices');
    }
  }, [deviceId, setLocation, toast]);
  
  // Error states
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="mt-2 text-muted-foreground">Loading device information...</p>
        </div>
      </div>
    );
  }
  
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <h3 className="text-xl font-semibold mb-2">Error Loading Device</h3>
        <p className="text-muted-foreground mb-4">{error?.message || "Could not load device details"}</p>
        <Button onClick={() => setLocation('/devices')}>
          Back to Devices
        </Button>
      </div>
    );
  }
  
  if (!device) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <h3 className="text-xl font-semibold mb-2">Device Not Found</h3>
        <p className="text-muted-foreground mb-4">The requested device could not be found</p>
        <Button onClick={() => setLocation('/devices')}>
          Back to Devices
        </Button>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header and back button */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setLocation('/devices')}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-semibold flex items-center gap-2">
            <DeviceIcon type={device.type} className="h-8 w-8" />
            {device.name}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <StatusBadge status={device.status} />
            <span className="text-sm text-muted-foreground capitalize">
              {device.type.replace('_', ' ')}
            </span>
            {device.model && (
              <span className="text-sm text-muted-foreground">
                | {device.manufacturer} {device.model}
              </span>
            )}
          </div>
        </div>
      </div>
      
      {/* Main content */}
      <Tabs defaultValue="readings" className="space-y-6">
        <TabsList>
          <TabsTrigger value="readings">
            <Gauge className="h-4 w-4 mr-2" />
            Readings
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="h-4 w-4 mr-2" />
            History
          </TabsTrigger>
          <TabsTrigger value="charts">
            <LineChart className="h-4 w-4 mr-2" />
            Charts
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </TabsTrigger>
        </TabsList>
        
        {/* Readings tab */}
        <TabsContent value="readings" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <DeviceReadings deviceId={deviceId} deviceType={device.type} />
            </div>
            
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Device Info</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {device.serialNumber && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Serial Number</span>
                        <span>{device.serialNumber}</span>
                      </div>
                    )}
                    
                    {device.firmwareVersion && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Firmware</span>
                        <span>{device.firmwareVersion}</span>
                      </div>
                    )}
                    
                    {device.capacity && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Capacity</span>
                        <span>{device.capacity} {device.type === 'battery_storage' ? 'kWh' : 'kW'}</span>
                      </div>
                    )}
                    
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Connection</span>
                      <span className="capitalize">{device.connectionProtocol || 'Unknown'}</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Last Seen</span>
                      <span>{new Date(device.updatedAt).toLocaleString()}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Controls</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Button className="w-full" variant="outline">
                      Refresh Data
                    </Button>
                    
                    {device.type === 'battery_storage' && (
                      <>
                        <Button className="w-full" variant="outline">
                          Force Charge
                        </Button>
                        <Button className="w-full" variant="outline">
                          Force Discharge
                        </Button>
                      </>
                    )}
                    
                    {device.type === 'ev_charger' && (
                      <>
                        <Button className="w-full" variant="outline">
                          Start Charging
                        </Button>
                        <Button className="w-full" variant="outline">
                          Stop Charging
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
        
        {/* History tab */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Historical Data</CardTitle>
              <CardDescription>
                View historical data for this device
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center h-64">
                <p className="text-muted-foreground">Historical data view will be implemented in a future update</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Charts tab */}
        <TabsContent value="charts">
          <Card>
            <CardHeader>
              <CardTitle>Analytics Charts</CardTitle>
              <CardDescription>
                Visualize device data through interactive charts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center h-64">
                <p className="text-muted-foreground">Charts will be implemented in a future update</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Settings tab */}
        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Device Settings</CardTitle>
              <CardDescription>
                Configure device parameters and settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center h-64">
                <p className="text-muted-foreground">Device settings will be implemented in a future update</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DeviceDetail;