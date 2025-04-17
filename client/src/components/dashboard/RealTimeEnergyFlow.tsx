import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Battery, Zap, SunIcon, Home, Plug, Wind } from 'lucide-react';
import { useWebSocket } from '@/hooks/WebSocketProvider';
import { useToast } from '@/hooks/use-toast';
import { useSiteContext } from '@/hooks/use-site-context';

interface EnergyFlowData {
  timestamp: string;
  generation: {
    solar: number;
    total: number;
  };
  consumption: {
    home: number;
    evCharging: number;
    heatPump: number;
    total: number;
  };
  grid: {
    import: number;
    export: number;
  };
  battery: {
    stateOfCharge: number;
    chargePower: number;
    dischargePower: number;
  };
}

const initialData: EnergyFlowData = {
  timestamp: new Date().toISOString(),
  generation: {
    solar: 0,
    total: 0
  },
  consumption: {
    home: 0,
    evCharging: 0,
    heatPump: 0,
    total: 0
  },
  grid: {
    import: 0,
    export: 0
  },
  battery: {
    stateOfCharge: 50,
    chargePower: 0,
    dischargePower: 0
  }
};

export default function RealTimeEnergyFlow() {
  const [energyData, setEnergyData] = useState<EnergyFlowData>(initialData);
  const [activeTab, setActiveTab] = useState('flow');
  const { socket, connected } = useWebSocket();
  const { toast } = useToast();
  const { currentSiteId } = useSiteContext();

  useEffect(() => {
    if (!socket || !connected || !currentSiteId) return;

    // Listen for energy flow updates from the server
    const handleEnergyUpdate = (message: any) => {
      try {
        const data = JSON.parse(message.data);
        
        // Only process updates for the current site
        if (data.type === 'energy_update' && data.siteId === currentSiteId) {
          setEnergyData(prevData => ({
            ...prevData,
            ...data.data,
            timestamp: new Date().toISOString()
          }));
        }
      } catch (error) {
        console.error('Error processing energy update:', error);
      }
    };

    socket.addEventListener('message', handleEnergyUpdate);

    // Request initial data
    if (connected && currentSiteId) {
      socket.send(JSON.stringify({
        type: 'request_energy_data',
        siteId: currentSiteId
      }));
    }

    return () => {
      socket.removeEventListener('message', handleEnergyUpdate);
    };
  }, [socket, connected, currentSiteId]);

  // Calculate net grid flow
  const netGridFlow = energyData.grid.import - energyData.grid.export;
  
  // Calculate self-sufficiency percentage
  const totalConsumption = energyData.consumption.total;
  const selfGeneration = energyData.generation.total;
  const selfSufficiency = totalConsumption > 0 
    ? Math.min(100, Math.round((selfGeneration / totalConsumption) * 100)) 
    : 0;

  // Determine battery flow direction
  const batteryFlowDirection = 
    energyData.battery.chargePower > energyData.battery.dischargePower 
      ? 'charging' 
      : energyData.battery.dischargePower > energyData.battery.chargePower 
        ? 'discharging' 
        : 'idle';

  // Calculate battery power
  const batteryPower = Math.abs(
    energyData.battery.chargePower - energyData.battery.dischargePower
  );

  // Format kW values for display
  const formatPower = (power: number) => {
    return power.toFixed(1);
  };

  return (
    <Card className="col-span-2">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Zap className="h-5 w-5 mr-2 text-primary" />
          Real-Time Energy Flow
        </CardTitle>
        <CardDescription>
          {connected ? 
            `Live energy flow data as of ${new Date(energyData.timestamp).toLocaleTimeString()}` : 
            'Connecting to real-time data...'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="flow">Energy Flow</TabsTrigger>
            <TabsTrigger value="stats">Stats</TabsTrigger>
          </TabsList>
          
          {/* Energy Flow View */}
          <TabsContent value="flow" className="pt-4 space-y-6">
            <div className="grid grid-cols-3 gap-4">
              {/* Generation */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium flex items-center">
                  <SunIcon className="h-4 w-4 mr-1 text-yellow-500" />
                  Generation
                </h3>
                <div className="p-3 bg-muted rounded-lg flex items-center justify-between">
                  <div className="flex items-center">
                    <SunIcon className="h-5 w-5 mr-2 text-yellow-500" />
                    <span>Solar</span>
                  </div>
                  <span className="font-semibold">{formatPower(energyData.generation.solar)} kW</span>
                </div>
                <div className="p-2 rounded-lg border border-dashed text-center">
                  <span className="text-sm text-muted-foreground mr-1">Total</span>
                  <span className="font-semibold">{formatPower(energyData.generation.total)} kW</span>
                </div>
              </div>
              
              {/* Battery */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium flex items-center">
                  <Battery className="h-4 w-4 mr-1 text-green-500" />
                  Battery
                </h3>
                <div className="p-3 bg-muted rounded-lg flex flex-col items-center">
                  <div className="w-full flex justify-between items-center mb-1">
                    <span className="text-sm">SoC</span>
                    <span className="font-semibold">{energyData.battery.stateOfCharge}%</span>
                  </div>
                  <Progress value={energyData.battery.stateOfCharge} className="h-2 w-full" />
                  <div className="w-full mt-2 flex items-center justify-between">
                    <div className="flex items-center">
                      <Zap className={`h-4 w-4 mr-1 ${batteryFlowDirection === 'charging' ? 'text-green-500' : 'text-muted-foreground'}`} />
                      {batteryFlowDirection === 'charging' ? 'Charging' : batteryFlowDirection === 'discharging' ? 'Discharging' : 'Idle'}
                    </div>
                    {batteryFlowDirection !== 'idle' && (
                      <span className="font-semibold">{formatPower(batteryPower)} kW</span>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Grid */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium flex items-center">
                  <Plug className="h-4 w-4 mr-1 text-blue-500" />
                  Grid
                </h3>
                <div className="p-3 bg-muted rounded-lg flex flex-col space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Zap className={`h-4 w-4 mr-1 ${energyData.grid.import > 0 ? 'text-red-500' : 'text-muted-foreground'}`} />
                      <span>Import</span>
                    </div>
                    <span className="font-semibold">{formatPower(energyData.grid.import)} kW</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Zap className={`h-4 w-4 mr-1 ${energyData.grid.export > 0 ? 'text-green-500' : 'text-muted-foreground'}`} />
                      <span>Export</span>
                    </div>
                    <span className="font-semibold">{formatPower(energyData.grid.export)} kW</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Consumption Section */}
            <div>
              <h3 className="text-sm font-medium mb-2 flex items-center">
                <Home className="h-4 w-4 mr-1 text-purple-500" />
                Consumption
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <div className="p-3 bg-muted rounded-lg flex items-center justify-between">
                  <div className="flex items-center">
                    <Home className="h-4 w-4 mr-1 text-purple-500" />
                    <span className="text-sm">Home</span>
                  </div>
                  <span className="font-semibold">{formatPower(energyData.consumption.home)} kW</span>
                </div>
                <div className="p-3 bg-muted rounded-lg flex items-center justify-between">
                  <div className="flex items-center">
                    <Zap className="h-4 w-4 mr-1 text-blue-500" />
                    <span className="text-sm">EV</span>
                  </div>
                  <span className="font-semibold">{formatPower(energyData.consumption.evCharging)} kW</span>
                </div>
                <div className="p-3 bg-muted rounded-lg flex items-center justify-between">
                  <div className="flex items-center">
                    <Wind className="h-4 w-4 mr-1 text-blue-500" />
                    <span className="text-sm">Heat</span>
                  </div>
                  <span className="font-semibold">{formatPower(energyData.consumption.heatPump)} kW</span>
                </div>
                <div className="p-3 bg-primary/10 rounded-lg flex items-center justify-between">
                  <div className="flex items-center">
                    <Zap className="h-4 w-4 mr-1 text-primary" />
                    <span className="text-sm font-medium">Total</span>
                  </div>
                  <span className="font-semibold">{formatPower(energyData.consumption.total)} kW</span>
                </div>
              </div>
            </div>
            
            {/* Energy flow diagram */}
            <div className="relative h-48 border rounded-lg p-4 flex items-center justify-center">
              <div className="absolute w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center left-8 top-1/2 transform -translate-y-1/2">
                <SunIcon className="h-8 w-8 text-yellow-500" />
                <span className="absolute -bottom-6 text-xs font-medium">Solar</span>
              </div>
              
              <div className="absolute w-16 h-16 bg-green-100 rounded-full flex items-center justify-center left-1/2 transform -translate-x-1/2 -translate-y-1/2 top-1/2">
                <Battery className="h-8 w-8 text-green-500" />
                <span className="absolute -bottom-6 text-xs font-medium">Battery</span>
                <span className="absolute -top-6 text-xs font-medium">{energyData.battery.stateOfCharge}%</span>
              </div>
              
              <div className="absolute w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center right-8 top-1/4 transform -translate-y-1/2">
                <Plug className="h-8 w-8 text-blue-500" />
                <span className="absolute -bottom-6 text-xs font-medium">Grid</span>
              </div>
              
              <div className="absolute w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center right-8 bottom-6">
                <Home className="h-8 w-8 text-purple-500" />
                <span className="absolute -bottom-6 text-xs font-medium">Home</span>
              </div>
              
              {/* Flow lines */}
              <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
                {/* Solar to Battery */}
                {energyData.generation.solar > 0 && (
                  <g>
                    <line 
                      x1="80" y1="80" 
                      x2="calc(50% - 40)" y2="80" 
                      stroke="#22c55e" 
                      strokeWidth="4" 
                      strokeDasharray={energyData.generation.solar > 1 ? "0" : "4"}
                    />
                    <polygon 
                      points={`calc(50% - 40),74 calc(50% - 40),86 calc(50% - 30),80`} 
                      fill="#22c55e" 
                    />
                  </g>
                )}
                
                {/* Solar to Home */}
                {energyData.generation.solar > 0 && (
                  <g>
                    <line 
                      x1="80" y1="80" 
                      x2="80" y2="calc(100% - 40)" 
                      stroke="#22c55e" 
                      strokeWidth="4" 
                      strokeDasharray={energyData.generation.solar > 1 ? "0" : "4"}
                    />
                    <line 
                      x1="80" y1="calc(100% - 40)" 
                      x2="calc(100% - 80)" y2="calc(100% - 40)" 
                      stroke="#22c55e" 
                      strokeWidth="4" 
                      strokeDasharray={energyData.generation.solar > 1 ? "0" : "4"}
                    />
                    <polygon 
                      points={`calc(100% - 80),calc(100% - 46) calc(100% - 80),calc(100% - 34) calc(100% - 70),calc(100% - 40)`} 
                      fill="#22c55e" 
                    />
                  </g>
                )}
                
                {/* Grid to Home */}
                {energyData.grid.import > 0 && (
                  <g>
                    <line 
                      x1="calc(100% - 80)" y1="40" 
                      x2="calc(100% - 80)" y2="calc(100% - 40)" 
                      stroke="#3b82f6" 
                      strokeWidth="4" 
                      strokeDasharray={energyData.grid.import > 1 ? "0" : "4"}
                    />
                    <polygon 
                      points={`calc(100% - 74),calc(100% - 40) calc(100% - 86),calc(100% - 40) calc(100% - 80),calc(100% - 30)`} 
                      fill="#3b82f6" 
                    />
                  </g>
                )}
                
                {/* Home to Grid (export) */}
                {energyData.grid.export > 0 && (
                  <g>
                    <line 
                      x1="calc(100% - 80)" y1="calc(100% - 40)" 
                      x2="calc(100% - 80)" y2="40" 
                      stroke="#22c55e" 
                      strokeWidth="4" 
                      strokeDasharray={energyData.grid.export > 1 ? "0" : "4"}
                    />
                    <polygon 
                      points={`calc(100% - 74),40 calc(100% - 86),40 calc(100% - 80),30`} 
                      fill="#22c55e" 
                    />
                  </g>
                )}
                
                {/* Battery to Home */}
                {batteryFlowDirection === 'discharging' && (
                  <g>
                    <line 
                      x1="50%" y1="80" 
                      x2="calc(100% - 80)" y2="80" 
                      stroke="#22c55e" 
                      strokeWidth="4" 
                      strokeDasharray={batteryPower > 1 ? "0" : "4"}
                    />
                    <line 
                      x1="calc(100% - 80)" y1="80" 
                      x2="calc(100% - 80)" y2="calc(100% - 40)" 
                      stroke="#22c55e" 
                      strokeWidth="4" 
                      strokeDasharray={batteryPower > 1 ? "0" : "4"}
                    />
                    <polygon 
                      points={`calc(100% - 74),calc(100% - 40) calc(100% - 86),calc(100% - 40) calc(100% - 80),calc(100% - 30)`} 
                      fill="#22c55e" 
                    />
                  </g>
                )}
                
                {/* Home to Battery (charging) */}
                {batteryFlowDirection === 'charging' && (
                  <g>
                    <line 
                      x1="calc(100% - 80)" y1="calc(100% - 40)" 
                      x2="calc(100% - 80)" y2="80" 
                      stroke="#3b82f6" 
                      strokeWidth="4" 
                      strokeDasharray={batteryPower > 1 ? "0" : "4"}
                    />
                    <line 
                      x1="calc(100% - 80)" y1="80" 
                      x2="50%" y2="80" 
                      stroke="#3b82f6" 
                      strokeWidth="4" 
                      strokeDasharray={batteryPower > 1 ? "0" : "4"}
                    />
                    <polygon 
                      points={`50%,74 50%,86 calc(50% - 10),80`} 
                      fill="#3b82f6" 
                    />
                  </g>
                )}
              </svg>
            </div>
          </TabsContent>
          
          {/* Stats View */}
          <TabsContent value="stats" className="pt-4 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg border space-y-2">
                <h3 className="text-sm font-semibold flex items-center">
                  <SunIcon className="h-4 w-4 mr-1 text-yellow-500" />
                  Self-Sufficiency
                </h3>
                <div className="relative pt-1">
                  <div className="flex mb-2 items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-green-600 bg-green-100">
                        {selfSufficiency}%
                      </span>
                    </div>
                  </div>
                  <div className="overflow-hidden h-2 text-xs flex rounded bg-green-100">
                    <div 
                      style={{ width: `${selfSufficiency}%` }} 
                      className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-green-500">
                    </div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {selfSufficiency >= 100 
                    ? 'Fully self-sufficient! No grid power needed.'
                    : selfSufficiency > 50 
                    ? 'Good self-sufficiency level. Mostly powered by your own energy.'
                    : 'Currently drawing significant power from the grid.'}
                </p>
              </div>
              
              <div className="p-4 rounded-lg border space-y-2">
                <h3 className="text-sm font-semibold flex items-center">
                  <Plug className="h-4 w-4 mr-1 text-blue-500" />
                  Grid Status
                </h3>
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${netGridFlow > 0 ? 'bg-red-500' : 'bg-green-500'}`}></div>
                  <span className="font-medium">
                    {netGridFlow > 0 
                      ? 'Importing' 
                      : netGridFlow < 0 
                      ? 'Exporting' 
                      : 'Balanced'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Net flow:</span>
                  <span className={`font-semibold ${netGridFlow > 0 ? 'text-red-500' : netGridFlow < 0 ? 'text-green-500' : ''}`}>
                    {netGridFlow > 0 
                      ? `${formatPower(netGridFlow)} kW import` 
                      : netGridFlow < 0 
                      ? `${formatPower(Math.abs(netGridFlow))} kW export` 
                      : '0 kW (balanced)'}
                  </span>
                </div>
              </div>
              
              <div className="p-4 rounded-lg border space-y-2">
                <h3 className="text-sm font-semibold flex items-center">
                  <Battery className="h-4 w-4 mr-1 text-green-500" />
                  Battery Health
                </h3>
                <div className="relative pt-1">
                  <div className="flex mb-2 items-center justify-between">
                    <div>
                      <span className={`text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full 
                        ${energyData.battery.stateOfCharge > 80 
                          ? 'bg-green-100 text-green-600' 
                          : energyData.battery.stateOfCharge > 20 
                          ? 'bg-blue-100 text-blue-600' 
                          : 'bg-yellow-100 text-yellow-600'}`}>
                        {energyData.battery.stateOfCharge}% charged
                      </span>
                    </div>
                  </div>
                  <div className="overflow-hidden h-2 text-xs flex rounded bg-gray-100">
                    <div 
                      style={{ width: `${energyData.battery.stateOfCharge}%` }} 
                      className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center 
                        ${energyData.battery.stateOfCharge > 80 
                          ? 'bg-green-500' 
                          : energyData.battery.stateOfCharge > 20 
                          ? 'bg-blue-500' 
                          : 'bg-yellow-500'}`}>
                    </div>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Status:</span>
                  <span className="font-medium">
                    {batteryFlowDirection === 'charging' 
                      ? `Charging @ ${formatPower(batteryPower)} kW` 
                      : batteryFlowDirection === 'discharging' 
                      ? `Discharging @ ${formatPower(batteryPower)} kW` 
                      : 'Idle'}
                  </span>
                </div>
              </div>
              
              <div className="p-4 rounded-lg border space-y-2">
                <h3 className="text-sm font-semibold flex items-center">
                  <Zap className="h-4 w-4 mr-1 text-primary" />
                  Energy Balance
                </h3>
                <div className="flex items-center justify-between">
                  <span>Generation:</span>
                  <span className="font-medium">{formatPower(energyData.generation.total)} kW</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Consumption:</span>
                  <span className="font-medium">{formatPower(energyData.consumption.total)} kW</span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t">
                  <span>Balance:</span>
                  <span className={`font-semibold ${
                    energyData.generation.total >= energyData.consumption.total 
                      ? 'text-green-500' 
                      : 'text-red-500'
                  }`}>
                    {energyData.generation.total >= energyData.consumption.total
                      ? `+${formatPower(energyData.generation.total - energyData.consumption.total)} kW`
                      : `-${formatPower(energyData.consumption.total - energyData.generation.total)} kW`}
                  </span>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}