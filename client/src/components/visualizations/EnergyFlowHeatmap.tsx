import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Activity, 
  Sun, 
  Battery, 
  BatteryCharging, 
  Zap, 
  Home, 
  Thermometer, 
  Plug, 
  Wifi,
  PanelLeft,
  Maximize2,
  RefreshCw,
  PlusCircle,
  MinusCircle,
  ArrowUpRight,
  ArrowDownRight,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useSiteContext } from '@/hooks/use-site-context';
import { useLocation } from 'wouter';

// Types for the component
interface EnergyFlowData {
  solar: { power: number; status: string; devices: any[] };
  battery: { power: number; soc: number; status: string; direction: string; devices: any[] };
  grid: { power: number; direction: string };
  home: { power: number };
  ev: { power: number; status: string; devices: any[] };
  heatpump: { power: number; status: string; devices: any[] };
  smartmeter: { power: number; status: string; devices: any[] };
  timestamp: string;
}

interface EnergyFlowHeatmapProps {
  siteId?: number | null;
  className?: string;
  fullscreen?: boolean;
}

// Cell type to define a grid cell in the heatmap
interface HeatmapCell {
  id: string;
  x: number;
  y: number;
  value: number;
  color: string;
  label: string;
  icon?: React.FC<React.SVGProps<SVGSVGElement>>;
  device?: string;
}

// Default energy flow data
const defaultEnergyFlow: EnergyFlowData = {
  solar: { power: 0, status: 'offline', devices: [] },
  battery: { power: 0, soc: 60, status: 'standby', direction: 'idle', devices: [] },
  grid: { power: 0, direction: 'import' },
  home: { power: 0 },
  ev: { power: 0, status: 'disconnected', devices: [] },
  heatpump: { power: 0, status: 'idle', devices: [] },
  smartmeter: { power: 0, status: 'online', devices: [] },
  timestamp: new Date().toISOString()
};

// Hook for energy data
const useEnergyData = (siteId?: number | null) => {
  const [flowData, setFlowData] = useState<EnergyFlowData>(defaultEnergyFlow);
  const [isRealTime, setIsRealTime] = useState(true);
  
  // Fetch data
  useEffect(() => {
    if (!siteId) return;
    
    // Initial fetch
    fetch(`/api/sites/${siteId}/energy/latest`)
      .then(res => res.json())
      .then(data => {
        setFlowData(prev => ({
          ...prev,
          ...data
        }));
      })
      .catch(err => {
        console.error("Error fetching energy data:", err);
        setIsRealTime(false);
      });
    
    // Setup WebSocket connection
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      setIsRealTime(true);
      ws.send(JSON.stringify({ type: 'subscribe', topic: `sites/${siteId}/energy` }));
    };
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'energy_update' && data.siteId === siteId) {
          setFlowData(prev => ({ ...prev, ...data.payload, timestamp: new Date().toISOString() }));
        }
      } catch (err) {
        console.error("Error parsing WebSocket data:", err);
      }
    };
    
    ws.onerror = () => {
      setIsRealTime(false);
    };
    
    ws.onclose = () => {
      setIsRealTime(false);
    };
    
    return () => {
      ws.close();
    };
  }, [siteId]);
  
  return { flowData, isRealTime };
};

