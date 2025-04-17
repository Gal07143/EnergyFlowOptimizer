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

  // Handle add new device
  const handleAddDevice = () => {
    toast({
      title: 'Device Added',
      description: 'New device has been added to the system.',
    });
    setShowAddDeviceDialog(false);
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
                <Label htmlFor="device-name">Device Name</Label>
                <Input id="device-name" placeholder="Enter device name" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="device-type">Device Type</Label>
                <Select>
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
                <Label htmlFor="device-model">Model/Manufacturer</Label>
                <Input id="device-model" placeholder="Enter model or manufacturer" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="device-location">Location</Label>
                <Input id="device-location" placeholder="Enter location (e.g., Garage, Roof)" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="device-ip">IP Address</Label>
                <Input id="device-ip" placeholder="Enter IP address" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="device-capacity">Capacity (kW)</Label>
                  <Input id="device-capacity" type="number" min="0" step="0.1" defaultValue="0" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="device-protocol">Protocol</Label>
                  <Select defaultValue="mqtt">
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