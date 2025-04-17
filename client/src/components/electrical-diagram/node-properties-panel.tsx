import { FC, useState, useEffect } from 'react';
import { Node } from 'reactflow';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { X, Save, Trash2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

interface NodePropertiesPanelProps {
  node: Node;
  onUpdate: (nodeId: string, properties: any) => void;
  onDelete: () => void;
  onClose: () => void;
}

// Type-specific property editors
const renderPropertyFields = (
  type: string, 
  properties: any, 
  setProperties: (props: any) => void
) => {
  switch (type) {
    case 'main_grid':
      return (
        <>
          <div className="space-y-2">
            <Label htmlFor="voltage">Voltage (V)</Label>
            <Input
              id="voltage"
              type="number"
              value={properties.voltage || ''}
              onChange={(e) => 
                setProperties({ ...properties, voltage: parseFloat(e.target.value) || 0 })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="maxSupply">Max Supply (kW)</Label>
            <Input
              id="maxSupply"
              type="number"
              value={properties.maxSupply || ''}
              onChange={(e) => 
                setProperties({ ...properties, maxSupply: parseFloat(e.target.value) || 0 })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="provider">Provider</Label>
            <Input
              id="provider"
              value={properties.provider || ''}
              onChange={(e) => 
                setProperties({ ...properties, provider: e.target.value })
              }
            />
          </div>
        </>
      );
    
    case 'generator':
      return (
        <>
          <div className="space-y-2">
            <Label htmlFor="capacity">Capacity (kW)</Label>
            <Input
              id="capacity"
              type="number"
              value={properties.capacity || ''}
              onChange={(e) => 
                setProperties({ ...properties, capacity: parseFloat(e.target.value) || 0 })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fuel">Fuel Type</Label>
            <Select
              value={properties.fuel || ''}
              onValueChange={(value) => setProperties({ ...properties, fuel: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select fuel type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="diesel">Diesel</SelectItem>
                <SelectItem value="gas">Natural Gas</SelectItem>
                <SelectItem value="petrol">Petrol</SelectItem>
                <SelectItem value="hydrogen">Hydrogen</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="efficiency">Efficiency (%)</Label>
            <Input
              id="efficiency"
              type="number"
              min="0"
              max="100"
              value={properties.efficiency || ''}
              onChange={(e) => 
                setProperties({ ...properties, efficiency: parseFloat(e.target.value) || 0 })
              }
            />
          </div>
        </>
      );
    
    case 'lv_panel':
    case 'hv_panel':
      return (
        <>
          <div className="space-y-2">
            <Label htmlFor="voltage">Voltage {type === 'hv_panel' ? '(kV)' : '(V)'}</Label>
            <Input
              id="voltage"
              type="number"
              value={properties.voltage || ''}
              onChange={(e) => 
                setProperties({ ...properties, voltage: parseFloat(e.target.value) || 0 })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="capacity">Capacity (A)</Label>
            <Input
              id="capacity"
              type="number"
              value={properties.capacity || ''}
              onChange={(e) => 
                setProperties({ ...properties, capacity: parseFloat(e.target.value) || 0 })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phases">Phases</Label>
            <Select
              value={(properties.phases || '').toString()}
              onValueChange={(value) => setProperties({ ...properties, phases: parseInt(value) || 1 })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select number of phases" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1-Phase</SelectItem>
                <SelectItem value="3">3-Phase</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              value={properties.location || ''}
              onChange={(e) => 
                setProperties({ ...properties, location: e.target.value })
              }
            />
          </div>
        </>
      );
    
    case 'transformer':
      return (
        <>
          <div className="space-y-2">
            <Label htmlFor="primaryVoltage">Primary Voltage (kV)</Label>
            <Input
              id="primaryVoltage"
              type="number"
              value={properties.primaryVoltage || ''}
              onChange={(e) => 
                setProperties({ ...properties, primaryVoltage: parseFloat(e.target.value) || 0 })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="secondaryVoltage">Secondary Voltage (V)</Label>
            <Input
              id="secondaryVoltage"
              type="number"
              value={properties.secondaryVoltage || ''}
              onChange={(e) => 
                setProperties({ ...properties, secondaryVoltage: parseFloat(e.target.value) || 0 })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="capacity">Capacity (kVA)</Label>
            <Input
              id="capacity"
              type="number"
              value={properties.capacity || ''}
              onChange={(e) => 
                setProperties({ ...properties, capacity: parseFloat(e.target.value) || 0 })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="efficiency">Efficiency (%)</Label>
            <Input
              id="efficiency"
              type="number"
              min="0"
              max="100"
              value={properties.efficiency || ''}
              onChange={(e) => 
                setProperties({ ...properties, efficiency: parseFloat(e.target.value) || 0 })
              }
            />
          </div>
        </>
      );
    
    case 'circuit_breaker':
      return (
        <>
          <div className="space-y-2">
            <Label htmlFor="rating">Rating (A)</Label>
            <Input
              id="rating"
              type="number"
              value={properties.rating || ''}
              onChange={(e) => 
                setProperties({ ...properties, rating: parseFloat(e.target.value) || 0 })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="breaking">Breaking Capacity (kA)</Label>
            <Input
              id="breaking"
              type="number"
              value={properties.breaking || ''}
              onChange={(e) => 
                setProperties({ ...properties, breaking: parseFloat(e.target.value) || 0 })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="poles">Number of Poles</Label>
            <Select
              value={(properties.poles || '').toString()}
              onValueChange={(value) => setProperties({ ...properties, poles: parseInt(value) || 1 })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select number of poles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1-Pole</SelectItem>
                <SelectItem value="2">2-Pole</SelectItem>
                <SelectItem value="3">3-Pole</SelectItem>
                <SelectItem value="4">4-Pole</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </>
      );
    
    case 'switch':
      return (
        <>
          <div className="space-y-2">
            <Label htmlFor="rating">Rating (A)</Label>
            <Input
              id="rating"
              type="number"
              value={properties.rating || ''}
              onChange={(e) => 
                setProperties({ ...properties, rating: parseFloat(e.target.value) || 0 })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="type">Switch Type</Label>
            <Select
              value={properties.type || ''}
              onValueChange={(value) => setProperties({ ...properties, type: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select switch type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="isolator">Isolator</SelectItem>
                <SelectItem value="disconnect">Disconnect</SelectItem>
                <SelectItem value="transfer">Transfer</SelectItem>
                <SelectItem value="bypass">Bypass</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 flex items-center justify-between">
            <Label htmlFor="state">Switch State</Label>
            <Switch
              id="state"
              checked={properties.state || false}
              onCheckedChange={(checked) => 
                setProperties({ ...properties, state: checked })
              }
            />
            <span className="text-sm ml-2">{properties.state ? 'Closed' : 'Open'}</span>
          </div>
        </>
      );
    
    case 'energy_meter':
      return (
        <>
          <div className="space-y-2">
            <Label htmlFor="meterId">Meter ID</Label>
            <Input
              id="meterId"
              value={properties.meterId || ''}
              onChange={(e) => 
                setProperties({ ...properties, meterId: e.target.value })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="meterType">Meter Type</Label>
            <Select
              value={properties.meterType || ''}
              onValueChange={(value) => setProperties({ ...properties, meterType: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select meter type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="smart">Smart Meter</SelectItem>
                <SelectItem value="analog">Analog Meter</SelectItem>
                <SelectItem value="submeter">Sub-meter</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="direction">Energy Direction</Label>
            <Select
              value={properties.direction || ''}
              onValueChange={(value) => setProperties({ ...properties, direction: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select energy flow direction" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="import">Import</SelectItem>
                <SelectItem value="export">Export</SelectItem>
                <SelectItem value="bidirectional">Bidirectional</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </>
      );
    
    case 'solar_inverter':
      return (
        <>
          <div className="space-y-2">
            <Label htmlFor="capacity">Capacity (kW)</Label>
            <Input
              id="capacity"
              type="number"
              value={properties.capacity || ''}
              onChange={(e) => 
                setProperties({ ...properties, capacity: parseFloat(e.target.value) || 0 })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="efficiency">Efficiency (%)</Label>
            <Input
              id="efficiency"
              type="number"
              min="0"
              max="100"
              value={properties.efficiency || ''}
              onChange={(e) => 
                setProperties({ ...properties, efficiency: parseFloat(e.target.value) || 0 })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mppt">MPPT Trackers</Label>
            <Input
              id="mppt"
              type="number"
              min="1"
              value={properties.mppt || ''}
              onChange={(e) => 
                setProperties({ ...properties, mppt: parseInt(e.target.value) || 1 })
              }
            />
          </div>
        </>
      );
    
    case 'battery_inverter':
      return (
        <>
          <div className="space-y-2">
            <Label htmlFor="capacity">Inverter Capacity (kW)</Label>
            <Input
              id="capacity"
              type="number"
              value={properties.capacity || ''}
              onChange={(e) => 
                setProperties({ ...properties, capacity: parseFloat(e.target.value) || 0 })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="batteryCapacity">Battery Capacity (kWh)</Label>
            <Input
              id="batteryCapacity"
              type="number"
              value={properties.batteryCapacity || ''}
              onChange={(e) => 
                setProperties({ ...properties, batteryCapacity: parseFloat(e.target.value) || 0 })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="efficiency">Efficiency (%)</Label>
            <Input
              id="efficiency"
              type="number"
              min="0"
              max="100"
              value={properties.efficiency || ''}
              onChange={(e) => 
                setProperties({ ...properties, efficiency: parseFloat(e.target.value) || 0 })
              }
            />
          </div>
        </>
      );
    
    case 'ev_charger':
      return (
        <>
          <div className="space-y-2">
            <Label htmlFor="power">Power (kW)</Label>
            <Input
              id="power"
              type="number"
              value={properties.power || ''}
              onChange={(e) => 
                setProperties({ ...properties, power: parseFloat(e.target.value) || 0 })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="connector">Connector Type</Label>
            <Select
              value={properties.connector || ''}
              onValueChange={(value) => setProperties({ ...properties, connector: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select connector type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="type1">Type 1</SelectItem>
                <SelectItem value="type2">Type 2</SelectItem>
                <SelectItem value="chademo">CHAdeMO</SelectItem>
                <SelectItem value="ccs">CCS</SelectItem>
                <SelectItem value="tesla">Tesla</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="phases">Phases</Label>
            <Select
              value={(properties.phases || '').toString()}
              onValueChange={(value) => setProperties({ ...properties, phases: parseInt(value) || 1 })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select number of phases" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1-Phase</SelectItem>
                <SelectItem value="3">3-Phase</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </>
      );
    
    case 'motor':
      return (
        <>
          <div className="space-y-2">
            <Label htmlFor="power">Power (kW)</Label>
            <Input
              id="power"
              type="number"
              value={properties.power || ''}
              onChange={(e) => 
                setProperties({ ...properties, power: parseFloat(e.target.value) || 0 })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="efficiency">Efficiency (%)</Label>
            <Input
              id="efficiency"
              type="number"
              min="0"
              max="100"
              value={properties.efficiency || ''}
              onChange={(e) => 
                setProperties({ ...properties, efficiency: parseFloat(e.target.value) || 0 })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="type">Motor Type</Label>
            <Select
              value={properties.type || ''}
              onValueChange={(value) => setProperties({ ...properties, type: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select motor type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="induction">Induction Motor</SelectItem>
                <SelectItem value="synchronous">Synchronous Motor</SelectItem>
                <SelectItem value="dc">DC Motor</SelectItem>
                <SelectItem value="servo">Servo Motor</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </>
      );
    
    case 'load':
      return (
        <>
          <div className="space-y-2">
            <Label htmlFor="power">Power (kW)</Label>
            <Input
              id="power"
              type="number"
              value={properties.power || ''}
              onChange={(e) => 
                setProperties({ ...properties, power: parseFloat(e.target.value) || 0 })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={properties.description || ''}
              onChange={(e) => 
                setProperties({ ...properties, description: e.target.value })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="priority">Priority (1-5)</Label>
            <Select
              value={(properties.priority || '').toString()}
              onValueChange={(value) => setProperties({ ...properties, priority: parseInt(value) || 3 })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select priority level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 - Critical</SelectItem>
                <SelectItem value="2">2 - High</SelectItem>
                <SelectItem value="3">3 - Medium</SelectItem>
                <SelectItem value="4">4 - Low</SelectItem>
                <SelectItem value="5">5 - Optional</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </>
      );
    
    case 'device':
      return (
        <>
          <div className="space-y-2">
            <Label htmlFor="deviceId">Device ID</Label>
            <Input
              id="deviceId"
              type="number"
              value={properties.deviceId || ''}
              onChange={(e) => 
                setProperties({ ...properties, deviceId: parseInt(e.target.value) || null })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="deviceType">Device Type</Label>
            <Select
              value={properties.deviceType || ''}
              onValueChange={(value) => setProperties({ ...properties, deviceType: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select device type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ev_charger">EV Charger</SelectItem>
                <SelectItem value="battery_storage">Battery Storage</SelectItem>
                <SelectItem value="solar_pv">Solar PV</SelectItem>
                <SelectItem value="heat_pump">Heat Pump</SelectItem>
                <SelectItem value="smart_meter">Smart Meter</SelectItem>
                <SelectItem value="inverter">Inverter</SelectItem>
                <SelectItem value="load_controller">Load Controller</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </>
      );
    
    default:
      return (
        <div>No properties available for this node type.</div>
      );
  }
};

export const NodePropertiesPanel: FC<NodePropertiesPanelProps> = ({
  node,
  onUpdate,
  onDelete,
  onClose,
}) => {
  const [nodeName, setNodeName] = useState<string>(node.data.label || '');
  const [properties, setProperties] = useState<any>(node.data.properties || {});

  useEffect(() => {
    setNodeName(node.data.label || '');
    setProperties(node.data.properties || {});
  }, [node]);

  const handleSave = () => {
    // Update node data with new label and properties
    onUpdate(node.id, properties);
    
    // Also update the node label if it's changed
    if (nodeName !== node.data.label) {
      node.data.label = nodeName;
    }
  };

  return (
    <Card className="w-[320px] border-l rounded-none h-full overflow-y-auto">
      <CardHeader className="sticky top-0 bg-background z-10 pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-md">Component Properties</CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <CardDescription>
          Configure {node.type?.replace('_', ' ')} settings
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="nodeName">Name</Label>
          <Input
            id="nodeName"
            value={nodeName}
            onChange={(e) => setNodeName(e.target.value)}
          />
        </div>
        
        {renderPropertyFields(node.type as string, properties, setProperties)}
      </CardContent>
      <CardFooter className="border-t sticky bottom-0 bg-background pt-2 pb-2 flex justify-between items-center">
        <Button variant="destructive" size="sm" onClick={onDelete}>
          <Trash2 className="h-4 w-4 mr-2" />
          Delete
        </Button>
        <Button size="sm" onClick={handleSave}>
          <Save className="h-4 w-4 mr-2" />
          Apply
        </Button>
      </CardFooter>
    </Card>
  );
};