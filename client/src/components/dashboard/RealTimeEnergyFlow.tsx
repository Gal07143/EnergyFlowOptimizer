import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Battery, 
  Zap, 
  SunIcon, 
  Home, 
  PlugZap, 
  RefreshCw,
  Activity,
  CircleAlert,
  Wifi,
  ChevronRight,
  Gauge,
  AreaChart,
  Link,
  ChevronsRight
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useSiteContext } from '@/hooks/use-site-context';
import { useWebSocket } from '@/hooks/WebSocketProvider';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { useLocation } from 'wouter';

// SVG icons for different device types
const SolarPanelIcon = () => (
  <svg 
    width="32" 
    height="32" 
    viewBox="0 0 24 24" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
    className="text-yellow-500"
  >
    <rect x="4" y="4" width="16" height="16" rx="1" stroke="currentColor" strokeWidth="2"/>
    <path d="M4 8H20" stroke="currentColor" strokeWidth="2"/>
    <path d="M4 12H20" stroke="currentColor" strokeWidth="2"/>
    <path d="M4 16H20" stroke="currentColor" strokeWidth="2"/>
    <path d="M8 4V20" stroke="currentColor" strokeWidth="2"/>
    <path d="M12 4V20" stroke="currentColor" strokeWidth="2"/>
    <path d="M16 4V20" stroke="currentColor" strokeWidth="2"/>
  </svg>
);

const BatteryStorageIcon = () => (
  <svg 
    width="32" 
    height="32" 
    viewBox="0 0 24 24" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
    className="text-green-500"
  >
    <rect x="3" y="6" width="18" height="12" rx="1" stroke="currentColor" strokeWidth="2"/>
    <path d="M7 10V14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M11 10V14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M15 10V14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M19 10H21C21.5523 10 22 10.4477 22 11V13C22 13.5523 21.5523 14 21 14H19" stroke="currentColor" strokeWidth="2"/>
  </svg>
);

