import { memo } from 'react';
import { Handle, NodeProps, Position } from 'reactflow';
import {
  Activity,
  AlertTriangle,
  Battery,
  BatteryCharging,
  BatteryMedium,
  Bolt,
  Cast,
  CircuitBoard,
  Car,
  Home,
  Landmark,
  Lightbulb,
  Pause,
  Play,
  Power,
  Plug,
  Waves,
  X,
  Zap
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// Base Node Component with common styling and handles
const BaseNode = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => {
  return (
    <div className={`relative ${className}`}>
      <Handle type="target" position={Position.Left} className="w-3 h-3" />
      {children}
      <Handle type="source" position={Position.Right} className="w-3 h-3" />
    </div>
  );
};

// Status Badge component
const StatusBadge = ({ status }: { status: string }) => {
  let variant: 'default' | 'destructive' | 'outline' | 'secondary' = 'outline';
  
  if (['online', 'generating', 'charging', 'energized', 'closed'].includes(status)) {
    variant = 'default';
  } else if (['offline', 'error', 'faulted', 'tripped', 'open'].includes(status)) {
    variant = 'destructive';
  } else if (['standby', 'idle', 'discharging'].includes(status)) {
    variant = 'secondary';
  }
  
  return (
    <Badge variant={variant} className="text-xs">
      {status}
    </Badge>
  );
};

// Grid Connection Node
export const GridConnectionNode = memo(({ data }: NodeProps) => {
  return (
    <BaseNode>
      <Card className="min-w-60 bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
        <CardHeader className="p-3 pb-0">
          <div className="flex justify-between items-center">
            <CardTitle className="text-md flex gap-1 items-center">
              <Landmark className="h-5 w-5 text-blue-600" />
              <span>{data.label}</span>
            </CardTitle>
            <StatusBadge status={data.status} />
          </div>
        </CardHeader>
        <CardContent className="p-3 space-y-1">
          <div className="text-sm font-medium text-blue-700">
            Voltage: {data.voltage}
          </div>
          <div className="text-sm">
            Power: {Math.abs(data.power)}kW {data.power > 0 ? 'Import' : 'Export'}
          </div>
        </CardContent>
      </Card>
    </BaseNode>
  );
});

// Transformer Node
export const TransformerNode = memo(({ data }: NodeProps) => {
  return (
    <BaseNode>
      <Card className="min-w-60 bg-gradient-to-r from-amber-50 to-amber-100 border-amber-200">
        <CardHeader className="p-3 pb-0">
          <div className="flex justify-between items-center">
            <CardTitle className="text-md flex gap-1 items-center">
              <CircuitBoard className="h-5 w-5 text-amber-600" />
              <span>{data.label}</span>
            </CardTitle>
            <StatusBadge status={data.status} />
          </div>
        </CardHeader>
        <CardContent className="p-3 space-y-1">
          <div className="text-sm">
            <span className="font-medium text-amber-700">Primary:</span> {data.primaryVoltage}
          </div>
          <div className="text-sm">
            <span className="font-medium text-amber-700">Secondary:</span> {data.secondaryVoltage}
          </div>
          <div className="text-sm">
            <span className="font-medium text-amber-700">Rating:</span> {data.rating}
          </div>
          <div className="text-sm">
            <span className="font-medium text-amber-700">Loading:</span> {(data.loading * 100).toFixed(0)}%
          </div>
        </CardContent>
      </Card>
    </BaseNode>
  );
});

// Breaker Node
export const BreakerNode = memo(({ data }: NodeProps) => {
  return (
    <BaseNode>
      <Card className="min-w-52 bg-gradient-to-r from-slate-50 to-slate-100 border-slate-200">
        <CardHeader className="p-3 pb-0">
          <div className="flex justify-between items-center">
            <CardTitle className="text-md flex gap-1 items-center">
              <Power className={`h-5 w-5 ${data.status === 'closed' ? 'text-green-600' : 'text-red-600'}`} />
              <span>{data.label}</span>
            </CardTitle>
            <StatusBadge status={data.status} />
          </div>
        </CardHeader>
        <CardContent className="p-3 space-y-1">
          <div className="text-sm">
            <span className="font-medium text-slate-700">Current:</span> {data.current}
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="text-sm font-medium text-slate-600 flex items-center gap-1">
                  <span>Trip settings</span>
                  <Activity className="h-3 w-3" />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-xs">
                  <div>Overload: {data.tripSettings.overload}</div>
                  <div>Short Circuit: {data.tripSettings.shortCircuit}</div>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardContent>
      </Card>
    </BaseNode>
  );
});

// Bus Node
export const BusNode = memo(({ data }: NodeProps) => {
  return (
    <BaseNode className="flex justify-center">
      <div className="h-12 bg-gray-800 rounded-md flex items-center justify-center px-4 text-white min-w-full">
        <div className="flex items-center gap-2">
          <Waves className="h-5 w-5" />
          <div className="flex flex-col">
            <span className="text-sm font-medium">{data.label}</span>
            <span className="text-xs">{data.voltage} • {data.status}</span>
          </div>
        </div>
      </div>
    </BaseNode>
  );
});

// Solar Node
export const SolarNode = memo(({ data }: NodeProps) => {
  const StatusIcon = data.status === 'generating' ? Zap : Pause;
  
  return (
    <BaseNode>
      <Card className="min-w-60 bg-gradient-to-r from-yellow-50 to-yellow-100 border-yellow-200">
        <CardHeader className="p-3 pb-0">
          <div className="flex justify-between items-center">
            <CardTitle className="text-md flex gap-1 items-center">
              <Zap className="h-5 w-5 text-yellow-600" />
              <span>{data.label}</span>
            </CardTitle>
            <StatusBadge status={data.status} />
          </div>
        </CardHeader>
        <CardContent className="p-3 space-y-1">
          <div className="text-sm">
            <span className="font-medium text-yellow-700">Capacity:</span> {data.capacity}
          </div>
          <div className="flex items-center gap-1 text-sm">
            <span className="font-medium text-yellow-700">Generation:</span> {data.generation}
            <StatusIcon className="h-4 w-4 text-yellow-600" />
          </div>
        </CardContent>
      </Card>
    </BaseNode>
  );
});

// Battery Node
export const BatteryNode = memo(({ data }: NodeProps) => {
  // Choose icon based on status
  let BatteryIcon;
  if (data.status === 'charging') {
    BatteryIcon = BatteryCharging;
  } else if (data.status === 'discharging') {
    BatteryIcon = Battery;
  } else {
    BatteryIcon = BatteryMedium;
  }
  
  return (
    <BaseNode>
      <Card className="min-w-60 bg-gradient-to-r from-green-50 to-green-100 border-green-200">
        <CardHeader className="p-3 pb-0">
          <div className="flex justify-between items-center">
            <CardTitle className="text-md flex gap-1 items-center">
              <BatteryIcon className="h-5 w-5 text-green-600" />
              <span>{data.label}</span>
            </CardTitle>
            <StatusBadge status={data.status} />
          </div>
        </CardHeader>
        <CardContent className="p-3 space-y-1">
          <div className="text-sm">
            <span className="font-medium text-green-700">Capacity:</span> {data.capacity}
          </div>
          <div className="text-sm">
            <span className="font-medium text-green-700">Power:</span> {data.power}
          </div>
          <div className="flex flex-col">
            <div className="flex justify-between text-xs mb-1">
              <span className="font-medium text-green-700">SoC: {data.soc}%</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-green-600 rounded-full"
                style={{ width: `${data.soc}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </BaseNode>
  );
});

// EV Charger Node
export const EVChargerNode = memo(({ data }: NodeProps) => {
  const StatusIcon = data.status === 'charging' ? Play : Pause;
  
  return (
    <BaseNode>
      <Card className="min-w-60 bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200">
        <CardHeader className="p-3 pb-0">
          <div className="flex justify-between items-center">
            <CardTitle className="text-md flex gap-1 items-center">
              <Car className="h-5 w-5 text-purple-600" />
              <span>{data.label}</span>
            </CardTitle>
            <StatusBadge status={data.status} />
          </div>
        </CardHeader>
        <CardContent className="p-3 space-y-1">
          <div className="text-sm">
            <span className="font-medium text-purple-700">Capacity:</span> {data.capacity}
          </div>
          <div className="flex items-center gap-1 text-sm">
            <span className="font-medium text-purple-700">Power:</span> {data.power}
            <StatusIcon className="h-4 w-4 text-purple-600" />
          </div>
          <div className="text-sm">
            <span className="font-medium text-purple-700">Connected:</span> {data.connectedVehicles} vehicle{data.connectedVehicles !== 1 ? 's' : ''}
          </div>
        </CardContent>
      </Card>
    </BaseNode>
  );
});

// Meter Node
export const MeterNode = memo(({ data }: NodeProps) => {
  return (
    <BaseNode>
      <Card className="min-w-60 bg-gradient-to-r from-indigo-50 to-indigo-100 border-indigo-200">
        <CardHeader className="p-3 pb-0">
          <div className="flex justify-between items-center">
            <CardTitle className="text-md flex gap-1 items-center">
              <Cast className="h-5 w-5 text-indigo-600" />
              <span>{data.label}</span>
            </CardTitle>
            <StatusBadge status={data.status} />
          </div>
        </CardHeader>
        <CardContent className="p-3 space-y-1">
          <div className="flex items-center gap-1 text-sm">
            <span className="font-medium text-indigo-700">Import:</span> {data.powerImport}
            <Plug className="h-4 w-4 text-indigo-600" />
          </div>
          <div className="flex items-center gap-1 text-sm">
            <span className="font-medium text-indigo-700">Export:</span> {data.powerExport}
            <Bolt className="h-4 w-4 text-indigo-600" />
          </div>
          <div className="text-sm">
            <span className="font-medium text-indigo-700">Total:</span> {data.energy}
          </div>
        </CardContent>
      </Card>
    </BaseNode>
  );
});

// Load Node
export const LoadNode = memo(({ data }: NodeProps) => {
  const isHighLoad = parseFloat(data.power) > parseFloat(data.peakPower) * 0.8;
  
  return (
    <BaseNode>
      <Card className="min-w-60 bg-gradient-to-r from-red-50 to-red-100 border-red-200">
        <CardHeader className="p-3 pb-0">
          <div className="flex justify-between items-center">
            <CardTitle className="text-md flex gap-1 items-center">
              <Home className="h-5 w-5 text-red-600" />
              <span>{data.label}</span>
            </CardTitle>
            <div className="flex items-center gap-1">
              {isHighLoad && <AlertTriangle className="h-4 w-4 text-amber-500" />}
              <StatusBadge status={data.status} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-3 space-y-1">
          <div className="flex items-center gap-1 text-sm">
            <span className="font-medium text-red-700">Power:</span> {data.power}
            <Lightbulb className="h-4 w-4 text-red-600" />
          </div>
          <div className="text-sm">
            <span className="font-medium text-red-700">Peak:</span> {data.peakPower}
          </div>
          <div className="text-sm">
            <span className="font-medium text-red-700">Today:</span> {data.energyToday}
          </div>
        </CardContent>
      </Card>
    </BaseNode>
  );
});