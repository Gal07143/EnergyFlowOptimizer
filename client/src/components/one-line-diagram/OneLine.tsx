import { useCallback, useRef, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import ReactFlow, {
  Background,
  BackgroundVariant,
  Controls,
  Edge,
  Node,
  NodeTypes,
  EdgeTypes,
  ConnectionLineType,
  useNodesState,
  useEdgesState,
  useReactFlow,
  MiniMap,
  Panel,
  ReactFlowProvider,
  NodeMouseHandler,
  OnConnect
} from 'reactflow';
import 'reactflow/dist/style.css';

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { 
  Settings, 
  Layers, 
  Save, 
  Search, 
  ArrowUpCircle, 
  CircleDot, 
  PanelRightClose, 
  PanelRight,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useSiteContext } from "@/hooks/use-site-context";

// Import custom nodes, edges, and palette
import {
  GridConnectionNode,
  TransformerNode,
  BreakerNode,
  BusNode,
  SolarNode,
  BatteryNode,
  EVChargerNode,
  MeterNode,
  LoadNode
} from './OneLineNodes';

import { NodePalette } from './NodePalette';

import { PowerLineEdge } from './OneLineEdges';

// Define custom node types
const nodeTypes: NodeTypes = {
  grid_connection: GridConnectionNode,
  transformer: TransformerNode,
  breaker: BreakerNode,
  bus: BusNode,
  solar: SolarNode,
  battery: BatteryNode,
  ev_charger: EVChargerNode,
  meter: MeterNode,
  load: LoadNode,
};

// Define custom edge types
const edgeTypes: EdgeTypes = {
  powerline: PowerLineEdge,
};

// Initial nodes and edges
const initialNodes: Node[] = [
  {
    id: 'grid-1',
    type: 'grid_connection',
    position: { x: 100, y: 100 },
    data: {
      label: 'Grid Connection',
      voltage: '22kV',
      status: 'online',
      power: 45
    }
  },
  {
    id: 'transformer-1',
    type: 'transformer',
    position: { x: 300, y: 100 },
    data: {
      label: 'Main Transformer',
      primaryVoltage: '22kV',
      secondaryVoltage: '400V',
      rating: '500kVA',
      status: 'online',
      loading: 0.35
    }
  },
  {
    id: 'breaker-1',
    type: 'breaker',
    position: { x: 500, y: 100 },
    data: {
      label: 'Main Breaker',
      current: '120A',
      status: 'closed',
      tripSettings: { overload: '150A', shortCircuit: '500A' }
    }
  },
  {
    id: 'bus-1',
    type: 'bus',
    position: { x: 700, y: 100 },
    data: {
      label: 'Main Bus',
      voltage: '400V',
      status: 'energized'
    }
  },
  {
    id: 'solar-1',
    type: 'solar',
    position: { x: 650, y: 250 },
    data: {
      label: 'Solar Array',
      capacity: '50kW',
      generation: '35kW',
      status: 'generating'
    }
  },
  {
    id: 'battery-1',
    type: 'battery',
    position: { x: 650, y: 400 },
    data: {
      label: 'Battery Storage',
      capacity: '100kWh',
      power: '10kW',
      soc: 75,
      status: 'discharging'
    }
  },
  {
    id: 'ev-charger-1',
    type: 'ev_charger',
    position: { x: 900, y: 250 },
    data: {
      label: 'EV Charging Station',
      capacity: '22kW',
      power: '15kW',
      connectedVehicles: 1,
      status: 'charging'
    }
  },
  {
    id: 'meter-1',
    type: 'meter',
    position: { x: 900, y: 100 },
    data: {
      label: 'Main Meter',
      powerImport: '0kW',
      powerExport: '10kW',
      energy: '234kWh',
      status: 'online'
    }
  },
  {
    id: 'load-1',
    type: 'load',
    position: { x: 900, y: 400 },
    data: {
      label: 'Building Load',
      power: '40kW',
      peakPower: '60kW',
      energyToday: '320kWh',
      status: 'normal'
    }
  }
];

const initialEdges: Edge[] = [
  {
    id: 'e-grid-transformer',
    source: 'grid-1',
    target: 'transformer-1',
    type: 'powerline',
    data: {
      voltage: '22kV',
      power: '45kW',
      direction: 'import'
    }
  },
  {
    id: 'e-transformer-breaker',
    source: 'transformer-1',
    target: 'breaker-1',
    type: 'powerline',
    data: {
      voltage: '400V',
      power: '45kW',
      direction: 'import'
    }
  },
  {
    id: 'e-breaker-bus',
    source: 'breaker-1',
    target: 'bus-1',
    type: 'powerline',
    data: {
      voltage: '400V',
      power: '45kW',
      direction: 'import'
    }
  },
  {
    id: 'e-bus-meter',
    source: 'bus-1',
    target: 'meter-1',
    type: 'powerline',
    data: {
      voltage: '400V',
      power: '45kW',
      direction: 'import'
    }
  },
  {
    id: 'e-bus-solar',
    source: 'solar-1',
    target: 'bus-1',
    type: 'powerline',
    data: {
      voltage: '400V',
      power: '35kW',
      direction: 'export'
    }
  },
  {
    id: 'e-bus-battery',
    source: 'battery-1',
    target: 'bus-1',
    type: 'powerline',
    data: {
      voltage: '400V',
      power: '10kW',
      direction: 'export'
    }
  },
  {
    id: 'e-bus-ev',
    source: 'bus-1',
    target: 'ev-charger-1',
    type: 'powerline',
    data: {
      voltage: '400V',
      power: '15kW',
      direction: 'import'
    }
  },
  {
    id: 'e-bus-load',
    source: 'bus-1',
    target: 'load-1',
    type: 'powerline',
    data: {
      voltage: '400V',
      power: '40kW',
      direction: 'import'
    }
  }
];

// Interface for device data
interface Device {
  id: number;
  name: string;
  type: string;
  model: string;
  manufacturer: string;
  serialNumber: string;
  status: string;
  siteId: number;
  capabilities?: string[];
  protocol?: string;
  telemetry?: any;
}

// Interface for site data
interface SiteEnergy {
  timestamp: string;
  gridImport: number;
  gridExport: number;
  solarProduction: number;
  batteryCharging: number;
  batteryDischarging: number;
  evCharging: number;
  buildingConsumption: number;
  batterySoc: number;
}

// Main OneLine Diagram component
const OneLineDiagram = () => {
  // Site context for current site
  const { currentSiteId } = useSiteContext();
  const { toast } = useToast();
  
  // State for nodes and edges
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  
  // State for panel visibility
  const [isPaletteOpen, setIsPaletteOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('real-time');
  const [showDefaultDiagram, setShowDefaultDiagram] = useState(false);
  
  // Reference to reactflow instance
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const connectingNodeId = useRef<string | null>(null);
  const { project } = useReactFlow();
  
  // Query for site devices
  const { data: devices, isLoading: isLoadingDevices, error: devicesError, refetch: refetchDevices } = 
    useQuery<Device[]>({ 
      queryKey: ['/api/devices'], 
      enabled: !!currentSiteId,
      staleTime: 10000, // 10 seconds
    });
    
  // Query for site energy data
  const { data: siteEnergy, isLoading: isLoadingEnergy, error: energyError, refetch: refetchEnergy } = 
    useQuery<SiteEnergy>({ 
      queryKey: [`/api/sites/${currentSiteId}/energy/latest`], 
      enabled: !!currentSiteId,
      staleTime: 5000, // 5 seconds
      refetchInterval: 10000, // Auto refetch every 10 seconds
    });
    
  // Query for device telemetry data
  const { data: deviceTelemetry, isLoading: isLoadingTelemetry, error: telemetryError, refetch: refetchTelemetry } = 
    useQuery<Record<string, any>>({ 
      queryKey: [`/api/sites/${currentSiteId}/telemetry`], 
      enabled: !!currentSiteId,
      staleTime: 5000, // 5 seconds
      refetchInterval: 10000, // Auto refetch every 10 seconds
    });
    
  // Function to manually refresh data
  const refreshData = useCallback(() => {
    refetchDevices();
    refetchEnergy();
    toast({
      title: "Data refreshed",
      description: "The diagram data has been updated with the latest information.",
    });
  }, [refetchDevices, refetchEnergy, toast]);
  
  // Create nodes from device data
  useEffect(() => {
    if (!devices || !siteEnergy || (showDefaultDiagram && initialNodes.length > 0)) {
      if (showDefaultDiagram) {
        setNodes(initialNodes);
        setEdges(initialEdges);
      }
      return;
    }
    
    // Define node positions
    const positions = {
      grid: { x: 100, y: 100 },
      transformer: { x: 300, y: 100 },
      breaker: { x: 500, y: 100 },
      bus: { x: 700, y: 100 },
      meter: { x: 900, y: 100 },
      solar: { x: 650, y: 250 },
      battery: { x: 650, y: 400 },
      ev_charger: { x: 900, y: 250 },
      load: { x: 900, y: 400 },
    };
    
    // Get device telemetry data
    let solarDevice = devices.find(d => d.type === 'solar_pv');
    let batteryDevice = devices.find(d => d.type === 'battery_storage');
    let evChargerDevice = devices.find(d => d.type === 'ev_charger');
    let smartMeterDevice = devices.find(d => d.type === 'smart_meter');
    
    // Extract telemetry data if available - handle null/undefined cases
    const solarTelemetry = solarDevice && deviceTelemetry ? deviceTelemetry[solarDevice.id] : null;
    const batteryTelemetry = batteryDevice && deviceTelemetry ? deviceTelemetry[batteryDevice.id] : null;
    const evChargerTelemetry = evChargerDevice && deviceTelemetry ? deviceTelemetry[evChargerDevice.id] : null;
    const meterTelemetry = smartMeterDevice && deviceTelemetry ? deviceTelemetry[smartMeterDevice.id] : null;
    
    // Create necessary infrastructure nodes
    const infraNodes: Node[] = [
      {
        id: 'grid-1',
        type: 'grid_connection',
        position: positions.grid,
        data: {
          label: 'Grid Connection',
          voltage: '22kV',
          status: 'online',
          power: Math.max(0, siteEnergy.gridImport - siteEnergy.gridExport),
          frequency: meterTelemetry?.frequency || '50 Hz',
          importPower: siteEnergy.gridImport,
          exportPower: siteEnergy.gridExport
        }
      },
      {
        id: 'transformer-1',
        type: 'transformer',
        position: positions.transformer,
        data: {
          label: 'Main Transformer',
          primaryVoltage: '22kV',
          secondaryVoltage: '400V',
          rating: '500kVA',
          status: 'online',
          loading: (siteEnergy.gridImport / 500), // Assume 500kW max capacity
          temperature: Math.round(35 + Math.random() * 15) // Simulated temperature
        }
      },
      {
        id: 'breaker-1',
        type: 'breaker',
        position: positions.breaker,
        data: {
          label: 'Main Breaker',
          current: `${Math.round(siteEnergy.gridImport * 1.5)}A`, // Approximate current
          status: 'closed',
          tripSettings: { overload: '150A', shortCircuit: '500A' }
        }
      },
      {
        id: 'bus-1',
        type: 'bus',
        position: positions.bus,
        data: {
          label: 'Main Bus',
          voltage: meterTelemetry?.voltage || '400V',
          status: 'energized'
        }
      },
      {
        id: 'meter-1',
        type: 'meter',
        position: positions.meter,
        data: {
          label: smartMeterDevice?.name || 'Main Meter',
          powerImport: `${siteEnergy.gridImport}kW`,
          powerExport: `${siteEnergy.gridExport}kW`,
          energy: meterTelemetry?.totalEnergy ? `${Math.round(meterTelemetry.totalEnergy)}kWh` : `${Math.round(siteEnergy.gridImport * 24)}kWh`,
          voltage: meterTelemetry?.voltage || '400V',
          current: meterTelemetry?.current || `${Math.round(siteEnergy.gridImport * 1.5)}A`,
          frequency: meterTelemetry?.frequency || '50 Hz',
          powerFactor: meterTelemetry?.powerFactor || 0.95,
          status: meterTelemetry?.status || 'online'
        }
      },
      {
        id: 'load-1',
        type: 'load',
        position: positions.load,
        data: {
          label: 'Building Load',
          power: `${siteEnergy.buildingConsumption}kW`,
          peakPower: `${Math.round(siteEnergy.buildingConsumption * 1.5)}kW`, // Estimated peak
          energyToday: `${Math.round(siteEnergy.buildingConsumption * 24)}kWh`, // Daily estimate
          status: 'normal'
        }
      }
    ];
    
    // Create device nodes based on real devices with telemetry data
    const deviceNodes: Node[] = [];
    
    // Process each device
    devices.forEach(device => {
      if (device.type === 'solar_pv') {
        // Get real telemetry data if available
        const power = solarTelemetry?.power || siteEnergy.solarProduction;
        const dailyEnergy = solarTelemetry?.dailyEnergy || Math.round(siteEnergy.solarProduction * 6);
        const voltage = solarTelemetry?.voltage || 400;
        const current = solarTelemetry?.current || Math.round(power * 1000 / voltage);
        const efficiency = solarTelemetry?.efficiency || 96;
        const temperature = solarTelemetry?.temperature || 45;
        
        deviceNodes.push({
          id: `solar-${device.id}`,
          type: 'solar',
          position: positions.solar,
          data: {
            label: device.name,
            capacity: device.capabilities?.includes('50kW') ? '50kW' : '10kW',
            generation: `${power}kW`,
            dailyEnergy: `${dailyEnergy}kWh`,
            voltage: `${voltage}V`,
            current: `${current}A`,
            efficiency: `${efficiency}%`,
            temperature: `${temperature}°C`,
            status: solarTelemetry?.status || device.status
          }
        });
      } else if (device.type === 'battery_storage') {
        // Get real telemetry data if available
        const power = batteryTelemetry?.power || Math.max(siteEnergy.batteryDischarging, siteEnergy.batteryCharging);
        const soc = batteryTelemetry?.soc || siteEnergy.batterySoc;
        const voltage = batteryTelemetry?.voltage || 48;
        const current = batteryTelemetry?.current || Math.round(power * 1000 / voltage);
        const temperature = batteryTelemetry?.temperature || 35;
        const cycles = batteryTelemetry?.cycles || 125;
        const status = batteryTelemetry?.status || (siteEnergy.batteryCharging > siteEnergy.batteryDischarging ? 'charging' : 'discharging');
        
        deviceNodes.push({
          id: `battery-${device.id}`,
          type: 'battery',
          position: positions.battery,
          data: {
            label: device.name,
            capacity: device.capabilities?.includes('100kWh') ? '100kWh' : '20kWh',
            power: `${power}kW`,
            soc: soc,
            voltage: `${voltage}V`,
            current: `${current}A`,
            temperature: `${temperature}°C`,
            cycles: cycles,
            status: status
          }
        });
      } else if (device.type === 'ev_charger') {
        // Get real telemetry data if available
        const power = evChargerTelemetry?.power || siteEnergy.evCharging;
        const connectorStatus = evChargerTelemetry?.connectorStatus || (siteEnergy.evCharging > 0 ? 'connected' : 'available');
        const energy = evChargerTelemetry?.energy || Math.round(siteEnergy.evCharging * 2);
        const voltage = evChargerTelemetry?.voltage || 400;
        const current = evChargerTelemetry?.current || Math.round(power * 1000 / voltage);
        const temperature = evChargerTelemetry?.temperature || 30;
        const status = evChargerTelemetry?.status || (siteEnergy.evCharging > 0 ? 'charging' : 'idle');
        
        deviceNodes.push({
          id: `ev-charger-${device.id}`,
          type: 'ev_charger',
          position: positions.ev_charger,
          data: {
            label: device.name,
            capacity: device.capabilities?.includes('22kW') ? '22kW' : '7.4kW',
            power: `${power}kW`,
            connectorStatus: connectorStatus,
            connectedVehicles: connectorStatus === 'connected' ? 1 : 0,
            energy: `${energy}kWh`,
            voltage: `${voltage}V`,
            current: `${current}A`,
            temperature: `${temperature}°C`,
            status: status
          }
        });
      }
    });
    
    // Combine all nodes
    const allNodes = [...infraNodes, ...deviceNodes];
    
    // Update nodes
    setNodes(allNodes);
    
    // Calculate grid direction and power
    const netGridPower = siteEnergy.gridImport - siteEnergy.gridExport;
    const gridDirection = netGridPower >= 0 ? 'import' : 'export';
    const gridPower = Math.abs(netGridPower);
    
    // Create edges with power flow arrows showing correct direction and magnitude
    const newEdges: Edge[] = [
      {
        id: 'e-grid-transformer',
        source: gridDirection === 'import' ? 'grid-1' : 'transformer-1',
        target: gridDirection === 'import' ? 'transformer-1' : 'grid-1',
        type: 'powerline',
        data: {
          voltage: '22kV',
          power: `${gridPower.toFixed(2)}kW`,
          direction: gridDirection,
          magnitude: gridPower / 10 // Scale for arrow size
        }
      },
      {
        id: 'e-transformer-breaker',
        source: 'transformer-1',
        target: 'breaker-1',
        type: 'powerline',
        data: {
          voltage: '400V',
          power: `${(siteEnergy.solarProduction + siteEnergy.batteryDischarging + siteEnergy.gridImport).toFixed(2)}kW`,
          direction: 'import',
          magnitude: (siteEnergy.solarProduction + siteEnergy.batteryDischarging + siteEnergy.gridImport) / 10
        }
      },
      {
        id: 'e-breaker-bus',
        source: 'breaker-1',
        target: 'bus-1',
        type: 'powerline',
        data: {
          voltage: '400V',
          power: `${(siteEnergy.solarProduction + siteEnergy.batteryDischarging + siteEnergy.gridImport).toFixed(2)}kW`,
          direction: 'import',
          magnitude: (siteEnergy.solarProduction + siteEnergy.batteryDischarging + siteEnergy.gridImport) / 10
        }
      },
      {
        id: 'e-bus-meter',
        source: 'bus-1',
        target: 'meter-1',
        type: 'powerline',
        data: {
          voltage: '400V',
          power: `${(siteEnergy.solarProduction + siteEnergy.batteryDischarging + siteEnergy.gridImport).toFixed(2)}kW`,
          direction: 'import',
          magnitude: (siteEnergy.solarProduction + siteEnergy.batteryDischarging + siteEnergy.gridImport) / 10
        }
      },
      {
        id: 'e-bus-load',
        source: 'bus-1',
        target: 'load-1',
        type: 'powerline',
        data: {
          voltage: '400V',
          power: `${siteEnergy.buildingConsumption.toFixed(2)}kW`,
          direction: 'import',
          magnitude: siteEnergy.buildingConsumption / 10
        }
      }
    ];
    
    // Add edges for each device showing real power flows
    deviceNodes.forEach(node => {
      if (node.type === 'solar') {
        // Solar always exports to the bus
        const power = parseFloat(node.data.generation);
        
        newEdges.push({
          id: `e-${node.id}-bus`,
          source: node.id,
          target: 'bus-1',
          type: 'powerline',
          data: {
            voltage: '400V',
            power: `${power.toFixed(2)}kW`,
            direction: 'export',
            magnitude: power / 10 // Scale for visualization
          }
        });
      } else if (node.type === 'battery') {
        // Battery can either charge (import) or discharge (export)
        const power = parseFloat(node.data.power);
        const direction = node.data.status === 'charging' ? 'import' : 'export';
        
        newEdges.push({
          id: `e-${direction === 'export' ? node.id + '-bus' : 'bus-' + node.id}`,
          source: direction === 'export' ? node.id : 'bus-1',
          target: direction === 'export' ? 'bus-1' : node.id,
          type: 'powerline',
          data: {
            voltage: '400V',
            power: `${power.toFixed(2)}kW`,
            direction,
            magnitude: power / 10
          }
        });
      } else if (node.type === 'ev_charger') {
        // EV charger always imports from the bus when charging
        const power = parseFloat(node.data.power);
        
        newEdges.push({
          id: `e-bus-${node.id}`,
          source: 'bus-1',
          target: node.id,
          type: 'powerline',
          data: {
            voltage: '400V',
            power: `${power.toFixed(2)}kW`,
            direction: 'import',
            magnitude: power / 10
          }
        });
      }
    });
    
    // Update edges
    setEdges(newEdges);
    
  }, [devices, siteEnergy, deviceTelemetry, setNodes, setEdges, showDefaultDiagram, initialNodes, initialEdges]);
  
  // Handle node click
  const onNodeClick: NodeMouseHandler = useCallback((event, node) => {
    console.log('Node clicked:', node);
  }, []);

  // Handle connecting two nodes
  const onConnect: OnConnect = useCallback((params) => {
    // Create a new edge when nodes are connected
    setEdges((eds) => {
      // Generate unique ID
      const id = `e-${params.source}-${params.target}`;
      
      // Default edge data
      const edgeData = {
        voltage: '400V',
        power: '0kW',
        direction: 'import'
      };
      
      return eds.concat({
        id,
        source: params.source || '',
        target: params.target || '',
        type: 'powerline',
        data: edgeData
      });
    });
  }, [setEdges]);

  // Handle drag over for adding new nodes
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  // Handle drop for adding new nodes
  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow');
      
      // Check if valid data was dropped
      if (!type) return;
      
      // Get the drop position
      const position = project({
        x: event.clientX,
        y: event.clientY,
      });
      
      try {
        // Parse the dropped node data
        const nodeData = JSON.parse(type);
        const id = `${nodeData.type}-${Date.now()}`;
        
        // Create the new node
        const newNode: Node = {
          id,
          type: nodeData.type,
          position,
          data: nodeData.data,
        };
        
        // Add the new node to the diagram
        setNodes((nds) => nds.concat(newNode));
      } catch (error) {
        console.error('Error adding node:', error);
      }
    },
    [project, setNodes],
  );

  // Toggle the palette panel
  const togglePalette = useCallback(() => {
    setIsPaletteOpen((prev) => !prev);
  }, []);
  
  // Export diagram as JSON
  const exportDiagram = useCallback(() => {
    const diagramData = {
      nodes,
      edges,
    };
    
    try {
      const jsonString = JSON.stringify(diagramData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      // Create a temporary anchor to download the file
      const a = document.createElement('a');
      a.href = url;
      a.download = `one-line-diagram-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting diagram:', error);
    }
  }, [nodes, edges]);
  
  // Toggle between real-time and demo data
  const toggleDataSource = useCallback(() => {
    setShowDefaultDiagram(!showDefaultDiagram);
    toast({
      title: `Switched to ${!showDefaultDiagram ? 'demo' : 'real-time'} data`,
      description: `Now showing ${!showDefaultDiagram ? 'demo' : 'real-time'} energy flow data.`,
    });
  }, [showDefaultDiagram, toast]);

  // Show loading state or error
  if (isLoadingDevices || isLoadingEnergy) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center">
        <div className="space-y-4 text-center">
          <Skeleton className="h-12 w-12 rounded-full bg-primary/20 mx-auto" />
          <h3 className="text-lg font-medium">Loading energy data...</h3>
          <p className="text-muted-foreground">
            Fetching the latest information about your energy assets
          </p>
        </div>
      </div>
    );
  }

  if (devicesError || energyError) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error loading diagram data</AlertTitle>
          <AlertDescription>
            {devicesError ? 'Failed to load device information.' : 'Failed to load energy flow data.'}
            <div className="mt-2">
              <Button onClick={refreshData} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!devices || !siteEnergy) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center">
        <Alert className="max-w-md">
          <AlertTitle>No data available</AlertTitle>
          <AlertDescription>
            No energy data is available for this site. You can view a demo diagram instead.
            <div className="mt-2">
              <Button onClick={() => setShowDefaultDiagram(true)} variant="outline" size="sm">
                Show Demo Diagram
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col">
      {/* Top controls */}
      <div className="px-2 py-2 border-b bg-card">
        <div className="flex justify-between items-center">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-[400px]">
            <TabsList>
              <TabsTrigger 
                value="real-time" 
                onClick={() => setShowDefaultDiagram(false)}
              >
                Real-time Data
              </TabsTrigger>
              <TabsTrigger 
                value="demo" 
                onClick={() => setShowDefaultDiagram(true)}
              >
                Demo Diagram
              </TabsTrigger>
            </TabsList>
          </Tabs>
          
          <div className="flex items-center space-x-2">
            <Button 
              size="sm" 
              variant="outline"
              onClick={refreshData}
              disabled={isLoadingDevices || isLoadingEnergy}
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${(isLoadingDevices || isLoadingEnergy) ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            
            <Button size="sm" variant="outline" onClick={exportDiagram}>
              <Save className="h-4 w-4 mr-1" />
              Export
            </Button>
          </div>
        </div>
      </div>
      
      {/* Diagram area */}
      <div className="flex-1">
        <div 
          className="react-flow-wrapper h-full w-full" 
          ref={reactFlowWrapper}
        >
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            onDragOver={onDragOver}
            onDrop={onDrop}
            fitView
            attributionPosition="bottom-right"
            connectionLineType={ConnectionLineType.SmoothStep}
          >
            {/* Background pattern */}
            <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
            
            {/* Controls for zoom and pan */}
            <Controls />
            
            {/* Mini-map for navigation */}
            <MiniMap 
              nodeStrokeColor={(n) => {
                if (n.type === 'grid_connection') return '#3b82f6';
                if (n.type === 'transformer') return '#f59e0b';
                if (n.type === 'solar') return '#eab308';
                if (n.type === 'battery') return '#22c55e';
                if (n.type === 'ev_charger') return '#a855f7';
                return '#64748b';
              }}
              nodeColor={(n) => {
                if (n.type === 'grid_connection') return '#bfdbfe';
                if (n.type === 'transformer') return '#fef3c7';
                if (n.type === 'solar') return '#fef9c3';
                if (n.type === 'battery') return '#dcfce7';
                if (n.type === 'ev_charger') return '#f3e8ff';
                return '#f1f5f9';
              }}
              maskColor="rgba(0, 0, 0, 0.1)"
            />
            
            {/* Action Panels */}
            <Panel position="top-right" className="space-x-2">
              <Sheet>
                <SheetTrigger asChild>
                  <Button size="sm" variant="outline">
                    <Settings className="h-4 w-4 mr-1" />
                    Settings
                  </Button>
                </SheetTrigger>
                <SheetContent side="right">
                  <SheetHeader>
                    <SheetTitle>Diagram Settings</SheetTitle>
                  </SheetHeader>
                  <div className="py-4">
                    <div className="space-y-4">
                      <h3 className="text-sm font-medium">Display Options</h3>
                      <div className="grid gap-2">
                        {/* Add settings options here */}
                      </div>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
              
              <Button 
                size="sm" 
                variant="outline" 
                onClick={togglePalette}
              >
                {isPaletteOpen ? (
                  <PanelRightClose className="h-4 w-4" />
                ) : (
                  <PanelRight className="h-4 w-4" />
                )}
              </Button>
            </Panel>
            
            {/* Node Palette */}
            {isPaletteOpen && (
              <Panel position="top-left" className="bg-background p-4 border rounded-md shadow-md w-64 mt-14">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium">Component Palette</h3>
                  {!showDefaultDiagram && (
                    <Alert variant="default" className="mt-2 p-2">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle className="text-xs">Real-time Mode</AlertTitle>
                      <AlertDescription className="text-xs">
                        Components added here won't affect the real system.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
                <NodePalette setNodes={setNodes} />
              </Panel>
            )}
          </ReactFlow>
        </div>
      </div>
    </div>
  );
};

// Wrapper with ReactFlow provider
export const OneLine = () => (
  <div className="h-screen w-full">
    <ReactFlowProvider>
      <OneLineDiagram />
    </ReactFlowProvider>
  </div>
);

export default OneLine;