const EVChargerIcon = () => (
  <svg 
    width="32" 
    height="32" 
    viewBox="0 0 24 24" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
    className="text-blue-500"
  >
    <path d="M7 17H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M9 17L10 10H14L15 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M5 11L7 7L17 7L19 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <rect x="3" y="11" width="18" height="6" rx="1" stroke="currentColor" strokeWidth="2"/>
    <path d="M12 4V7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M7 20L6 22" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M17 20L18 22" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

const SmartMeterIcon = () => (
  <svg 
    width="32" 
    height="32" 
    viewBox="0 0 24 24" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
    className="text-teal-500"
  >
    <rect x="4" y="4" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="2"/>
    <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2"/>
    <path d="M12 10V12L13.5 13.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M16 7L18 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M8 7L6 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M16 17L18 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M8 17L6 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

const HeatPumpIcon = () => (
  <svg 
    width="32" 
    height="32" 
    viewBox="0 0 24 24" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
    className="text-orange-500"
  >
    <rect x="3" y="6" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="2"/>
    <path d="M7 10C7 9.44772 7.44772 9 8 9H10C10.5523 9 11 9.44772 11 10V14C11 14.5523 10.5523 15 10 15H8C7.44772 15 7 14.5523 7 14V10Z" stroke="currentColor" strokeWidth="2"/>
    <path d="M14 9H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M14 12H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M14 15H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M3 9L1 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M3 15L1 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M23 12L21 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

const InverterIcon = () => (
  <svg 
    width="32" 
    height="32" 
    viewBox="0 0 24 24" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
    className="text-violet-500"
  >
    <rect x="4" y="4" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="2"/>
    <path d="M8 8L16 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M16 8L8 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <circle cx="8" cy="8" r="1" fill="currentColor"/>
    <circle cx="16" cy="8" r="1" fill="currentColor"/>
    <circle cx="8" cy="16" r="1" fill="currentColor"/>
    <circle cx="16" cy="16" r="1" fill="currentColor"/>
  </svg>
);

const GridIcon = () => (
  <svg 
    width="32" 
    height="32" 
    viewBox="0 0 24 24" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
    className="text-indigo-500"
  >
    <path d="M3 7L5 3H19L21 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M12 3V7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M10 10L5 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M14 10L19 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M3 7H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M9 15H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

// Using a custom hook to get real-time energy data
const useEnergyData = (siteId?: number | null) => {
  const [flowData, setFlowData] = useState({
    solar: { power: 0, status: 'offline', devices: [] },
    battery: { power: 0, soc: 60, status: 'standby', direction: 'idle', devices: [] },
    grid: { power: 0, direction: 'import' },
    home: { power: 0 },
    ev: { power: 0, status: 'disconnected', devices: [] },
    heatpump: { power: 0, status: 'idle', devices: [] },
    smartmeter: { power: 0, status: 'online', devices: [] },
    timestamp: new Date().toISOString()
  });
  
  const { connected: isConnected, lastMessage } = useWebSocket();
  
  // Fetch initial data
  const { data: initialData } = useQuery({
    queryKey: [`/api/sites/${siteId}/energy/latest`],
    enabled: !!siteId,
    refetchInterval: 10000, // Fallback to polling if WebSocket fails
  });
  
  // Fetch site devices
  const { data: devices } = useQuery({
    queryKey: [`/api/sites/${siteId}/devices`],
    enabled: !!siteId,
  });
  
  // Group devices by type
  useEffect(() => {
    if (devices) {
      const groupedDevices = {
        solar: devices.filter((d: any) => d.type === 'solar_pv'),
        battery: devices.filter((d: any) => d.type === 'battery_storage'),
        ev: devices.filter((d: any) => d.type === 'ev_charger'),
        heatpump: devices.filter((d: any) => d.type === 'heat_pump'),
        smartmeter: devices.filter((d: any) => d.type === 'smart_meter'),
      };
      
      setFlowData(prev => ({
        ...prev,
        solar: { ...prev.solar, devices: groupedDevices.solar },
        battery: { ...prev.battery, devices: groupedDevices.battery },
        ev: { ...prev.ev, devices: groupedDevices.ev },
        heatpump: { ...prev.heatpump, devices: groupedDevices.heatpump },
        smartmeter: { ...prev.smartmeter, devices: groupedDevices.smartmeter },
      }));
    }
  }, [devices]);
  
  // Process WebSocket messages or initial data
  useEffect(() => {
    // If we have a WebSocket message, use that
    if (lastMessage) {
      try {
        const data = JSON.parse(lastMessage.data);
        if (data.type === 'energy_update' && data.siteId === siteId) {
          setFlowData(prev => ({ ...prev, ...data.payload, timestamp: new Date().toISOString() }));
        }
      } catch (err) {
        console.error('Error parsing WebSocket message:', err);
      }
    }
    // Otherwise use the initial data from REST API
    else if (initialData) {
      setFlowData(prev => ({ ...prev, ...initialData }));
    }
  }, [lastMessage, initialData, siteId]);
  
  return { flowData, isRealTime: isConnected };
};

export default function RealTimeEnergyFlow() {
  const { currentSiteId } = useSiteContext();
  const { flowData, isRealTime } = useEnergyData(currentSiteId);
  const [, navigate] = useLocation();
  
  // Helper for formatting power values
  const formatPower = (power: number) => {
    if (Math.abs(power) < 1) {
      return `${(power * 1000).toFixed(0)} W`;
    }
    return `${power.toFixed(1)} kW`;
  };
  
  // Flow animation intensities based on power values
  const getFlowIntensity = (power: number) => {
    const absValue = Math.abs(power);
    if (absValue < 0.1) return 'none';
    if (absValue < 1) return 'low';
    if (absValue < 3) return 'medium';
    return 'high';
  };
  
  // Navigate to electrical diagram
  const handleOpenElectricalDiagram = () => {
    navigate('/electrical-diagram');
  };
  
  // Get device count for each category
  const getDeviceCount = (category: string) => {
    //@ts-ignore
    return flowData[category]?.devices?.length || 0;
  };
  
  // Calculate arrow positions
  const getArrowPositions = () => {
    const positions = {
      solarToHome: { active: flowData.solar.power > 0.1, direction: 'down' },
      solarToBattery: { active: flowData.battery.direction === 'charging' && flowData.solar.power > 0.1, direction: 'down' },
      batteryToHome: { active: flowData.battery.direction === 'discharging', direction: 'right' },
      gridToHome: { active: flowData.grid.direction === 'import' && flowData.grid.power > 0.1, direction: 'right' },
      homeToGrid: { active: flowData.grid.direction === 'export' && flowData.grid.power > 0.1, direction: 'left' },
      homeToBattery: { active: false, direction: 'left' }, // Not common, but could happen in some systems
      homeToEv: { active: flowData.ev.power > 0.1, direction: 'down' },
      homeToPump: { active: flowData.heatpump.power > 0.1, direction: 'down-right' },
      batteryToEv: { active: flowData.battery.direction === 'discharging' && flowData.ev.power > 0.1, direction: 'down' },
      gridToEv: { active: flowData.grid.direction === 'import' && flowData.ev.power > 0.1, direction: 'right' },
    };
    
    return positions;
  };
  
  const arrows = getArrowPositions();
  
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center">
              <Activity className="h-5 w-5 mr-2 text-primary" />
              Real-Time Energy Flow
            </CardTitle>
            <CardDescription>
              Visualizing current energy flow between your system components
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={isRealTime ? 'default' : 'outline'} className="mr-2">
              {isRealTime ? (
                <>
                  <Wifi className="h-3 w-3 mr-1 animate-pulse" />
                  <span>Live</span>
                </>
              ) : (
                <>
                  <RefreshCw className="h-3 w-3 mr-1" />
                  <span>Polling</span>
                </>
              )}
            </Badge>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="text-xs text-muted-foreground">
                    {new Date(flowData.timestamp).toLocaleTimeString()}
                  </div>
                </TooltipTrigger>
                <TooltipContent>Last updated</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Button 
              variant="outline" 
              size="sm" 
              className="flex items-center text-xs ml-2"
              onClick={handleOpenElectricalDiagram}
            >
              <Link className="h-3.5 w-3.5 mr-1" />
              Electrical Diagram
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative h-[420px] bg-gradient-to-b from-muted/20 to-muted/40 rounded-lg mb-4 overflow-hidden">
          {/* Real energy diagram with realistic icons */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            
            {/* Top row - Generation sources */}
            <div className="w-full px-8 pt-6 grid grid-cols-2">
              {/* Solar Panel Group */}
              <div className="flex flex-col">
                <div className="flex items-center mb-2">
                  <h3 className="text-sm font-semibold">Solar Generation</h3>
                  <Badge className="ml-2" variant="outline">
                    {getDeviceCount('solar')} devices
                  </Badge>
                </div>
                
                <div className="flex items-start space-x-4">
                  <div className="flex flex-col items-center">
                    <div className={`p-4 rounded-lg border-2 ${
                      flowData.solar.power > 0.1 
                        ? 'bg-yellow-50 border-yellow-300 dark:bg-yellow-950 dark:border-yellow-700' 
                        : 'bg-muted border-muted-foreground/20'
                    } relative`}>
                      <SolarPanelIcon />
                      {flowData.solar.status === 'fault' && (
                        <CircleAlert className="h-5 w-5 text-destructive absolute -top-2 -right-2" />
                      )}
                    </div>
                    <div className="mt-1 text-center">
                      <div className="text-sm font-semibold">{formatPower(flowData.solar.power)}</div>
                    </div>
                  </div>
                  
                  {/* Additional solar devices if there are more than one */}
                  {getDeviceCount('solar') > 1 && (
                    <div className="flex flex-col items-center mt-2">
                      <div className={`p-3 rounded-lg border ${
                        flowData.solar.power > 0.1 
                          ? 'bg-yellow-50 border-yellow-300 dark:bg-yellow-950 dark:border-yellow-700' 
                          : 'bg-muted border-muted-foreground/20'
                      } relative`}>
                        <SolarPanelIcon />
                      </div>
                      <div className="mt-1 text-center">
                        <div className="text-xs text-muted-foreground">Solar 2</div>
                      </div>
                    </div>
                  )}
                  
                  {/* Indicator for more devices */}
                  {getDeviceCount('solar') > 2 && (
                    <div className="flex flex-col items-center justify-center mt-4">
                      <Badge 
                        variant="outline" 
                        className="h-8 border-dashed flex items-center gap-1"
                      >
                        +{getDeviceCount('solar') - 2} more
                        <ChevronsRight className="h-3 w-3" />
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Grid Connection */}
              <div className="flex flex-col items-end">
                <div className="flex items-center mb-2">
                  <h3 className="text-sm font-semibold">Grid Connection</h3>
                </div>
                
                <div className="flex flex-col items-center">
                  <div className={`p-4 rounded-lg border-2 ${
                    flowData.grid.power > 0.1 
                      ? 'bg-indigo-50 border-indigo-300 dark:bg-indigo-950 dark:border-indigo-700' 
                      : 'bg-muted border-muted-foreground/20'
                  } relative`}>
                    <GridIcon />
                  </div>
                  <div className="mt-1 text-center">
                    <div className="text-sm font-semibold">
                      {flowData.grid.direction === 'import' ? '-' : '+'}{formatPower(flowData.grid.power)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {flowData.grid.direction === 'import' ? 'Importing' : 'Exporting'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Middle row - Storage and Metering */}
            <div className="w-full px-8 pt-12 grid grid-cols-3">
              {/* Battery Storage Group */}
              <div className="flex flex-col">
                <div className="flex items-center mb-2">
                  <h3 className="text-sm font-semibold">Energy Storage</h3>
                  <Badge className="ml-2" variant="outline">
                    {getDeviceCount('battery')} devices
                  </Badge>
                </div>
                
                <div className="flex items-start space-x-4">
                  <div className="flex flex-col items-center">
                    <div className={`p-4 rounded-lg border-2 ${
                      flowData.battery.direction !== 'idle' 
                        ? 'bg-green-50 border-green-300 dark:bg-green-950 dark:border-green-700' 
                        : 'bg-muted border-muted-foreground/20'
                    } relative`}>
                      <BatteryStorageIcon />
                      {flowData.battery.status === 'fault' && (
                        <CircleAlert className="h-5 w-5 text-destructive absolute -top-2 -right-2" />
                      )}
                    </div>
                    <div className="mt-1 text-center">
                      <div className="text-sm font-semibold">{flowData.battery.soc}%</div>
                      <div className="text-xs text-muted-foreground">
                        {formatPower(flowData.battery.power)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {flowData.battery.direction === 'charging' 
                          ? 'Charging' 
                          : flowData.battery.direction === 'discharging' 
                            ? 'Discharging' 
                            : 'Idle'}
                      </div>
                    </div>
                  </div>
                  
                  {/* Additional battery devices if there are more than one */}
                  {getDeviceCount('battery') > 1 && (
                    <div className="flex flex-col items-center mt-2">
                      <div className={`p-3 rounded-lg border ${
                        flowData.battery.direction !== 'idle' 
                          ? 'bg-green-50 border-green-300 dark:bg-green-950 dark:border-green-700' 
                          : 'bg-muted border-muted-foreground/20'
                      } relative`}>
                        <BatteryStorageIcon />
                      </div>
                      <div className="mt-1 text-center">
                        <div className="text-xs text-muted-foreground">Battery 2</div>
                      </div>
                    </div>
                  )}
                  
                  {/* Indicator for more devices */}
                  {getDeviceCount('battery') > 2 && (
                    <div className="flex flex-col items-center justify-center mt-4">
                      <Badge 
                        variant="outline" 
                        className="h-8 border-dashed flex items-center gap-1"
                      >
                        +{getDeviceCount('battery') - 2} more
                        <ChevronsRight className="h-3 w-3" />
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Smart Meter */}
              <div className="flex flex-col items-center">
                <div className="flex items-center mb-2">
                  <h3 className="text-sm font-semibold">Smart Meters</h3>
                  <Badge className="ml-2" variant="outline">
                    {getDeviceCount('smartmeter')} devices
                  </Badge>
                </div>
                
                <div className="flex flex-col items-center">
                  <div className={`p-4 rounded-lg border-2 ${
                    flowData.smartmeter.status === 'online' 
                      ? 'bg-teal-50 border-teal-300 dark:bg-teal-950 dark:border-teal-700' 
                      : 'bg-muted border-muted-foreground/20'
                  } relative`}>
                    <SmartMeterIcon />
                  </div>
                  <div className="mt-1 text-center">
                    <div className="text-sm font-semibold">
                      {formatPower(flowData.home.power)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Home Consumption
                    </div>
                  </div>
                </div>
                
                {/* Additional meters if there are more than one */}
                {getDeviceCount('smartmeter') > 1 && (
                  <div className="flex items-center mt-2 space-x-3">
                    <Badge 
                      variant="outline" 
                      className="h-8 border-dashed flex items-center gap-1"
                    >
                      +{getDeviceCount('smartmeter') - 1} more
                      <ChevronsRight className="h-3 w-3" />
                    </Badge>
                  </div>
                )}
              </div>
              
              {/* Home Group */}
              <div className="flex flex-col items-end">
                <div className="flex items-center mb-2">
                  <h3 className="text-sm font-semibold">Home Consumption</h3>
                </div>
                
                <div className="flex flex-col items-center">
                  <div className={`p-4 rounded-lg border-2 ${
                    flowData.home.power > 0.1 
                      ? 'bg-purple-50 border-purple-300 dark:bg-purple-950 dark:border-purple-700' 
                      : 'bg-muted border-muted-foreground/20'
                  } relative`}>
                    <Home className="h-8 w-8 text-purple-500" />
                  </div>
                  <div className="mt-1 text-center">
                    <div className="text-sm font-semibold">{formatPower(flowData.home.power)}</div>
                    <div className="text-xs text-muted-foreground">
                      Consumption
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Bottom row - Consumption devices */}
            <div className="w-full px-8 pt-10 pb-4 grid grid-cols-2">
              {/* EV Charger Group */}
              <div className="flex flex-col">
                <div className="flex items-center mb-2">
                  <h3 className="text-sm font-semibold">EV Charging</h3>
                  <Badge className="ml-2" variant="outline">
                    {getDeviceCount('ev')} devices
                  </Badge>
                </div>
                
                <div className="flex items-start space-x-4">
                  <div className="flex flex-col items-center">
                    <div className={`p-4 rounded-lg border-2 ${
                      flowData.ev.power > 0.1 
                        ? 'bg-blue-50 border-blue-300 dark:bg-blue-950 dark:border-blue-700' 
                        : 'bg-muted border-muted-foreground/20'
                    } relative`}>
                      <EVChargerIcon />
                      {flowData.ev.status === 'fault' && (
                        <CircleAlert className="h-5 w-5 text-destructive absolute -top-2 -right-2" />
                      )}
                    </div>
                    <div className="mt-1 text-center">
                      <div className="text-sm font-semibold">{formatPower(flowData.ev.power)}</div>
                      <div className="text-xs text-muted-foreground">
                        {flowData.ev.status === 'charging' ? 'Charging' : 'Standby'}
                      </div>
                    </div>
                  </div>
                  
                  {/* Additional EV devices if there are more than one */}
                  {getDeviceCount('ev') > 1 && (
                    <div className="flex flex-col items-center mt-2">
                      <div className={`p-3 rounded-lg border ${
                        flowData.ev.power > 0.1 
                          ? 'bg-blue-50 border-blue-300 dark:bg-blue-950 dark:border-blue-700' 
                          : 'bg-muted border-muted-foreground/20'
                      } relative`}>
                        <EVChargerIcon />
                      </div>
                      <div className="mt-1 text-center">
                        <div className="text-xs text-muted-foreground">EV Charger 2</div>
                      </div>
                    </div>
                  )}
                  
                  {/* Indicator for more devices */}
                  {getDeviceCount('ev') > 2 && (
                    <div className="flex flex-col items-center justify-center mt-4">
                      <Badge 
                        variant="outline" 
                        className="h-8 border-dashed flex items-center gap-1"
                      >
                        +{getDeviceCount('ev') - 2} more
                        <ChevronsRight className="h-3 w-3" />
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Heat Pump Group */}
              <div className="flex flex-col items-end">
                <div className="flex items-center mb-2">
                  <h3 className="text-sm font-semibold">Heat Pumps</h3>
                  <Badge className="ml-2" variant="outline">
                    {getDeviceCount('heatpump')} devices
                  </Badge>
                </div>
                
                <div className="flex items-start space-x-4 justify-end">
                  {/* Indicator for more devices */}
                  {getDeviceCount('heatpump') > 2 && (
                    <div className="flex flex-col items-center justify-center mt-4">
                      <Badge 
                        variant="outline" 
                        className="h-8 border-dashed flex items-center gap-1"
                      >
                        +{getDeviceCount('heatpump') - 2} more
                        <ChevronsRight className="h-3 w-3" />
                      </Badge>
                    </div>
                  )}
                  
                  {/* Additional heat pump devices if there are more than one */}
                  {getDeviceCount('heatpump') > 1 && (
                    <div className="flex flex-col items-center mt-2">
                      <div className={`p-3 rounded-lg border ${
                        flowData.heatpump.power > 0.1 
                          ? 'bg-orange-50 border-orange-300 dark:bg-orange-950 dark:border-orange-700' 
                          : 'bg-muted border-muted-foreground/20'
                      } relative`}>
                        <HeatPumpIcon />
                      </div>
                      <div className="mt-1 text-center">
                        <div className="text-xs text-muted-foreground">Heat Pump 2</div>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex flex-col items-center">
                    <div className={`p-4 rounded-lg border-2 ${
                      flowData.heatpump.power > 0.1 
                        ? 'bg-orange-50 border-orange-300 dark:bg-orange-950 dark:border-orange-700' 
                        : 'bg-muted border-muted-foreground/20'
                    } relative`}>
                      <HeatPumpIcon />
                      {flowData.heatpump.status === 'fault' && (
                        <CircleAlert className="h-5 w-5 text-destructive absolute -top-2 -right-2" />
                      )}
                    </div>
                    <div className="mt-1 text-center">
                      <div className="text-sm font-semibold">{formatPower(flowData.heatpump.power)}</div>
                      <div className="text-xs text-muted-foreground">
                        {flowData.heatpump.status === 'heating' ? 'Heating' : 'Standby'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Flow lines */}
            <svg className="absolute inset-0 pointer-events-none" width="100%" height="100%">
              <defs>
                <marker id="arrowhead-green" markerWidth="10" markerHeight="7" refX="7" refY="3.5" orient="auto">
                  <polygon points="0 0, 10 3.5, 0 7" fill="#22c55e" />
                </marker>
                <marker id="arrowhead-orange" markerWidth="10" markerHeight="7" refX="7" refY="3.5" orient="auto">
                  <polygon points="0 0, 10 3.5, 0 7" fill="#f97316" />
                </marker>
                <marker id="arrowhead-blue" markerWidth="10" markerHeight="7" refX="7" refY="3.5" orient="auto">
                  <polygon points="0 0, 10 3.5, 0 7" fill="#3b82f6" />
                </marker>
                <marker id="arrowhead-indigo" markerWidth="10" markerHeight="7" refX="7" refY="3.5" orient="auto">
                  <polygon points="0 0, 10 3.5, 0 7" fill="#6366f1" />
                </marker>
              </defs>
              
              {/* Solar to Battery */}
              {arrows.solarToBattery.active && (
                <path 
                  d="M120,100 L120,180" 
                  stroke="#22c55e" 
                  strokeWidth="2.5" 
                  fill="none"
                  markerEnd="url(#arrowhead-green)"
                  className={`animate-pulse-${getFlowIntensity(flowData.solar.power)}`}
                  strokeDasharray="5,3"
                />
              )}
              
              {/* Solar to Home via Smart Meter */}
              {arrows.solarToHome.active && (
                <path 
                  d="M180,100 C240,140 240,140 300,180" 
                  stroke="#22c55e" 
                  strokeWidth="2.5" 
                  fill="none"
                  markerEnd="url(#arrowhead-green)"
                  className={`animate-pulse-${getFlowIntensity(flowData.solar.power)}`}
                  strokeDasharray="5,3"
                />
              )}
              
              {/* Battery to Home */}
              {arrows.batteryToHome.active && (
                <path 
                  d="M160,180 C220,180 220,180 280,180" 
                  stroke="#f97316" 
                  strokeWidth="2.5" 
                  fill="none"
                  markerEnd="url(#arrowhead-orange)"
                  className={`animate-pulse-${getFlowIntensity(flowData.battery.power)}`}
                  strokeDasharray="5,3"
                />
              )}
              
              {/* Grid to Home */}
              {arrows.gridToHome.active && (
                <path 
                  d="M420,100 C360,140 360,140 320,180" 
                  stroke="#6366f1" 
                  strokeWidth="2.5" 
                  fill="none"
                  markerEnd="url(#arrowhead-indigo)"
                  className={`animate-pulse-${getFlowIntensity(flowData.grid.power)}`}
                  strokeDasharray="5,3"
                />
              )}
              
              {/* Home to Grid (export) */}
              {arrows.homeToGrid.active && (
                <path 
                  d="M320,160 C360,120 360,120 420,80" 
                  stroke="#22c55e" 
                  strokeWidth="2.5" 
                  fill="none"
                  markerEnd="url(#arrowhead-green)"
                  className={`animate-pulse-${getFlowIntensity(flowData.grid.power)}`}
                  strokeDasharray="5,3"
                />
              )}
              
              {/* Home to EV Charger */}
              {arrows.homeToEv.active && (
                <path 
                  d="M280,200 C220,260 220,260 160,320" 
                  stroke="#3b82f6" 
                  strokeWidth="2.5" 
                  fill="none"
                  markerEnd="url(#arrowhead-blue)"
                  className={`animate-pulse-${getFlowIntensity(flowData.ev.power)}`}
                  strokeDasharray="5,3"
                />
              )}
              
              {/* Home to Heat Pump */}
              {arrows.homeToPump.active && (
                <path 
                  d="M320,200 C380,260 380,260 440,320" 
                  stroke="#f97316" 
                  strokeWidth="2.5" 
                  fill="none"
                  markerEnd="url(#arrowhead-orange)"
                  className={`animate-pulse-${getFlowIntensity(flowData.heatpump.power)}`}
                  strokeDasharray="5,3"
                />
              )}
            </svg>
          </div>
        </div>
        
        {/* Energy summary section */}
        <div className="grid grid-cols-4 gap-4 mt-4">
          <div className="bg-gradient-to-br from-muted/40 to-muted/20 p-3 rounded-lg border border-border">
            <div className="text-xs text-muted-foreground mb-1">Total Generation</div>
            <div className="text-xl font-semibold text-green-600 dark:text-green-500">{formatPower(flowData.solar.power)}</div>
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              <SunIcon className="h-3 w-3 mr-1 text-yellow-500" />
              Solar Production
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-muted/40 to-muted/20 p-3 rounded-lg border border-border">
            <div className="text-xs text-muted-foreground mb-1">Total Consumption</div>
            <div className="text-xl font-semibold text-purple-600 dark:text-purple-500">{formatPower(flowData.home.power + flowData.ev.power + flowData.heatpump.power)}</div>
            <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
              <div className="flex items-center">
                <Home className="h-3 w-3 mr-1 text-purple-500" />
                Home
              </div>
              <div>{formatPower(flowData.home.power)}</div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-muted/40 to-muted/20 p-3 rounded-lg border border-border">
            <div className="text-xs text-muted-foreground mb-1">Battery Status</div>
            <div className="text-xl font-semibold text-green-600 dark:text-green-500">{flowData.battery.soc}%</div>
            <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
              <div className="flex items-center">
                <Battery className="h-3 w-3 mr-1 text-green-500" />
                {flowData.battery.direction === 'charging' 
                  ? 'Charging' 
                  : flowData.battery.direction === 'discharging' 
                    ? 'Discharging' 
                    : 'Idle'}
              </div>
              <div>{formatPower(flowData.battery.power)}</div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-muted/40 to-muted/20 p-3 rounded-lg border border-border">
            <div className="text-xs text-muted-foreground mb-1">Grid Exchange</div>
            <div className={`text-xl font-semibold ${
              flowData.grid.direction === 'import' 
                ? 'text-orange-600 dark:text-orange-500' 
                : 'text-green-600 dark:text-green-500'
            }`}>
              {flowData.grid.direction === 'import' ? '-' : '+'}{formatPower(flowData.grid.power)}
            </div>
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              <Zap className="h-3 w-3 mr-1 text-indigo-500" />
              {flowData.grid.direction === 'import' ? 'Importing' : 'Exporting'}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}