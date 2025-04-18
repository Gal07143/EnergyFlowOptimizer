import { useState } from 'react';
import { Battery, Cast, CircuitBoard, Car, Home, Landmark, Power, Waves, Zap } from 'lucide-react';
import { Node } from 'reactflow';

import { Button } from "@/components/ui/button";

// Node type definitions with their icons and labels
const nodeTypes = [
  { 
    type: 'grid_connection', 
    label: 'Grid Connection',
    icon: Landmark,
    data: { 
      label: 'Grid Connection',
      voltage: '22kV',
      status: 'online',
      power: 0
    }
  },
  { 
    type: 'transformer', 
    label: 'Transformer',
    icon: CircuitBoard,
    data: { 
      label: 'Transformer',
      primaryVoltage: '22kV',
      secondaryVoltage: '400V',
      rating: '500kVA',
      status: 'online',
      loading: 0.35
    }
  },
  { 
    type: 'breaker', 
    label: 'Circuit Breaker',
    icon: Power,
    data: { 
      label: 'Breaker',
      current: '100A',
      status: 'closed',
      tripSettings: { overload: '100A', shortCircuit: '500A' }
    }
  },
  { 
    type: 'bus', 
    label: 'Bus',
    icon: Waves,
    data: { 
      label: 'Bus',
      voltage: '400V',
      status: 'energized'
    }
  },
  { 
    type: 'solar', 
    label: 'Solar PV',
    icon: Zap,
    data: { 
      label: 'Solar PV',
      capacity: '50kW',
      generation: '0kW',
      status: 'idle'
    }
  },
  { 
    type: 'battery', 
    label: 'Battery Storage',
    icon: Battery,
    data: { 
      label: 'Battery Storage',
      capacity: '100kWh',
      power: '0kW',
      soc: 50,
      status: 'idle'
    }
  },
  { 
    type: 'ev_charger', 
    label: 'EV Charger',
    icon: Car,
    data: { 
      label: 'EV Charger',
      capacity: '22kW',
      power: '0kW',
      connectedVehicles: 0,
      status: 'idle'
    }
  },
  { 
    type: 'meter', 
    label: 'Meter',
    icon: Cast,
    data: { 
      label: 'Meter',
      powerImport: '0kW',
      powerExport: '0kW',
      energy: '0kWh',
      status: 'online'
    }
  },
  { 
    type: 'load', 
    label: 'Load',
    icon: Home,
    data: { 
      label: 'Load',
      power: '0kW',
      peakPower: '50kW',
      energyToday: '0kWh',
      status: 'normal'
    }
  }
];

// The actual NodePalette component
export const NodePalette = ({ 
  setNodes 
}: { 
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>
}) => {
  const [expandedCategory, setExpandedCategory] = useState<string>('');
  
  // Function to handle drag start event for a node
  const onDragStart = (event: React.DragEvent, nodeType: string, data: any) => {
    // Set the drag data
    event.dataTransfer.setData('application/reactflow', JSON.stringify({ 
      type: nodeType,
      data
    }));
    event.dataTransfer.effectAllowed = 'move';
  };

  // Function to add a node to the diagram
  const addNode = (nodeType: string, data: any) => {
    // Generate a new node ID
    const id = `${nodeType}-${Date.now()}`;
    
    // Add the node to the diagram
    setNodes((nds) => nds.concat({
      id,
      type: nodeType,
      position: {
        x: Math.random() * 300 + 50,
        y: Math.random() * 300 + 50,
      },
      data
    }));
  };
  
  // Toggle category expansion
  const toggleCategory = (category: string) => {
    if (expandedCategory === category) {
      setExpandedCategory('');
    } else {
      setExpandedCategory(category);
    }
  };

  // Component rendering
  return (
    <div className="flex flex-col gap-2">
      <div className="text-sm text-muted-foreground">
        Drag and drop or click to add
      </div>
      
      {/* List of node types */}
      <div className="space-y-2">
        {nodeTypes.map((nodeType) => {
          const Icon = nodeType.icon;
          
          return (
            <div
              key={nodeType.type}
              draggable
              onDragStart={(event) => onDragStart(event, nodeType.type, nodeType.data)}
              onClick={() => addNode(nodeType.type, nodeType.data)}
              className="cursor-pointer rounded-md border p-2 hover:bg-accent flex items-center gap-2 transition"
            >
              <Icon className="h-5 w-5 text-foreground" />
              <span className="text-sm">{nodeType.label}</span>
            </div>
          );
        })}
      </div>
      
      {/* Additional options */}
      <div className="mt-4">
        <Button 
          variant="outline" 
          size="sm"
          className="w-full"
          onClick={() => {
            // Clear nodes if any are selected
          }}
        >
          Remove Selected
        </Button>
      </div>
    </div>
  );
};