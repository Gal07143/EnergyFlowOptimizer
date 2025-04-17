import { FC, memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { 
  Zap, 
  Server, 
  Box, 
  ToggleLeft, 
  Battery, 
  Gauge, 
  Plug, 
  PanelLeft, 
  CircuitBoard, 
  Cpu,
  Lightbulb,
  Car,
  Activity
} from 'lucide-react';
import { Badge } from "@/components/ui/badge";

interface ElectricalNodeProps extends NodeProps {
  data: {
    label: string;
    type: string;
    properties?: any;
  };
}

// Styles for each node type
const nodeStyles: Record<string, any> = {
  main_grid: {
    icon: Zap,
    bg: "bg-blue-100 dark:bg-blue-900",
    border: "border-blue-500",
  },
  generator: {
    icon: Gauge,
    bg: "bg-amber-100 dark:bg-amber-900",
    border: "border-amber-500",
  },
  lv_panel: {
    icon: PanelLeft,
    bg: "bg-slate-100 dark:bg-slate-900",
    border: "border-slate-500",
  },
  hv_panel: {
    icon: PanelLeft,
    bg: "bg-slate-200 dark:bg-slate-800",
    border: "border-slate-600",
  },
  transformer: {
    icon: CircuitBoard,
    bg: "bg-purple-100 dark:bg-purple-900",
    border: "border-purple-500",
  },
  circuit_breaker: {
    icon: ToggleLeft,
    bg: "bg-red-100 dark:bg-red-900",
    border: "border-red-500",
  },
  switch: {
    icon: ToggleLeft,
    bg: "bg-orange-100 dark:bg-orange-900",
    border: "border-orange-500",
  },
  energy_meter: {
    icon: Activity,
    bg: "bg-teal-100 dark:bg-teal-900",
    border: "border-teal-500",
  },
  solar_inverter: {
    icon: Zap,
    bg: "bg-yellow-100 dark:bg-yellow-900",
    border: "border-yellow-500",
  },
  battery_inverter: {
    icon: Battery,
    bg: "bg-green-100 dark:bg-green-900",
    border: "border-green-500",
  },
  ev_charger: {
    icon: Car,
    bg: "bg-cyan-100 dark:bg-cyan-900",
    border: "border-cyan-500",
  },
  motor: {
    icon: Cpu,
    bg: "bg-indigo-100 dark:bg-indigo-900",
    border: "border-indigo-500",
  },
  load: {
    icon: Lightbulb,
    bg: "bg-pink-100 dark:bg-pink-900",
    border: "border-pink-500",
  },
  device: {
    icon: Server,
    bg: "bg-violet-100 dark:bg-violet-900",
    border: "border-violet-500",
  }
};

// Function to get a readable property to display
const getDisplayProperty = (type: string, properties: any): string => {
  if (!properties) return '';
  
  switch (type) {
    case 'main_grid':
      return properties.voltage ? `${properties.voltage}V` : '';
    case 'generator':
      return properties.capacity ? `${properties.capacity}kW` : '';
    case 'lv_panel':
    case 'hv_panel':
      return properties.capacity ? `${properties.capacity}A` : '';
    case 'transformer':
      return properties.capacity ? `${properties.capacity}kVA` : '';
    case 'circuit_breaker':
      return properties.rating ? `${properties.rating}A` : '';
    case 'switch':
      return properties.state !== undefined ? (properties.state ? 'Closed' : 'Open') : '';
    case 'energy_meter':
      return properties.direction || '';
    case 'solar_inverter':
      return properties.capacity ? `${properties.capacity}kW` : '';
    case 'battery_inverter':
      return properties.capacity ? `${properties.capacity}kW` : '';
    case 'ev_charger':
      return properties.power ? `${properties.power}kW` : '';
    case 'motor':
      return properties.power ? `${properties.power}kW` : '';
    case 'load':
      return properties.power ? `${properties.power}kW` : '';
    case 'device':
      return properties.deviceId ? `ID: ${properties.deviceId}` : '';
    default:
      return '';
  }
};

const ElectricalNodeRenderer: FC<ElectricalNodeProps> = ({ data, selected }) => {
  const nodeType = data.type || 'main_grid';
  const style = nodeStyles[nodeType] || nodeStyles.main_grid;
  const Icon = style.icon;
  const displayProperty = getDisplayProperty(nodeType, data.properties);
  
  return (
    <div 
      className={`relative p-3 rounded-md border-2 w-[180px] ${style.bg} ${style.border} ${selected ? 'ring-2 ring-primary' : ''}`}
    >
      <Handle type="target" position={Position.Top} className="w-3 h-3" />
      
      <div className="flex items-center">
        <div className="p-2 rounded-full bg-white dark:bg-slate-800 mr-2">
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <div className="font-medium text-sm truncate">{data.label}</div>
          {displayProperty && (
            <Badge variant="outline" className="mt-1 text-xs">
              {displayProperty}
            </Badge>
          )}
        </div>
      </div>
      
      <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
    </div>
  );
};

export default memo(ElectricalNodeRenderer);