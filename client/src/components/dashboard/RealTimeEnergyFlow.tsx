import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Battery, 
  Zap, 
  SunIcon, 
  Home, 
  PlugZap, 
  ArrowRight, 
  RefreshCw,
  Activity,
  CircleAlert,
  Wifi
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useSiteContext } from '@/hooks/use-site-context';
import { useWebSocket } from '@/hooks/WebSocketProvider';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// Using a custom hook to get real-time energy data
const useEnergyData = (siteId?: number | null) => {
  const [flowData, setFlowData] = useState({
    solar: { power: 0, status: 'offline' },
    battery: { power: 0, soc: 60, status: 'standby', direction: 'idle' },
    grid: { power: 0, direction: 'import' },
    home: { power: 0 },
    ev: { power: 0, status: 'disconnected' },
    timestamp: new Date().toISOString()
  });
  
  const { connected: isConnected, lastMessage } = useWebSocket();
  
  // Fetch initial data
  const { data: initialData } = useQuery({
    queryKey: [`/api/sites/${siteId}/energy/latest`],
    enabled: !!siteId,
    refetchInterval: 10000, // Fallback to polling if WebSocket fails
  });
  
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
  
  // Calculate arrow positions - this is simplified, in a real app would be more sophisticated
  const getArrowPositions = () => {
    const positions = {
      solarToHome: { active: flowData.solar.power > 0.1, direction: 'down' },
      solarToBattery: { active: flowData.battery.direction === 'charging' && flowData.solar.power > 0.1, direction: 'down' },
      batteryToHome: { active: flowData.battery.direction === 'discharging', direction: 'right' },
      gridToHome: { active: flowData.grid.direction === 'import' && flowData.grid.power > 0.1, direction: 'right' },
      homeToGrid: { active: flowData.grid.direction === 'export' && flowData.grid.power > 0.1, direction: 'left' },
      homeToBattery: { active: false, direction: 'left' }, // Not common, but could happen in some systems
      homeToEv: { active: flowData.ev.power > 0.1, direction: 'down' },
      batteryToEv: { active: flowData.battery.direction === 'discharging' && flowData.ev.power > 0.1, direction: 'down' },
      gridToEv: { active: flowData.grid.direction === 'import' && flowData.ev.power > 0.1, direction: 'right' },
    };
    
    return positions;
  };
  
  const arrows = getArrowPositions();
  
  // Generate the SVG path for an arrow
  const getArrowPath = (from: { x: number, y: number }, to: { x: number, y: number }, direction: string) => {
    // Simple straight line
    return `M${from.x},${from.y} L${to.x},${to.y}`;
  };
  
  return (
    <Card>
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
          <div className="flex items-center">
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
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="p-4 relative h-96 bg-muted/30 rounded-lg">
          {/* Energy diagram */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="w-full max-w-2xl h-full flex flex-col items-center justify-between py-6">
              {/* Top row: Solar and Grid */}
              <div className="w-full flex justify-between">
                {/* Solar Panel */}
                <div className="flex flex-col items-center">
                  <div className={`p-4 rounded-full ${flowData.solar.power > 0.1 ? 'bg-yellow-100 dark:bg-yellow-900/30' : 'bg-muted'} relative`}>
                    <SunIcon className={`h-12 w-12 ${flowData.solar.power > 0.1 ? 'text-yellow-500 animate-pulse' : 'text-muted-foreground'}`} />
                    {flowData.solar.status === 'fault' && (
                      <CircleAlert className="h-5 w-5 text-destructive absolute -top-1 -right-1" />
                    )}
                  </div>
                  <div className="mt-2 text-center">
                    <div className="font-medium">Solar</div>
                    <div className="text-sm font-bold">{formatPower(flowData.solar.power)}</div>
                  </div>
                </div>
                
                {/* Grid Connection */}
                <div className="flex flex-col items-center">
                  <div className={`p-4 rounded-full ${flowData.grid.power > 0.1 ? 'bg-orange-100 dark:bg-orange-900/30' : 'bg-muted'} relative`}>
                    <Zap className={`h-12 w-12 ${flowData.grid.power > 0.1 ? 'text-orange-500' : 'text-muted-foreground'}`} />
                  </div>
                  <div className="mt-2 text-center">
                    <div className="font-medium">Grid</div>
                    <div className="text-sm font-bold">
                      {flowData.grid.direction === 'import' ? '-' : '+'}{formatPower(flowData.grid.power)}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Middle row: Battery and House */}
              <div className="w-full flex justify-between">
                {/* Battery */}
                <div className="flex flex-col items-center">
                  <div className={`p-4 rounded-full ${flowData.battery.direction !== 'idle' ? 'bg-green-100 dark:bg-green-900/30' : 'bg-muted'} relative`}>
                    <Battery className={`h-12 w-12 ${
                      flowData.battery.direction === 'charging' 
                        ? 'text-green-500 animate-pulse' 
                        : flowData.battery.direction === 'discharging'
                          ? 'text-orange-500'
                          : 'text-muted-foreground'
                    }`} />
                    {flowData.battery.status === 'fault' && (
                      <CircleAlert className="h-5 w-5 text-destructive absolute -top-1 -right-1" />
                    )}
                  </div>
                  <div className="mt-2 text-center">
                    <div className="font-medium">Battery</div>
                    <div className="text-sm font-bold">{flowData.battery.soc}%</div>
                    <div className="text-xs text-muted-foreground">
                      {formatPower(flowData.battery.power)}
                    </div>
                  </div>
                </div>
                
                {/* Home */}
                <div className="flex flex-col items-center">
                  <div className={`p-4 rounded-full ${flowData.home.power > 0.1 ? 'bg-purple-100 dark:bg-purple-900/30' : 'bg-muted'}`}>
                    <Home className={`h-12 w-12 ${flowData.home.power > 0.1 ? 'text-purple-500' : 'text-muted-foreground'}`} />
                  </div>
                  <div className="mt-2 text-center">
                    <div className="font-medium">Home</div>
                    <div className="text-sm font-bold">{formatPower(flowData.home.power)}</div>
                  </div>
                </div>
              </div>
              
              {/* Bottom row: EV Charger */}
              <div className="flex flex-col items-center">
                <div className={`p-4 rounded-full ${flowData.ev.power > 0.1 ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-muted'} relative`}>
                  <PlugZap className={`h-12 w-12 ${flowData.ev.power > 0.1 ? 'text-blue-500 animate-pulse' : 'text-muted-foreground'}`} />
                  {flowData.ev.status === 'fault' && (
                    <CircleAlert className="h-5 w-5 text-destructive absolute -top-1 -right-1" />
                  )}
                </div>
                <div className="mt-2 text-center">
                  <div className="font-medium">EV Charger</div>
                  <div className="text-sm font-bold">{formatPower(flowData.ev.power)}</div>
                </div>
              </div>
              
              {/* Flow lines - in a real app would use something like react-flow or a custom SVG for better visualization */}
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
                </defs>
                
                {/* Simplified flow lines for the demo */}
                {/* In a real app these would be calculated dynamically based on component positions */}
                
                {/* Solar to Home */}
                {arrows.solarToHome.active && (
                  <path 
                    d="M120,100 L320,180" 
                    stroke="#22c55e" 
                    strokeWidth="3" 
                    fill="none"
                    markerEnd="url(#arrowhead-green)"
                    className={`animate-pulse-${getFlowIntensity(flowData.solar.power)}`}
                    strokeDasharray={getFlowIntensity(flowData.solar.power) === 'none' ? '' : '5,5'}
                  />
                )}
                
                {/* Solar to Battery */}
                {arrows.solarToBattery.active && (
                  <path 
                    d="M120,100 L120,180" 
                    stroke="#22c55e" 
                    strokeWidth="3" 
                    fill="none"
                    markerEnd="url(#arrowhead-green)"
                    className={`animate-pulse-${getFlowIntensity(flowData.solar.power)}`}
                    strokeDasharray={getFlowIntensity(flowData.solar.power) === 'none' ? '' : '5,5'}
                  />
                )}
                
                {/* Battery to Home (discharging) */}
                {arrows.batteryToHome.active && (
                  <path 
                    d="M140,180 L300,180" 
                    stroke="#f97316" 
                    strokeWidth="3" 
                    fill="none"
                    markerEnd="url(#arrowhead-orange)"
                    className={`animate-pulse-${getFlowIntensity(flowData.battery.power)}`}
                    strokeDasharray={getFlowIntensity(flowData.battery.power) === 'none' ? '' : '5,5'}
                  />
                )}
                
                {/* Grid imports */}
                {arrows.gridToHome.active && (
                  <path 
                    d="M480,100 L320,180" 
                    stroke="#f97316" 
                    strokeWidth="3" 
                    fill="none"
                    markerEnd="url(#arrowhead-orange)"
                    className={`animate-pulse-${getFlowIntensity(flowData.grid.power)}`}
                    strokeDasharray={getFlowIntensity(flowData.grid.power) === 'none' ? '' : '5,5'}
                  />
                )}
                
                {/* Grid exports */}
                {arrows.homeToGrid.active && (
                  <path 
                    d="M340,170 L470,90" 
                    stroke="#22c55e" 
                    strokeWidth="3" 
                    fill="none"
                    markerEnd="url(#arrowhead-green)"
                    className={`animate-pulse-${getFlowIntensity(flowData.grid.power)}`}
                    strokeDasharray={getFlowIntensity(flowData.grid.power) === 'none' ? '' : '5,5'}
                  />
                )}
                
                {/* Home to EV */}
                {arrows.homeToEv.active && (
                  <path 
                    d="M320,200 L320,280" 
                    stroke="#3b82f6" 
                    strokeWidth="3" 
                    fill="none"
                    markerEnd="url(#arrowhead-blue)"
                    className={`animate-pulse-${getFlowIntensity(flowData.ev.power)}`}
                    strokeDasharray={getFlowIntensity(flowData.ev.power) === 'none' ? '' : '5,5'}
                  />
                )}
              </svg>
            </div>
          </div>
        </div>
        
        {/* Energy summary section */}
        <div className="grid grid-cols-3 gap-4 mt-4">
          <div className="bg-muted/50 p-3 rounded-lg">
            <div className="text-xs text-muted-foreground">Total Consumption</div>
            <div className="text-xl font-semibold">{formatPower(flowData.home.power + flowData.ev.power)}</div>
          </div>
          
          <div className="bg-muted/50 p-3 rounded-lg">
            <div className="text-xs text-muted-foreground">Solar Generation</div>
            <div className="text-xl font-semibold">{formatPower(flowData.solar.power)}</div>
          </div>
          
          <div className="bg-muted/50 p-3 rounded-lg">
            <div className="text-xs text-muted-foreground">Grid Exchange</div>
            <div className="text-xl font-semibold">
              {flowData.grid.direction === 'import' ? '-' : '+'}{formatPower(flowData.grid.power)}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}