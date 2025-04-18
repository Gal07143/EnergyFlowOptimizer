import { useCallback, useRef, useState } from 'react';
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
import { Settings, Layers, Save, Search, ArrowUpCircle, CircleDot, PanelRightClose, PanelRight } from 'lucide-react';

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

// Main OneLine Diagram component
const OneLineDiagram = () => {
  // State for nodes and edges
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  
  // State for panel visibility
  const [isPaletteOpen, setIsPaletteOpen] = useState(true);
  
  // Reference to reactflow instance
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const connectingNodeId = useRef<string | null>(null);
  const { project } = useReactFlow();
  
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
  
  return (
    <div className="h-full w-full">
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
            <Button size="sm" variant="outline" onClick={exportDiagram}>
              <Save className="h-4 w-4 mr-1" />
              Export
            </Button>
            
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
            <Panel position="top-left" className="bg-background p-4 border rounded-md shadow-md w-64">
              <h3 className="font-medium mb-2">Component Palette</h3>
              <NodePalette setNodes={setNodes} />
            </Panel>
          )}
        </ReactFlow>
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