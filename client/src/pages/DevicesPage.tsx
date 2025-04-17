import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { 
  PlugZap, 
  Battery, 
  Zap, 
  SunIcon, 
  Thermometer, 
  Laptop, 
  MoreVertical, 
  RefreshCw, 
  Plus, 
  Trash, 
  Settings, 
  AlertCircle,
  CheckCircle,
  Activity
} from 'lucide-react';
import { useDevicesBySite } from '@/hooks/useDevice';
import { useSiteContext } from '@/hooks/use-site-context';
import { useToast } from '@/hooks/use-toast';
import DeviceDetailPanel from '@/components/devices/DeviceDetailPanel';

export default function DevicesPage() {
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddDeviceDialog, setShowAddDeviceDialog] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<number | null>(null);
  const { currentSiteId, sites } = useSiteContext();
  const { data: devices = [], isLoading, refetch } = useDevicesBySite(currentSiteId || undefined);
  const { toast } = useToast();

  // Handle device filter by type
  const filteredDevices = devices.filter(device => {
    // Filter by search term
    const matchesSearch = 
      !searchTerm || 
      device.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      device.type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      device.location?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Filter by device type tab
    const matchesType = 
      activeTab === 'all' || 
      (activeTab === 'solar' && device.type?.includes('solar')) ||
      (activeTab === 'battery' && device.type?.includes('battery')) ||
      (activeTab === 'evCharger' && device.type?.includes('ev')) ||
      (activeTab === 'heatPump' && device.type?.includes('heat')) ||
      (activeTab === 'meter' && device.type?.includes('meter')) ||
      (activeTab === 'other' && !['solar', 'battery', 'ev', 'heat', 'meter'].some(t => device.type?.includes(t)));
      
    return matchesSearch && matchesType;
  });

  // Get device icon based on type
  const getDeviceIcon = (type?: string) => {
    if (!type) return <Laptop className="h-5 w-5 text-gray-500" />;
    
    if (type.includes('solar')) return <SunIcon className="h-5 w-5 text-yellow-500" />;
    if (type.includes('battery')) return <Battery className="h-5 w-5 text-green-500" />;
    if (type.includes('ev')) return <PlugZap className="h-5 w-5 text-blue-500" />;
    if (type.includes('heat')) return <Thermometer className="h-5 w-5 text-red-500" />;
    if (type.includes('meter')) return <Activity className="h-5 w-5 text-purple-500" />;
    
    return <Laptop className="h-5 w-5 text-gray-500" />;
  };

  // Get status badge for device
  const getStatusBadge = (status?: string) => {
    if (!status) return null;
    
    let variant: 'default' | 'secondary' | 'destructive' | 'outline' = 'outline';
    let statusDisplay = status;
    
    if (['online', 'connected', 'operational'].includes(status.toLowerCase())) {
      variant = 'default';
      statusDisplay = 'Online';
    } else if (['offline', 'disconnected', 'error'].includes(status.toLowerCase())) {
      variant = 'destructive';
      statusDisplay = 'Offline';
    } else if (['idle', 'standby'].includes(status.toLowerCase())) {
      variant = 'secondary';
      statusDisplay = 'Standby';
    }
    
    return <Badge variant={variant}>{statusDisplay}</Badge>;
  };

  // Handle device commands
  const handleDeviceCommand = (deviceId: number, command: string) => {
    toast({
      title: 'Command Sent',
      description: `${command} command sent to device ${deviceId}`,
    });
  };

  // New device form state
  const [newDevice, setNewDevice] = useState({
    name: '',
    deviceId: '',  // Added device ID field
    type: '',
    model: '',
    manufacturer: '',
    siteId: currentSiteId as number | null,  // Link to site
    location: '',
    ipAddress: '',
    capacity: '',
    protocol: 'modbus',
    deviceCatalogId: null as number | null,
    // Type-specific fields
    // For EV Chargers
    chargingPower: '',
    connectorType: '',
    // For Battery Storage
    batteryCycles: '',
    depthOfDischarge: '',
    // For Solar PV
    panelCount: '',
    orientation: '',
    tilt: '',
    // For Heat Pumps
    heatingCapacity: '',
    coolingCapacity: '',
    cop: '',
    // For Smart Meters
    meterType: '',
    measurementPoints: '',
  });
  
  // State for available device models
  const [availableModels, setAvailableModels] = useState<Array<{
    id: number, 
    name: string, 
    modelNumber: string, 
    capacity: number,
    supportedProtocols?: string[]
  }>>([]);
  const [manufacturers, setManufacturers] = useState<Array<{id: number, name: string}>>([]);

  // Fetch manufacturers on mount
  useEffect(() => {
    fetch('/api/device-manufacturers')
      .then(response => response.json())
      .then(data => setManufacturers(data))
      .catch(error => console.error('Error fetching manufacturers:', error));
  }, []);
  
  // Fetch device models when manufacturer changes
  const fetchDeviceModels = async (manufacturerId: string) => {
    try {
      const response = await fetch(`/api/device-catalog?manufacturer=${manufacturerId}&type=${newDevice.type}`);
      if (response.ok) {
        const data = await response.json();
        setAvailableModels(data);
      } else {
        setAvailableModels([]);
      }
    } catch (error) {
      console.error('Error fetching device models:', error);
      setAvailableModels([]);
    }
  };
  
  // Handle new device form input change
  const handleNewDeviceChange = (field: string, value: string) => {
    setNewDevice({
      ...newDevice,
      [field]: value,
    });
    
    // If manufacturer changes, fetch available models
    if (field === 'manufacturer') {
      fetchDeviceModels(value);
    }
    
    // If type changes and manufacturer is selected, fetch filtered models
    if (field === 'type' && newDevice.manufacturer) {
      fetchDeviceModels(newDevice.manufacturer);
    }
  };
  
  // Handle model selection
  const handleModelSelect = (modelId: string) => {
    // Find the selected model from available models
    const selectedModel = availableModels.find(model => model.id === parseInt(modelId));
    
    if (selectedModel) {
      // Get default protocol - prefer modbus_tcp, modbus, or first available protocol
      const supportedProtocols = selectedModel.supportedProtocols || [];
      let defaultProtocol = newDevice.protocol;
      
      if (supportedProtocols.length > 0) {
        if (supportedProtocols.includes('modbus_tcp')) {
          defaultProtocol = 'modbus_tcp';
        } else if (supportedProtocols.includes('modbus')) {
          defaultProtocol = 'modbus';
        } else {
          defaultProtocol = supportedProtocols[0];
        }
      }
      
      setNewDevice({
        ...newDevice,
        deviceCatalogId: selectedModel.id,
        model: selectedModel.modelNumber,
        capacity: selectedModel.capacity.toString(),
        protocol: defaultProtocol,
      });
    }
  };
  
  // Handle add new device
  const handleAddDevice = () => {
    // Validation
    if (!newDevice.name || !newDevice.type) {
      toast({
        title: 'Required Fields Missing',
        description: 'Please fill in all required fields.',
        variant: 'destructive',
      });
      return;
    }
    
    // Convert capacity to number
    const capacity = newDevice.capacity ? parseFloat(newDevice.capacity) : 0;
    
    // In a real app, this would call an API to create the device
    const deviceData = {
      ...newDevice,
      siteId: currentSiteId,
      capacity,
      status: 'offline',
    };
    
    console.log('Creating new device:', deviceData);
    
    toast({
      title: 'Device Added',
      description: `${newDevice.name} has been added to the system.`,
      variant: 'default',
    });
    
    // Clear form and close dialog
    setNewDevice({
      name: '',
      deviceId: '',
      type: '',
      model: '',
      manufacturer: '',
      siteId: currentSiteId as number | null,
      location: '',
      ipAddress: '',
      capacity: '',
      protocol: 'modbus',
      deviceCatalogId: null,
      // Reset type-specific fields
      chargingPower: '',
      connectorType: '',
      batteryCycles: '',
      depthOfDischarge: '',
      panelCount: '',
      orientation: '',
      tilt: '',
      heatingCapacity: '',
      coolingCapacity: '',
      cop: '',
      meterType: '',
      measurementPoints: '',
    });
    setShowAddDeviceDialog(false);
    
    // Refetch devices to update the list
    setTimeout(() => refetch(), 500);
  };

  // Handle device click to show details
  const handleDeviceClick = (deviceId: number) => {
    setSelectedDevice(deviceId);
  };

  // Handle closing device details panel
  const handleCloseDetails = () => {
    setSelectedDevice(null);
  };

  return (
    <div className="container py-6 px-4">
      <div className="flex flex-col space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-2 md:space-y-0">
          <div>
            <h1 className="text-3xl font-bold">Devices</h1>
            <p className="text-muted-foreground">Manage and monitor all your connected energy devices</p>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button size="sm" onClick={() => setShowAddDeviceDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Device
            </Button>
          </div>
        </div>
        
        {/* Filtering and search */}
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
          <div className="relative flex-1">
            <Input 
              placeholder="Search devices by name, type, or location..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-10"
            />
          </div>
          <Select defaultValue="status" onValueChange={() => {}}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="online">Online</SelectItem>
              <SelectItem value="offline">Offline</SelectItem>
              <SelectItem value="standby">Standby</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {/* Device type tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-7">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="solar">Solar</TabsTrigger>
            <TabsTrigger value="battery">Batteries</TabsTrigger>
            <TabsTrigger value="evCharger">EV Chargers</TabsTrigger>
            <TabsTrigger value="heatPump">Heat Pumps</TabsTrigger>
            <TabsTrigger value="meter">Meters</TabsTrigger>
            <TabsTrigger value="other">Other</TabsTrigger>
          </TabsList>
        </Tabs>
        
        {/* Render based on selected details or devices list */}
        {selectedDevice ? (
          <DeviceDetailPanel deviceId={selectedDevice} onClose={handleCloseDetails} />
        ) : (
          <>
            {/* If no devices */}
            {isLoading ? (
              <div className="flex items-center justify-center p-8">
                <RefreshCw className="h-8 w-8 animate-spin text-primary/70" />
              </div>
            ) : devices.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center p-8 text-center">
                  <AlertCircle className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Devices Found</h3>
                  <p className="text-muted-foreground mb-4">
                    You don't have any devices connected to this site yet.
                  </p>
                  <Button onClick={() => setShowAddDeviceDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Device
                  </Button>
                </CardContent>
              </Card>
            ) : filteredDevices.length === 0 ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>No matching devices</AlertTitle>
                <AlertDescription>
                  No devices match your current search or filter criteria. Try adjusting your search or filters.
                </AlertDescription>
              </Alert>
            ) : (
              <>
                {/* Device cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredDevices.map((device) => (
                    <Card 
                      key={device.id} 
                      className="cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => handleDeviceClick(device.id)}
                    >
                      <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                        <div className="flex items-center space-x-2">
                          {getDeviceIcon(device.type)}
                          <div>
                            <CardTitle className="text-base">{device.name}</CardTitle>
                            <CardDescription>{device.type}</CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {getStatusBadge(device.status)}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}>
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDeviceCommand(device.id, 'restart'); }}>
                                <RefreshCw className="mr-2 h-4 w-4" />
                                <span>Restart</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDeviceCommand(device.id, 'configure'); }}>
                                <Settings className="mr-2 h-4 w-4" />
                                <span>Configure</span>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                className="text-destructive"
                                onClick={(e) => { e.stopPropagation(); handleDeviceCommand(device.id, 'delete'); }}
                              >
                                <Trash className="mr-2 h-4 w-4" />
                                <span>Delete</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 text-sm">
                          <div className="flex flex-col space-y-2">
                            <div className="text-muted-foreground">Location</div>
                            <div>{device.location || 'Not specified'}</div>
                          </div>
                          <div className="flex flex-col space-y-2">
                            <div className="text-muted-foreground">Capacity</div>
                            <div>{device.capacity ? `${device.capacity} ${device.type?.includes('battery') ? 'kWh' : 'kW'}` : 'N/A'}</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            )}
          </>
        )}
        
        {/* Add device dialog */}
        <Dialog open={showAddDeviceDialog} onOpenChange={setShowAddDeviceDialog}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Add New Device</DialogTitle>
              <DialogDescription>
                Enter the details of the device you would like to add to your system.
              </DialogDescription>
            </DialogHeader>
            
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="basic">Basic Information</TabsTrigger>
                <TabsTrigger value="connection">Connection</TabsTrigger>
                <TabsTrigger value="technical">Technical Specs</TabsTrigger>
              </TabsList>
              
              <TabsContent value="basic" className="space-y-4 py-4">
                <div className="flex items-center space-x-2 text-sm">
                  <div className="h-4 w-4 rounded-full bg-primary"></div>
                  <p className="font-medium">Step 1: Basic Device Information</p>
                </div>
                
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="device-name">Device Name <span className="text-destructive">*</span></Label>
                    <Input 
                      id="device-name" 
                      placeholder="Enter device name" 
                      value={newDevice.name}
                      onChange={(e) => handleNewDeviceChange('name', e.target.value)}
                    />
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="device-id">Device ID <span className="text-destructive">*</span></Label>
                    <Input 
                      id="device-id" 
                      placeholder="Enter unique device ID for connection" 
                      value={newDevice.deviceId}
                      onChange={(e) => handleNewDeviceChange('deviceId', e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      This ID is used by the device to identify itself when connecting to the system
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="device-type">Device Type <span className="text-destructive">*</span></Label>
                      <Select 
                        value={newDevice.type}
                        onValueChange={(value) => handleNewDeviceChange('type', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select device type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="solar_pv">Solar PV</SelectItem>
                          <SelectItem value="battery_storage">Battery Storage</SelectItem>
                          <SelectItem value="ev_charger">EV Charger</SelectItem>
                          <SelectItem value="heat_pump">Heat Pump</SelectItem>
                          <SelectItem value="smart_meter">Smart Meter</SelectItem>
                          <SelectItem value="inverter">Inverter</SelectItem>
                          <SelectItem value="load_controller">Load Controller</SelectItem>
                          <SelectItem value="energy_gateway">Energy Gateway</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="grid gap-2">
                      <Label htmlFor="device-location">Location</Label>
                      <Input 
                        id="device-location" 
                        placeholder="e.g. Garage, Roof" 
                        value={newDevice.location}
                        onChange={(e) => handleNewDeviceChange('location', e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="device-manufacturer">Manufacturer</Label>
                      <Select 
                        value={newDevice.manufacturer}
                        onValueChange={(value) => handleNewDeviceChange('manufacturer', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select manufacturer" />
                        </SelectTrigger>
                        <SelectContent>
                          {manufacturers.map(manufacturer => (
                            <SelectItem key={manufacturer.id} value={manufacturer.id.toString()}>
                              {manufacturer.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="grid gap-2">
                      <Label htmlFor="device-model">Model</Label>
                      <Select 
                        value={newDevice.deviceCatalogId?.toString() || ''}
                        onValueChange={(value) => handleModelSelect(value)}
                        disabled={availableModels.length === 0 || !newDevice.manufacturer}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={!newDevice.manufacturer ? "Select manufacturer first" : availableModels.length === 0 ? "No models available" : "Select model"} />
                        </SelectTrigger>
                        <SelectContent>
                          {availableModels.map(model => (
                            <SelectItem key={model.id} value={model.id.toString()}>
                              {model.name} ({model.modelNumber})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {availableModels.length === 0 && newDevice.manufacturer && newDevice.type && (
                        <p className="text-xs text-amber-500">
                          No models found for this manufacturer and device type.
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="device-capacity">Capacity (kW/kWh)</Label>
                    <Input 
                      id="device-capacity" 
                      placeholder="Enter capacity" 
                      value={newDevice.capacity}
                      onChange={(e) => handleNewDeviceChange('capacity', e.target.value)}
                    />
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="connection" className="space-y-4 py-4">
                <div className="flex items-center space-x-2 text-sm">
                  <div className="h-4 w-4 rounded-full bg-primary"></div>
                  <p className="font-medium">Step 2: Connection Settings</p>
                </div>
                
                <div className="grid gap-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="device-protocol">Communication Protocol</Label>
                      <Select 
                        value={newDevice.protocol}
                        onValueChange={(value) => handleNewDeviceChange('protocol', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select protocol" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="modbus">Modbus RTU</SelectItem>
                          <SelectItem value="modbus_tcp">Modbus TCP</SelectItem>
                          <SelectItem value="sunspec">SunSpec</SelectItem>
                          <SelectItem value="ocpp">OCPP</SelectItem>
                          <SelectItem value="mqtt">MQTT</SelectItem>
                          <SelectItem value="http">HTTP/REST</SelectItem>
                          <SelectItem value="eebus">EEBus</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="device-ip">IP Address/Serial Port</Label>
                      <Input 
                        id="device-ip" 
                        placeholder="e.g. 192.168.1.100 or COM3" 
                        value={newDevice.ipAddress}
                        onChange={(e) => handleNewDeviceChange('ipAddress', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
                
                {/* Conditional fields based on device type */}
                {newDevice.type === 'ev_charger' && (
                  <div className="mt-4 border rounded-lg p-4">
                    <h3 className="font-medium mb-2">EV Charger Specific Settings</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="charging-power">Charging Power (kW)</Label>
                        <Input 
                          id="charging-power" 
                          placeholder="e.g. 7.4, 11, 22" 
                          value={newDevice.chargingPower}
                          onChange={(e) => handleNewDeviceChange('chargingPower', e.target.value)}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="connector-type">Connector Type</Label>
                        <Select 
                          value={newDevice.connectorType}
                          onValueChange={(value) => handleNewDeviceChange('connectorType', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select connector" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="type1">Type 1 (J1772)</SelectItem>
                            <SelectItem value="type2">Type 2 (Mennekes)</SelectItem>
                            <SelectItem value="ccs1">CCS1</SelectItem>
                            <SelectItem value="ccs2">CCS2</SelectItem>
                            <SelectItem value="chademo">CHAdeMO</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                )}
                
                {newDevice.type === 'battery_storage' && (
                  <div className="mt-4 border rounded-lg p-4">
                    <h3 className="font-medium mb-2">Battery Storage Specific Settings</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="battery-cycles">Warranted Cycles</Label>
                        <Input 
                          id="battery-cycles" 
                          placeholder="e.g. 6000" 
                          value={newDevice.batteryCycles}
                          onChange={(e) => handleNewDeviceChange('batteryCycles', e.target.value)}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="depth-of-discharge">Depth of Discharge (%)</Label>
                        <Input 
                          id="depth-of-discharge" 
                          placeholder="e.g. 90" 
                          value={newDevice.depthOfDischarge}
                          onChange={(e) => handleNewDeviceChange('depthOfDischarge', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                )}
                
                {newDevice.type === 'solar_pv' && (
                  <div className="mt-4 border rounded-lg p-4">
                    <h3 className="font-medium mb-2">Solar PV Specific Settings</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="panel-count">Number of Panels</Label>
                        <Input 
                          id="panel-count" 
                          placeholder="e.g. 12" 
                          value={newDevice.panelCount}
                          onChange={(e) => handleNewDeviceChange('panelCount', e.target.value)}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="orientation">Orientation</Label>
                        <Select 
                          value={newDevice.orientation}
                          onValueChange={(value) => handleNewDeviceChange('orientation', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select orientation" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="south">South</SelectItem>
                            <SelectItem value="southeast">Southeast</SelectItem>
                            <SelectItem value="southwest">Southwest</SelectItem>
                            <SelectItem value="east">East</SelectItem>
                            <SelectItem value="west">West</SelectItem>
                            <SelectItem value="north">North</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="tilt">Tilt Angle (°)</Label>
                        <Input 
                          id="tilt" 
                          placeholder="e.g. 30" 
                          value={newDevice.tilt}
                          onChange={(e) => handleNewDeviceChange('tilt', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                )}
                
                {newDevice.type === 'heat_pump' && (
                  <div className="mt-4 border rounded-lg p-4">
                    <h3 className="font-medium mb-2">Heat Pump Specific Settings</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="heating-capacity">Heating Capacity (kW)</Label>
                        <Input 
                          id="heating-capacity" 
                          placeholder="e.g. 8" 
                          value={newDevice.heatingCapacity}
                          onChange={(e) => handleNewDeviceChange('heatingCapacity', e.target.value)}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="cooling-capacity">Cooling Capacity (kW)</Label>
                        <Input 
                          id="cooling-capacity" 
                          placeholder="e.g. 6" 
                          value={newDevice.coolingCapacity}
                          onChange={(e) => handleNewDeviceChange('coolingCapacity', e.target.value)}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="cop">COP</Label>
                        <Input 
                          id="cop" 
                          placeholder="e.g. 4.5" 
                          value={newDevice.cop}
                          onChange={(e) => handleNewDeviceChange('cop', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                )}
                
                {newDevice.type === 'smart_meter' && (
                  <div className="mt-4 border rounded-lg p-4">
                    <h3 className="font-medium mb-2">Smart Meter Specific Settings</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="meter-type">Meter Type</Label>
                        <Select 
                          value={newDevice.meterType}
                          onValueChange={(value) => handleNewDeviceChange('meterType', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select meter type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="grid">Grid Connection</SelectItem>
                            <SelectItem value="consumption">Consumption</SelectItem>
                            <SelectItem value="generation">Generation</SelectItem>
                            <SelectItem value="submetering">Submetering</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="measurement-points">Measurement Points</Label>
                        <Input 
                          id="measurement-points" 
                          placeholder="e.g. 1 or 3" 
                          value={newDevice.measurementPoints}
                          onChange={(e) => handleNewDeviceChange('measurementPoints', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="technical" className="space-y-4 py-4">
                <div className="flex items-center space-x-2 text-sm">
                  <div className="h-4 w-4 rounded-full bg-primary"></div>
                  <p className="font-medium">Step 3: Technical Specifications</p>
                </div>
                
                <div className="text-sm text-muted-foreground mb-4">
                  Technical specifications help the system accurately predict energy flows and optimize performance.
                  These values are automatically populated when selecting a manufacturer and model.
                </div>
                
                {/* General specifications for all device types */}
                <div className="border rounded-lg p-4 mb-4">
                  <h3 className="font-medium mb-2">General Specifications</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="error-margin">Error Margin (%)</Label>
                      <Input 
                        id="error-margin" 
                        placeholder="e.g. 2.5" 
                      />
                      <p className="text-xs text-muted-foreground">Measurement error margin in percentage</p>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="self-consumption">Self Consumption (W)</Label>
                      <Input 
                        id="self-consumption" 
                        placeholder="e.g. 5" 
                      />
                      <p className="text-xs text-muted-foreground">Power consumed by the device itself</p>
                    </div>
                  </div>
                </div>
                
                {/* Conditional technical specs based on device type */}
                {newDevice.type === 'battery_storage' && (
                  <div className="border rounded-lg p-4 mb-4">
                    <h3 className="font-medium mb-2">Battery Specifications</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="round-trip-efficiency">Round Trip Efficiency (%)</Label>
                        <Input 
                          id="round-trip-efficiency" 
                          placeholder="e.g. 95" 
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="self-discharge-rate">Self-Discharge Rate (%/month)</Label>
                        <Input 
                          id="self-discharge-rate" 
                          placeholder="e.g. 2" 
                        />
                      </div>
                    </div>
                  </div>
                )}
                
                {newDevice.type === 'solar_pv' && (
                  <div className="border rounded-lg p-4 mb-4">
                    <h3 className="font-medium mb-2">Solar Panel Specifications</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="temp-coefficient">Temperature Coefficient (%/°C)</Label>
                        <Input 
                          id="temp-coefficient" 
                          placeholder="e.g. -0.35" 
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="degradation-rate">Annual Degradation Rate (%)</Label>
                        <Input 
                          id="degradation-rate" 
                          placeholder="e.g. 0.5" 
                        />
                      </div>
                    </div>
                  </div>
                )}
                
                {newDevice.type === 'ev_charger' && (
                  <div className="border rounded-lg p-4 mb-4">
                    <h3 className="font-medium mb-2">EV Charger Specifications</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="charger-efficiency">Charging Efficiency (%)</Label>
                        <Input 
                          id="charger-efficiency" 
                          placeholder="e.g. 94" 
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="standby-power">Standby Power (W)</Label>
                        <Input 
                          id="standby-power" 
                          placeholder="e.g. 2.5" 
                        />
                      </div>
                    </div>
                  </div>
                )}
                
                {newDevice.type === 'heat_pump' && (
                  <div className="border rounded-lg p-4 mb-4">
                    <h3 className="font-medium mb-2">Heat Pump Specifications</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="cop-at-7c">COP at 7°C</Label>
                        <Input 
                          id="cop-at-7c" 
                          placeholder="e.g. 4.8" 
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="cop-at-minus-7c">COP at -7°C</Label>
                        <Input 
                          id="cop-at-minus-7c" 
                          placeholder="e.g. 3.2" 
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="refrigerant-type">Refrigerant Type</Label>
                        <Input 
                          id="refrigerant-type" 
                          placeholder="e.g. R32" 
                        />
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Compliance and certification section */}
                <div className="border rounded-lg p-4">
                  <h3 className="font-medium mb-2">Certifications & Compliance</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="certifications">Certifications</Label>
                      <Input 
                        id="certifications" 
                        placeholder="e.g. CE, TÜV, UL" 
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="compliance">Compliance Standards</Label>
                      <Input 
                        id="compliance" 
                        placeholder="e.g. IEC 62109-1/2, VDE-AR-N 4105" 
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddDeviceDialog(false)}>Cancel</Button>
              <Button onClick={handleAddDevice}>Add Device</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}