const EnergyFlowHeatmap: React.FC<EnergyFlowHeatmapProps> = ({ 
  siteId, 
  className, 
  fullscreen = false 
}) => {
  const { currentSiteId } = useSiteContext();
  const activeSiteId = siteId || currentSiteId;
  const { flowData, isRealTime } = useEnergyData(activeSiteId);
  const [, navigate] = useLocation();
  const [view, setView] = useState<'heatmap' | 'flows'>('heatmap');
  const [zoom, setZoom] = useState(1);
  const [hoveredCell, setHoveredCell] = useState<HeatmapCell | null>(null);
  const { toast } = useToast();
  const heatmapRef = useRef<HTMLDivElement>(null);
  
  // Helper for formatting power values
  const formatPower = (power: number) => {
    if (Math.abs(power) < 1) {
      return `${(power * 1000).toFixed(0)} W`;
    }
    return `${power.toFixed(1)} kW`;
  };
  
  // Determine energy flow intensity for styling
  const getFlowIntensity = (power: number): 'none' | 'low' | 'medium' | 'high' => {
    const absValue = Math.abs(power);
    if (absValue < 0.1) return 'none';
    if (absValue < 1) return 'low';
    if (absValue < 3) return 'medium';
    return 'high';
  };

  // Get animation speed based on power value
  const getAnimationSpeed = (power: number): string => {
    const intensity = getFlowIntensity(power);
    switch (intensity) {
      case 'low': return 'animate-flow-low';
      case 'medium': return 'animate-flow-medium';
      case 'high': return 'animate-flow-high';
      case 'none':
      default: return '';
    }
  };
  
  // Get color based on temperature (blue-to-red scale)
  const getTemperatureColor = (value: number, max: number): string => {
    // Normalize the value (0 to 1)
    const normalizedValue = Math.min(Math.max(value / max, 0), 1);
    
    // Create a color gradient from blue to red
    if (normalizedValue < 0.2) return 'bg-blue-500';
    if (normalizedValue < 0.4) return 'bg-cyan-500';
    if (normalizedValue < 0.6) return 'bg-green-500';
    if (normalizedValue < 0.8) return 'bg-yellow-500';
    return 'bg-red-500';
  };
  
  // Get color for flow lines based on type
  const getFlowLineColor = (type: string): string => {
    switch (type) {
      case 'solar': return 'stroke-yellow-500';
      case 'battery': return 'stroke-orange-500';
      case 'grid': return flowData.grid.direction === 'import' ? 'stroke-blue-500' : 'stroke-green-500';
      case 'home': return 'stroke-purple-500';
      case 'ev': return 'stroke-blue-500';
      case 'heatpump': return 'stroke-red-500';
      default: return 'stroke-gray-500';
    }
  };
  
  // Calculate the maximum power for scaling
  const maxPower = useMemo(() => {
    const powers = [
      Math.abs(flowData.solar.power),
      Math.abs(flowData.battery.power),
      Math.abs(flowData.grid.power),
      Math.abs(flowData.home.power),
      Math.abs(flowData.ev.power),
      Math.abs(flowData.heatpump.power)
    ];
    return Math.max(...powers, 0.1); // Ensure non-zero value for division
  }, [flowData]);
  
  // Generate heatmap grid cells
  const generateHeatmapCells = useMemo(() => {
    const gridSize = 8; // 8x8 grid
    const cells: HeatmapCell[] = [];
    
    // Create special cells for devices
    const deviceCells: HeatmapCell[] = [
      {
        id: 'solar',
        x: 3,
        y: 0,
        value: flowData.solar.power,
        color: getTemperatureColor(flowData.solar.power, maxPower),
        label: 'Solar',
        icon: Sun,
        device: 'solar'
      },
      {
        id: 'grid',
        x: 7,
        y: 3,
        value: flowData.grid.power,
        color: flowData.grid.direction === 'import' ? 'bg-blue-500' : 'bg-green-500',
        label: 'Grid',
        icon: Zap,
        device: 'grid'
      },
      {
        id: 'battery',
        x: 0,
        y: 3,
        value: flowData.battery.power,
        color: flowData.battery.direction === 'charging' ? 'bg-blue-500' : 'bg-orange-500',
        label: 'Battery',
        icon: Battery,
        device: 'battery'
      },
      {
        id: 'home',
        x: 4,
        y: 4,
        value: flowData.home.power,
        color: getTemperatureColor(flowData.home.power, maxPower),
        label: 'Home',
        icon: Home,
        device: 'home'
      },
      {
        id: 'ev',
        x: 2,
        y: 7,
        value: flowData.ev.power,
        color: getTemperatureColor(flowData.ev.power, maxPower),
        label: 'EV',
        icon: BatteryCharging,
        device: 'ev'
      },
      {
        id: 'heatpump',
        x: 6,
        y: 7,
        value: flowData.heatpump.power,
        color: getTemperatureColor(flowData.heatpump.power, maxPower),
        label: 'Heat Pump',
        icon: Thermometer,
        device: 'heatpump'
      },
    ];
    
    // Add device cells to main cell array
    cells.push(...deviceCells);
    
    // Generate flow cells based on activity
    // First determine active flows
    const activeFlows = {
      solarToHome: flowData.solar.power > 0.1,
      solarToBattery: flowData.battery.direction === 'charging' && flowData.solar.power > 0.1,
      batteryToHome: flowData.battery.direction === 'discharging' && flowData.battery.power > 0.1,
      gridToHome: flowData.grid.direction === 'import' && flowData.grid.power > 0.1,
      homeToGrid: flowData.grid.direction === 'export' && flowData.grid.power > 0.1,
      homeToEv: flowData.ev.power > 0.1,
      homeToPump: flowData.heatpump.power > 0.1,
    };

    // Map of energy flow paths with coordinates
    const flowPaths = [
      // Solar to Home vertical flow
      ...(activeFlows.solarToHome 
        ? [1, 2, 3].map(y => ({ x: 3, y, value: flowData.solar.power, from: 'solar', to: 'home' }))
        : []),
      
      // Solar to Battery diagonal flow
      ...(activeFlows.solarToBattery 
        ? [
            { x: 2, y: 1, value: flowData.solar.power, from: 'solar', to: 'battery' },
            { x: 1, y: 2, value: flowData.solar.power, from: 'solar', to: 'battery' }
          ]
        : []),
      
      // Battery to Home horizontal flow
      ...(activeFlows.batteryToHome 
        ? [1, 2, 3].map(x => ({ x, y: 3, value: flowData.battery.power, from: 'battery', to: 'home' }))
        : []),
      
      // Grid to Home horizontal flow
      ...(activeFlows.gridToHome 
        ? [5, 6].map(x => ({ x, y: 3, value: flowData.grid.power, from: 'grid', to: 'home' }))
        : []),
      
      // Home to Grid horizontal flow
      ...(activeFlows.homeToGrid 
        ? [5, 6].map(x => ({ x, y: 3, value: flowData.grid.power, from: 'home', to: 'grid' }))
        : []),
      
      // Home to EV diagonal flow
      ...(activeFlows.homeToEv 
        ? [
            { x: 3, y: 5, value: flowData.ev.power, from: 'home', to: 'ev' },
            { x: 2, y: 6, value: flowData.ev.power, from: 'home', to: 'ev' }
          ]
        : []),
      
      // Home to Heat Pump diagonal flow
      ...(activeFlows.homeToPump 
        ? [
            { x: 5, y: 5, value: flowData.heatpump.power, from: 'home', to: 'heatpump' },
            { x: 6, y: 6, value: flowData.heatpump.power, from: 'home', to: 'heatpump' }
          ]
        : []),
    ];
    
    // Add flow cells
    flowPaths.forEach((flow, index) => {
      const fromDevice = flow.from;
      const toDevice = flow.to;
      
      // Determine color based on source and destination
      let flowColor: string;
      if (fromDevice === 'solar') flowColor = 'bg-yellow-500';
      else if (fromDevice === 'battery') flowColor = 'bg-orange-500';
      else if (fromDevice === 'grid') flowColor = 'bg-blue-500';
      else if (toDevice === 'grid') flowColor = 'bg-green-500';
      else if (toDevice === 'ev') flowColor = 'bg-blue-500';
      else if (toDevice === 'heatpump') flowColor = 'bg-red-500';
      else flowColor = 'bg-purple-500';
      
      cells.push({
        id: `flow-${fromDevice}-${toDevice}-${index}`,
        x: flow.x,
        y: flow.y,
        value: flow.value,
        color: flowColor,
        label: `${formatPower(flow.value)}`,
      });
    });
    
    return cells;
  }, [flowData, maxPower]);

  // Generate connections between energy sources
  const generateConnections = useMemo(() => {
    // Define all possible flow paths
    const paths = [
      // Solar to Home
      {
        id: 'solar-home',
        active: flowData.solar.power > 0.1,
        from: 'solar',
        to: 'home',
        power: flowData.solar.power,
        path: 'M3,1 L3,4', // Vertical down
        color: 'yellow',
        animation: getAnimationSpeed(flowData.solar.power),
      },
      
      // Solar to Battery
      {
        id: 'solar-battery',
        active: flowData.battery.direction === 'charging' && flowData.solar.power > 0.1,
        from: 'solar',
        to: 'battery',
        power: flowData.solar.power,
        path: 'M3,1 C2,2 1,2 1,3', // Curved diagonal
        color: 'yellow',
        animation: getAnimationSpeed(flowData.solar.power),
      },
      
      // Battery to Home
      {
        id: 'battery-home',
        active: flowData.battery.direction === 'discharging' && flowData.battery.power > 0.1,
        from: 'battery',
        to: 'home',
        power: flowData.battery.power,
        path: 'M1,3 L4,3', // Horizontal right
        color: 'orange',
        animation: getAnimationSpeed(flowData.battery.power),
      },
      
      // Grid to Home
      {
        id: 'grid-home',
        active: flowData.grid.direction === 'import' && flowData.grid.power > 0.1,
        from: 'grid',
        to: 'home',
        power: flowData.grid.power,
        path: 'M7,3 L4,3', // Horizontal left
        color: 'blue',
        animation: getAnimationSpeed(flowData.grid.power),
      },
      
      // Home to Grid
      {
        id: 'home-grid',
        active: flowData.grid.direction === 'export' && flowData.grid.power > 0.1,
        from: 'home',
        to: 'grid',
        power: flowData.grid.power,
        path: 'M4,3 L7,3', // Horizontal right
        color: 'green',
        animation: getAnimationSpeed(flowData.grid.power),
      },
      
      // Home to EV
      {
        id: 'home-ev',
        active: flowData.ev.power > 0.1,
        from: 'home',
        to: 'ev',
        power: flowData.ev.power,
        path: 'M4,4 C3,5 3,6 2,7', // Curved diagonal down-left
        color: 'blue',
        animation: getAnimationSpeed(flowData.ev.power),
      },
      
      // Home to Heat Pump
      {
        id: 'home-heatpump',
        active: flowData.heatpump.power > 0.1,
        from: 'home',
        to: 'heatpump',
        power: flowData.heatpump.power,
        path: 'M4,4 C5,5 5,6 6,7', // Curved diagonal down-right
        color: 'red',
        animation: getAnimationSpeed(flowData.heatpump.power),
      },
    ];
    
    return paths.filter(path => path.active);
  }, [flowData]);
  
  // Determine arrow markers based on flow direction
  const getFlowArrow = (from: string, to: string) => {
    // Determine direction
    if (from === 'solar' && to === 'home') return <ArrowDownRight className="h-4 w-4 text-yellow-500" />;
    if (from === 'solar' && to === 'battery') return <ArrowDownRight className="h-4 w-4 text-yellow-500" />;
    if (from === 'battery' && to === 'home') return <ArrowRight className="h-4 w-4 text-orange-500" />;
    if (from === 'grid' && to === 'home') return <ArrowLeft className="h-4 w-4 text-blue-500" />;
    if (from === 'home' && to === 'grid') return <ArrowRight className="h-4 w-4 text-green-500" />;
    if (from === 'home' && to === 'ev') return <ArrowDownRight className="h-4 w-4 text-blue-500" />;
    if (from === 'home' && to === 'heatpump') return <ArrowDownRight className="h-4 w-4 text-red-500" />;
    
    return null;
  };
  
  // Navigate to detailed view
  const handleOpenElectricalDiagram = () => {
    navigate('/electrical-diagram');
  };
  
  // Reset zoom
  const handleResetZoom = () => {
    setZoom(1);
  };
  
  // Zoom in/out
  const handleZoom = (direction: 'in' | 'out') => {
    if (direction === 'in') {
      setZoom(prev => Math.min(prev + 0.25, 2));
    } else {
      setZoom(prev => Math.max(prev - 0.25, 0.5));
    }
  };
  
  // Handle cell hover
  const handleCellHover = (cell: HeatmapCell | null) => {
    setHoveredCell(cell);
  };
  
  // Handle device click
  const handleDeviceClick = (deviceType: string) => {
    toast({
      title: `${deviceType} Details`,
      description: `Showing detailed information for ${deviceType}`,
    });
    
    // Navigate to device detail view
    // navigate(`/devices?type=${deviceType}`);
  };
  
  return (
    <Card className={cn(
      "overflow-hidden h-full", 
      fullscreen ? "w-full h-full" : "", 
      className
    )}>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center">
            <Activity className="h-5 w-5 mr-2 text-primary" />
            Interactive Energy Flow
          </CardTitle>
          <CardDescription>
            Real-time energy flow heatmap with animated visualization
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
                <span>Static</span>
              </>
            )}
          </Badge>
          
          <Tabs value={view} onValueChange={(value) => setView(value as 'heatmap' | 'flows')}>
            <TabsList className="grid grid-cols-2 h-8">
              <TabsTrigger value="heatmap" className="text-xs px-2">Heatmap</TabsTrigger>
              <TabsTrigger value="flows" className="text-xs px-2">Flows</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      
      <CardContent className="p-2 sm:p-6">
        <div className="relative overflow-hidden" ref={heatmapRef}>
          {/* Zoom controls */}
          <div className="absolute top-2 right-2 z-10 flex flex-col gap-1 bg-background/60 backdrop-blur-sm rounded-md p-1">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6" 
              onClick={() => handleZoom('in')}
              disabled={zoom >= 2}
            >
              <PlusCircle className="h-4 w-4" />
            </Button>
            
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6" 
              onClick={handleResetZoom}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6" 
              onClick={() => handleZoom('out')}
              disabled={zoom <= 0.5}
            >
              <MinusCircle className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Info panel for hovered cell */}
          {hoveredCell && (
            <div className="absolute bottom-4 left-4 z-10 bg-background/80 backdrop-blur-sm rounded-md p-2 shadow-md">
              <h4 className="text-sm font-semibold mb-1">{hoveredCell.label}</h4>
              {hoveredCell.device ? (
                <div className="text-xs flex flex-col gap-1">
                  <span>Power: {formatPower(hoveredCell.value)}</span>
                  {hoveredCell.device === 'battery' && (
                    <span>SoC: {flowData.battery.soc}%</span>
                  )}
                  {hoveredCell.device === 'battery' && flowData.battery.direction !== 'idle' && (
                    <span>
                      Direction: {flowData.battery.direction === 'charging' 
                        ? 'Charging' 
                        : 'Discharging'}
                    </span>
                  )}
                  {hoveredCell.device === 'grid' && (
                    <span>
                      Direction: {flowData.grid.direction === 'import' 
                        ? 'Importing' 
                        : 'Exporting'}
                    </span>
                  )}
                </div>
              ) : (
                <div className="text-xs">
                  <span>Energy Flow: {formatPower(hoveredCell.value)}</span>
                </div>
              )}
            </div>
          )}
          
          <TabsContent value="heatmap" className="m-0 outline-none">
            <div className="relative w-full aspect-square overflow-hidden" 
              style={{ 
                transform: `scale(${zoom})`, 
                transformOrigin: '50% 50%',
                transition: 'transform 0.3s ease-out'
              }}
            >
              {/* Background grid */}
              <div className="absolute inset-0 grid grid-cols-8 grid-rows-8 gap-1 p-1">
                {/* Fill with empty cells */}
                {Array.from({ length: 64 }).map((_, index) => {
                  const x = index % 8;
                  const y = Math.floor(index / 8);
                  const cellId = `cell-${x}-${y}`;
                  
                  // Check if this position is used by a special cell
                  const isSpecialCell = generateHeatmapCells.some(cell => cell.x === x && cell.y === y);
                  
                  if (isSpecialCell) return null;
                  
                  return (
                    <div 
                      key={cellId}
                      className="bg-muted/20 rounded-md"
                    />
                  );
                })}
                
                {/* Render special cells */}
                {generateHeatmapCells.map(cell => {
                  // Position in the grid
                  const style = {
                    gridColumn: `${cell.x + 1}`,
                    gridRow: `${cell.y + 1}`,
                  };
                  
                  return (
                    <div 
                      key={cell.id}
                      className={cn(
                        "absolute rounded-md flex items-center justify-center transition-colors duration-300",
                        cell.color,
                        cell.id.startsWith('flow-') 
                          ? "animate-heatmap-pulse opacity-70" 
                          : "shadow-md z-10"
                      )}
                      style={{
                        top: `calc(${cell.y} * 12.5%)`,
                        left: `calc(${cell.x} * 12.5%)`,
                        width: '12.5%',
                        height: '12.5%',
                      }}
                      onMouseEnter={() => handleCellHover(cell)}
                      onMouseLeave={() => handleCellHover(null)}
                      onClick={() => cell.device && handleDeviceClick(cell.device)}
                    >
                      {cell.icon && (
                        <cell.icon className="h-6 w-6 text-white" />
                      )}
                      {!cell.icon && cell.id.startsWith('flow-') && (
                        <span className="text-xs text-white font-medium">{formatPower(cell.value)}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="flows" className="m-0 outline-none">
            <div className="relative w-full aspect-square overflow-hidden"
              style={{ 
                transform: `scale(${zoom})`, 
                transformOrigin: '50% 50%',
                transition: 'transform 0.3s ease-out'
              }}
            >
              {/* SVG for flow lines */}
              <svg width="100%" height="100%" viewBox="0 0 8 8" className="absolute inset-0">
                <defs>
                  <marker id="arrowhead-yellow" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto">
                    <polygon points="0 0, 10 3.5, 0 7" fill="#eab308" />
                  </marker>
                  <marker id="arrowhead-orange" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto">
                    <polygon points="0 0, 10 3.5, 0 7" fill="#f97316" />
                  </marker>
                  <marker id="arrowhead-blue" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto">
                    <polygon points="0 0, 10 3.5, 0 7" fill="#3b82f6" />
                  </marker>
                  <marker id="arrowhead-green" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto">
                    <polygon points="0 0, 10 3.5, 0 7" fill="#22c55e" />
                  </marker>
                  <marker id="arrowhead-red" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto">
                    <polygon points="0 0, 10 3.5, 0 7" fill="#ef4444" />
                  </marker>
                  <marker id="arrowhead-purple" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto">
                    <polygon points="0 0, 10 3.5, 0 7" fill="#8b5cf6" />
                  </marker>
                </defs>
                
                {/* Flow connection lines */}
                {generateConnections.map(conn => {
                  const arrowId = `arrowhead-${conn.color}`;
                  return (
                    <path
                      key={conn.id}
                      d={conn.path}
                      stroke={`url(#${conn.id}-gradient)`}
                      strokeWidth="0.3"
                      strokeLinecap="round"
                      fill="none"
                      markerEnd={`url(#${arrowId})`}
                      className={conn.animation}
                      strokeDasharray="0.5,0.3"
                    />
                  );
                })}
                
                {/* Gradients for flow lines */}
                <defs>
                  {generateConnections.map(conn => {
                    let startColor, endColor;
                    switch (conn.color) {
                      case 'yellow': 
                        startColor = "#fbbf24"; 
                        endColor = "#fbbf24"; 
                        break;
                      case 'orange': 
                        startColor = "#f97316"; 
                        endColor = "#f97316"; 
                        break;
                      case 'blue': 
                        startColor = "#3b82f6"; 
                        endColor = "#3b82f6"; 
                        break;
                      case 'green': 
                        startColor = "#22c55e"; 
                        endColor = "#22c55e"; 
                        break;
                      case 'red': 
                        startColor = "#ef4444"; 
                        endColor = "#ef4444"; 
                        break;
                      default: 
                        startColor = "#8b5cf6"; 
                        endColor = "#8b5cf6";
                    }
                    
                    return (
                      <linearGradient key={`${conn.id}-gradient`} id={`${conn.id}-gradient`} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="8" y2="8">
                        <stop offset="0%" stopColor={startColor} stopOpacity="0.7" />
                        <stop offset="100%" stopColor={endColor} stopOpacity="0.9" />
                      </linearGradient>
                    );
                  })}
                </defs>
              </svg>
              
              {/* Device nodes */}
              <div className="absolute inset-0 pointer-events-none">
                {generateHeatmapCells
                  .filter(cell => cell.device) // Only show device cells
                  .map(cell => (
                    <div 
                      key={cell.id}
                      className={cn(
                        "absolute rounded-full flex flex-col items-center justify-center p-2",
                        "bg-background shadow-lg border-2 z-10 pointer-events-auto",
                        {
                          'border-yellow-500': cell.device === 'solar',
                          'border-orange-500': cell.device === 'battery',
                          'border-blue-500': cell.device === 'grid' && flowData.grid.direction === 'import' || cell.device === 'ev',
                          'border-green-500': cell.device === 'grid' && flowData.grid.direction === 'export',
                          'border-purple-500': cell.device === 'home',
                          'border-red-500': cell.device === 'heatpump',
                        }
                      )}
                      style={{
                        top: `calc(${cell.y} * 12.5% - 1%)`,
                        left: `calc(${cell.x} * 12.5% - 1%)`,
                        width: '14%',
                        height: '14%',
                      }}
                      onMouseEnter={() => handleCellHover(cell)}
                      onMouseLeave={() => handleCellHover(null)}
                      onClick={() => handleDeviceClick(cell.device || '')}
                    >
                      {cell.icon && (
                        <cell.icon className={cn(
                          "h-6 w-6",
                          {
                            'text-yellow-500': cell.device === 'solar',
                            'text-orange-500': cell.device === 'battery',
                            'text-blue-500': (cell.device === 'grid' && flowData.grid.direction === 'import') || (cell.device === 'ev'),
                            'text-green-500': cell.device === 'grid' && flowData.grid.direction === 'export',
                            'text-purple-500': cell.device === 'home',
                            'text-red-500': cell.device === 'heatpump',
                          }
                        )} />
                      )}
                      <span className="text-xs font-medium mt-1">{formatPower(cell.value)}</span>
                    </div>
                  ))
                }
              </div>
              
              {/* Flow arrows */}
              <div className="absolute inset-0 pointer-events-none">
                {generateConnections.map(conn => {
                  // Calculate midpoint position for arrow
                  let x, y;
                  
                  // Different positions based on connection type
                  if (conn.id === 'solar-home') {
                    x = 3 * 12.5 + 6; // Cell x position * cell width + offset
                    y = 2 * 12.5 + 6; // Midway from solar to home
                  } else if (conn.id === 'solar-battery') {
                    x = 2 * 12.5; // Diagonal midpoint
                    y = 2 * 12.5;
                  } else if (conn.id === 'battery-home') {
                    x = 2.5 * 12.5; // Midway from battery to home
                    y = 3 * 12.5 + 6;
                  } else if (conn.id === 'grid-home') {
                    x = 5.5 * 12.5; // Midway from grid to home
                    y = 3 * 12.5 + 6;
                  } else if (conn.id === 'home-grid') {
                    x = 5.5 * 12.5; // Midway from home to grid
                    y = 3 * 12.5 + 6;
                  } else if (conn.id === 'home-ev') {
                    x = 3 * 12.5; // Diagonal midpoint
                    y = 6 * 12.5;
                  } else if (conn.id === 'home-heatpump') {
                    x = 5 * 12.5; // Diagonal midpoint
                    y = 6 * 12.5;
                  } else {
                    return null; // Skip if unknown connection
                  }
                  
                  return (
                    <div 
                      key={`arrow-${conn.id}`}
                      className="absolute animate-bounce-slow"
                      style={{
                        top: `${y}%`,
                        left: `${x}%`,
                        transform: 'translate(-50%, -50%)',
                      }}
                    >
                      {getFlowArrow(conn.from, conn.to)}
                    </div>
                  );
                })}
              </div>
            </div>
          </TabsContent>
        </div>
        
        {/* Legend */}
        <div className="flex flex-wrap justify-center gap-2 mt-4">
          <Badge variant="outline" className="flex gap-1 items-center">
            <Sun className="h-3 w-3 text-yellow-500" />
            <span>Solar</span>
          </Badge>
          <Badge variant="outline" className="flex gap-1 items-center">
            <Battery className="h-3 w-3 text-orange-500" />
            <span>Battery</span>
          </Badge>
          <Badge variant="outline" className="flex gap-1 items-center">
            <Zap className="h-3 w-3 text-blue-500" />
            <span>Grid Import</span>
          </Badge>
          <Badge variant="outline" className="flex gap-1 items-center">
            <Zap className="h-3 w-3 text-green-500" />
            <span>Grid Export</span>
          </Badge>
          <Badge variant="outline" className="flex gap-1 items-center">
            <Home className="h-3 w-3 text-purple-500" />
            <span>Home</span>
          </Badge>
          <Badge variant="outline" className="flex gap-1 items-center">
            <BatteryCharging className="h-3 w-3 text-blue-500" />
            <span>EV</span>
          </Badge>
          <Badge variant="outline" className="flex gap-1 items-center">
            <Thermometer className="h-3 w-3 text-red-500" />
            <span>Heat Pump</span>
          </Badge>
        </div>
        
        {/* Action buttons */}
        <div className="flex justify-center mt-4 gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="text-xs"
            onClick={handleOpenElectricalDiagram}
          >
            <PanelLeft className="h-4 w-4 mr-1" />
            Electrical Diagram
          </Button>
          
          <Button 
            variant="outline" 
            size="sm" 
            className="text-xs"
            onClick={() => navigate('/energy-flow')}
          >
            <Maximize2 className="h-4 w-4 mr-1" />
            Full View
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

// Animation extension (commented out since these are already in tailwind.config.ts)
/* 
const tailwindExtension = {
  keyframes: {
    'bounce-slow': {
      '0%, 100%': { transform: 'translateY(-10%)' },
      '50%': { transform: 'translateY(0)' },
    },
  },
  animation: {
    'bounce-slow': 'bounce-slow 2s ease-in-out infinite',
  },
};
*/

export default EnergyFlowHeatmap;