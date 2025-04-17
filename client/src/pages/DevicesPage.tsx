import React, { useState } from 'react';
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
  const { currentSiteId } = useSiteContext();
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
    type: '',
    model: '',
    manufacturer: '',
    location: '',
    ipAddress: '',
    capacity: '',
    protocol: 'modbus',
    deviceCatalogId: null as number | null
  });
  
  // State for available device models
  const [availableModels, setAvailableModels] = useState<Array<{id: number, name: string, modelNumber: string, capacity: number}>>([]);
  
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
      setNewDevice({
        ...newDevice,
        deviceCatalogId: selectedModel.id,
        model: selectedModel.modelNumber,
        capacity: selectedModel.capacity.toString(),
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
      type: '',
      model: '',
      manufacturer: '',
      location: '',
      ipAddress: '',
      capacity: '',
      protocol: 'modbus',
      deviceCatalogId: null
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
                                className="text-destructive focus:text-destructive"
                                onClick={(e) => { e.stopPropagation(); }}
                              >
                                <Trash className="mr-2 h-4 w-4" />
                                <span>Remove</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </CardHeader>
                      <CardContent className="pb-2">
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">Location: </span>
                            <span>{device.location || 'Unknown'}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Capacity: </span>
                            <span>{device.capacity} {device.type?.includes('battery') ? 'kWh' : 'kW'}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Model: </span>
                            <span>{device.model || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">IP: </span>
                            <span>{device.ipAddress || 'N/A'}</span>
                          </div>
                        </div>
                      </CardContent>
                      <CardFooter className="pt-0">
                        <div className="w-full">
                          {device.type?.includes('battery') && (
                            <div className="mt-2">
                              <div className="flex justify-between text-xs mb-1">
                                <span>State of Charge</span>
                                <span className="font-medium">{device.readings?.soc || 0}%</span>
                              </div>
                              <div className="w-full bg-muted rounded-full h-2">
                                <div 
                                  className="bg-green-500 h-2 rounded-full" 
                                  style={{ width: `${device.readings?.soc || 0}%` }}
                                ></div>
                              </div>
                            </div>
                          )}
                          {device.type?.includes('solar') && (
                            <div className="mt-2">
                              <div className="flex justify-between text-xs mb-1">
                                <span>Current Power</span>
                                <span className="font-medium">{device.readings?.power || 0} W</span>
                              </div>
                              <div className="w-full bg-muted rounded-full h-2">
                                <div 
                                  className="bg-yellow-500 h-2 rounded-full" 
                                  style={{ 
                                    width: `${Math.min(100, ((device.readings?.power || 0) / (device.capacity || 1)) * 100)}%` 
                                  }}
                                ></div>
                              </div>
                            </div>
                          )}
                          {device.type?.includes('ev') && (
                            <div className="mt-2">
                              <div className="flex justify-between text-xs mb-1">
                                <span>Charging Power</span>
                                <span className="font-medium">{device.readings?.power || 0} kW</span>
                              </div>
                              <div className="w-full bg-muted rounded-full h-2">
                                <div 
                                  className={`${device.status === 'charging' ? 'bg-blue-500 animate-pulse' : 'bg-gray-300'} h-2 rounded-full`}
                                  style={{ 
                                    width: `${Math.min(100, ((device.readings?.power || 0) / (device.capacity || 1)) * 100)}%` 
                                  }}
                                ></div>
                              </div>
                            </div>
                          )}
                          {device.type?.includes('heat') && (
                            <div className="mt-2">
                              <div className="flex justify-between text-xs mb-1">
                                <span>Temperature</span>
                                <span className="font-medium">{device.readings?.temperature || 20}°C</span>
                              </div>
                              <div className="w-full bg-muted rounded-full h-2">
                                <div 
                                  className="bg-red-500 h-2 rounded-full" 
                                  style={{ 
                                    width: `${Math.min(100, ((device.readings?.temperature || 20) / 50) * 100)}%` 
                                  }}
                                ></div>
                              </div>
                            </div>
                          )}
                        </div>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              </>
            )}
          </>
        )}
        
        {/* Add device dialog */}
        <Dialog open={showAddDeviceDialog} onOpenChange={setShowAddDeviceDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Device</DialogTitle>
              <DialogDescription>
                Enter the details of the device you would like to add to your system.
              </DialogDescription>
            </DialogHeader>
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
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="device-manufacturer">Manufacturer <span className="text-destructive">*</span></Label>
                <Select 
                  value={newDevice.manufacturer}
                  onValueChange={(value) => handleNewDeviceChange('manufacturer', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select manufacturer" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">SolarEdge</SelectItem>
                    <SelectItem value="2">Tesla</SelectItem>
                    <SelectItem value="3">LG Energy Solution</SelectItem>
                    <SelectItem value="4">Fronius</SelectItem>
                    <SelectItem value="5">ABB</SelectItem>
                    <SelectItem value="6">Schneider Electric</SelectItem>
                    <SelectItem value="7">BYD</SelectItem>
                    <SelectItem value="8">ChargePoint</SelectItem>
                    <SelectItem value="9">Daikin</SelectItem>
                    <SelectItem value="10">Mitsubishi Electric</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="device-model">Model <span className="text-destructive">*</span></Label>
                {availableModels.length > 0 ? (
                  <Select
                    value={newDevice.deviceCatalogId?.toString() || ""}
                    onValueChange={handleModelSelect}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select device model" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableModels.map(model => (
                        <SelectItem key={model.id} value={model.id.toString()}>
                          {model.name} - {model.modelNumber}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input 
                    id="device-model" 
                    placeholder="Enter model number" 
                    value={newDevice.model}
                    onChange={(e) => handleNewDeviceChange('model', e.target.value)}
                  />
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="device-location">Location</Label>
                <Input 
                  id="device-location" 
                  placeholder="Enter location (e.g., Garage, Roof)" 
                  value={newDevice.location}
                  onChange={(e) => handleNewDeviceChange('location', e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="device-ip">IP Address</Label>
                <Input 
                  id="device-ip" 
                  placeholder="Enter IP address" 
                  value={newDevice.ipAddress}
                  onChange={(e) => handleNewDeviceChange('ipAddress', e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="device-capacity">Capacity (kW)</Label>
                  <Input 
                    id="device-capacity" 
                    type="number" 
                    min="0" 
                    step="0.1" 
                    value={newDevice.capacity} 
                    onChange={(e) => handleNewDeviceChange('capacity', e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="device-protocol">Protocol</Label>
                  <Select 
                    value={newDevice.protocol}
                    onValueChange={(value) => handleNewDeviceChange('protocol', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mqtt">MQTT</SelectItem>
                      <SelectItem value="modbus">Modbus</SelectItem>
                      <SelectItem value="http">HTTP/REST</SelectItem>
                      <SelectItem value="ocpp">OCPP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
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