import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  SunIcon, 
  Battery, 
  PlugZap, 
  Thermometer, 
  Activity, 
  XIcon, 
  RefreshCw, 
  Save,
  Loader2,
  PowerIcon,
  ChevronLeft,
  Settings,
  LineChart,
  BarChart2,
  History,
  AlertCircle,
  Database,
  Cable,
  Server,
  Wifi,
  Network
} from 'lucide-react';
import { ManufacturerConnectionSettings } from './ManufacturerConnectionSettings';

interface DeviceDetailPanelProps {
  deviceId: number;
  onClose: () => void;
}

// Device data model would match your API
interface DeviceData {
  id: number;
  name: string;
  type: string;
  model?: string;
  manufacturer?: string;
  location?: string;
  serialNumber?: string;
  firmwareVersion?: string;
  ipAddress?: string;
  capacity?: number;
  status: string;
  lastUpdated: string;
  maintenance?: {
    nextDate?: string;
    lastDate?: string;
    notes?: string;
  };
  settings?: {
    [key: string]: any;
  };
  readings?: {
    [key: string]: any;
  };
}

// Mock device data for development
const getMockDeviceData = (id: number): DeviceData => {
  // In a real app, this would be fetched from the API
  const now = new Date().toISOString();
  
  // Device types and status based on ID
  const deviceTypes = ['solar_pv', 'battery_storage', 'ev_charger', 'smart_meter', 'heat_pump'];
  const statusOptions = ['online', 'offline', 'standby', 'charging', 'discharging', 'error'];
  
  const deviceType = deviceTypes[id % deviceTypes.length];
  
  const device: DeviceData = {
    id,
    name: `${deviceType.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')} ${id}`,
    type: deviceType,
    manufacturer: 'Example Manufacturer',
    model: `Model X${id}`,
    location: id % 2 === 0 ? 'Garage' : 'Utility Room',
    serialNumber: `SN-${id}-${Date.now().toString().slice(0, 6)}`,
    firmwareVersion: '2.3.4',
    ipAddress: `192.168.1.${100 + id}`,
    capacity: deviceType === 'battery_storage' ? 10 : 5,
    status: statusOptions[id % statusOptions.length],
    lastUpdated: now,
    maintenance: {
      nextDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      lastDate: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      notes: 'Regular maintenance required every 6 months.'
    },
    settings: {
      maxPower: deviceType === 'ev_charger' ? 11 : 5,
      startTime: '22:00',
      endTime: '06:00',
      enabled: true,
      mode: deviceType === 'battery_storage' ? 'auto' : 'standard',
      minimumSoc: deviceType === 'battery_storage' ? 20 : undefined,
      temperature: deviceType === 'heat_pump' ? 22 : undefined
    },
    readings: {
      power: Math.random() * (deviceType === 'ev_charger' ? 11 : 5),
      energy: Math.random() * 100,
      voltage: 230 + Math.random() * 10,
      current: Math.random() * 16,
      frequency: 50 + Math.random() * 0.5,
      temperature: 25 + Math.random() * 10,
      soc: deviceType === 'battery_storage' ? Math.round(20 + Math.random() * 80) : undefined
    }
  };
  
  return device;
};

export default function DeviceDetailPanel({ deviceId, onClose }: DeviceDetailPanelProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [isEditing, setIsEditing] = useState(false);
  const [device, setDevice] = useState<DeviceData>(getMockDeviceData(deviceId));
  const [editedDevice, setEditedDevice] = useState<DeviceData>(getMockDeviceData(deviceId));
  const [selectedManufacturerId, setSelectedManufacturerId] = useState<number | null>(null);
  const [selectedDeviceCatalogId, setSelectedDeviceCatalogId] = useState<number | null>(null);
  const [selectedProtocol, setSelectedProtocol] = useState<string>('modbus');
  const [selectedConnectionMethod, setSelectedConnectionMethod] = useState<string>('direct');
  const [connectionSettings, setConnectionSettings] = useState<any | null>(null);
  const { toast } = useToast();
  
  // Fetch connection settings for the device
  const { data: deviceConnectionSettings, isLoading: isLoadingSettings } = useQuery({
    queryKey: [`/api/devices/${deviceId}/connection-settings`],
    enabled: activeTab === 'connection',
    queryFn: async () => {
      try {
        return await fetch(`/api/devices/${deviceId}/connection-settings`).then(res => {
          if (!res.ok) throw new Error('Failed to load connection settings');
          return res.json();
        });
      } catch (error) {
        console.error('Error fetching connection settings:', error);
        return null;
      }
    }
  });
  
  // Update connection settings when deviceConnectionSettings changes
  useEffect(() => {
    if (deviceConnectionSettings) {
      setConnectionSettings(deviceConnectionSettings.settings || {});
      setSelectedManufacturerId(deviceConnectionSettings.manufacturerId);
      setSelectedDeviceCatalogId(deviceConnectionSettings.deviceCatalogId);
      setSelectedProtocol(deviceConnectionSettings.protocol || 'modbus');
      setSelectedConnectionMethod(deviceConnectionSettings.connectionMethod || 'direct');
    }
  }, [deviceConnectionSettings]);
  
  // Mutation for saving connection settings
  const saveConnectionSettingsMutation = useMutation({
    mutationFn: async (settings: any) => {
      const response = await apiRequest('PUT', `/api/devices/${deviceId}/connection-settings`, {
        manufacturerId: selectedManufacturerId,
        deviceCatalogId: selectedDeviceCatalogId,
        protocol: selectedProtocol,
        connectionMethod: selectedConnectionMethod,
        settings: connectionSettings
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save connection settings');
      }
      
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Connection Settings Saved',
        description: 'Device connection settings have been updated successfully',
      });
      queryClient.invalidateQueries({ queryKey: [`/api/devices/${deviceId}/connection-settings`] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error Saving Settings',
        description: error.message,
        variant: 'destructive',
      });
    }
  });
  
  // Handle device control actions
  const handleDeviceAction = (action: string) => {
    toast({
      title: 'Command Sent',
      description: `${action} command sent to ${device.name}`,
    });
  };
  
  // Handle saving device settings
  const handleSaveSettings = () => {
    setDevice(editedDevice);
    setIsEditing(false);
    toast({
      title: 'Settings Saved',
      description: 'Device settings have been updated successfully',
    });
  };
  
  // Get appropriate icon based on device type
  const getDeviceIcon = () => {
    switch (device.type) {
      case 'solar_pv':
        return <SunIcon className="h-6 w-6 text-yellow-500" />;
      case 'battery_storage':
        return <Battery className="h-6 w-6 text-green-500" />;
      case 'ev_charger':
        return <PlugZap className="h-6 w-6 text-blue-500" />;
      case 'heat_pump':
        return <Thermometer className="h-6 w-6 text-red-500" />;
      case 'smart_meter':
        return <Activity className="h-6 w-6 text-purple-500" />;
      default:
        return <Settings className="h-6 w-6 text-gray-500" />;
    }
  };
  
  // Get status badge color
  const getStatusColor = () => {
    switch (device.status) {
      case 'online':
      case 'charging':
        return 'bg-green-500';
      case 'offline':
      case 'error':
        return 'bg-red-500';
      case 'standby':
      case 'discharging':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };
  
  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <div className="flex items-center">
          <Button variant="ghost" size="icon" onClick={onClose} className="mr-2">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center">
            {getDeviceIcon()}
            <div className="ml-2">
              <CardTitle className="text-xl">{device.name}</CardTitle>
              <CardDescription>{device.type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}</CardDescription>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <div className="flex items-center">
            <div className={`w-3 h-3 rounded-full ${getStatusColor()} mr-2`}></div>
            <span className="text-sm font-medium capitalize">{device.status}</span>
          </div>
          <Button variant="ghost" size="icon" onClick={() => handleDeviceAction('restart')}>
            <RefreshCw className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => handleDeviceAction('power')}>
            <PowerIcon className="h-5 w-5" />
          </Button>
        </div>
      </CardHeader>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <div className="border-b px-4">
          <TabsList className="bg-transparent">
            <TabsTrigger value="overview" className="data-[state=active]:bg-muted">Overview</TabsTrigger>
            <TabsTrigger value="settings" className="data-[state=active]:bg-muted">Settings</TabsTrigger>
            <TabsTrigger value="connection" className="data-[state=active]:bg-muted">Connection</TabsTrigger>
            <TabsTrigger value="data" className="data-[state=active]:bg-muted">Data & Charts</TabsTrigger>
            <TabsTrigger value="history" className="data-[state=active]:bg-muted">History</TabsTrigger>
          </TabsList>
        </div>
        
        <ScrollArea className="flex-1">
          <TabsContent value="overview" className="p-6 pb-14 m-0">
            <div className="space-y-6">
              {/* Status Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {device.readings?.power !== undefined && (
                  <Card>
                    <CardContent className="p-4 flex flex-col items-center">
                      <Activity className="h-8 w-8 text-primary mb-2" />
                      <div className="text-sm text-muted-foreground">Current Power</div>
                      <div className="text-xl font-bold">{device.readings.power.toFixed(1)} kW</div>
                    </CardContent>
                  </Card>
                )}
                
                {device.readings?.energy !== undefined && (
                  <Card>
                    <CardContent className="p-4 flex flex-col items-center">
                      <BarChart2 className="h-8 w-8 text-primary mb-2" />
                      <div className="text-sm text-muted-foreground">Total Energy</div>
                      <div className="text-xl font-bold">{device.readings.energy.toFixed(1)} kWh</div>
                    </CardContent>
                  </Card>
                )}
                
                {device.readings?.soc !== undefined && (
                  <Card>
                    <CardContent className="p-4 flex flex-col items-center">
                      <Battery className="h-8 w-8 text-primary mb-2" />
                      <div className="text-sm text-muted-foreground">State of Charge</div>
                      <div className="text-xl font-bold">{device.readings.soc}%</div>
                    </CardContent>
                  </Card>
                )}
              </div>
              
              {/* Device Info */}
              <div>
                <h3 className="text-lg font-medium mb-4">Device Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Manufacturer:</span>
                      <span className="font-medium">{device.manufacturer || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Model:</span>
                      <span className="font-medium">{device.model || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Serial Number:</span>
                      <span className="font-medium">{device.serialNumber || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Firmware:</span>
                      <span className="font-medium">{device.firmwareVersion || 'N/A'}</span>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Location:</span>
                      <span className="font-medium">{device.location || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">IP Address:</span>
                      <span className="font-medium">{device.ipAddress || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Capacity:</span>
                      <span className="font-medium">{device.capacity} {device.type === 'battery_storage' ? 'kWh' : 'kW'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Last Updated:</span>
                      <span className="font-medium">{new Date(device.lastUpdated).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Maintenance Info */}
              {device.maintenance && (
                <div>
                  <h3 className="text-lg font-medium mb-4">Maintenance</h3>
                  <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Next Maintenance:</span>
                      <span className="font-medium">{device.maintenance.nextDate || 'Not scheduled'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Last Maintenance:</span>
                      <span className="font-medium">{device.maintenance.lastDate || 'N/A'}</span>
                    </div>
                    {device.maintenance.notes && (
                      <div className="pt-2">
                        <span className="text-muted-foreground">Notes:</span>
                        <p className="mt-1">{device.maintenance.notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="settings" className="p-6 pb-14 m-0">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Device Settings</h3>
                {isEditing ? (
                  <div className="space-x-2">
                    <Button variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
                    <Button onClick={handleSaveSettings}>
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </Button>
                  </div>
                ) : (
                  <Button onClick={() => setIsEditing(true)}>Edit Settings</Button>
                )}
              </div>
              
              {isEditing ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="device-name">Device Name</Label>
                      <Input 
                        id="device-name" 
                        value={editedDevice.name} 
                        onChange={(e) => setEditedDevice({...editedDevice, name: e.target.value})}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="device-location">Location</Label>
                      <Input 
                        id="device-location" 
                        value={editedDevice.location || ''} 
                        onChange={(e) => setEditedDevice({...editedDevice, location: e.target.value})}
                      />
                    </div>
                  </div>
                  
                  <Separator />
                  
                  {/* Device-specific settings */}
                  <div className="space-y-4">
                    {device.type === 'battery_storage' && (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="battery-mode">Operating Mode</Label>
                            <Select 
                              value={editedDevice.settings?.mode} 
                              onValueChange={(value) => setEditedDevice({
                                ...editedDevice, 
                                settings: {...editedDevice.settings, mode: value}
                              })}
                            >
                              <SelectTrigger id="battery-mode">
                                <SelectValue placeholder="Select operating mode" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="auto">Auto (Smart)</SelectItem>
                                <SelectItem value="time">Time-based</SelectItem>
                                <SelectItem value="manual">Manual</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="min-soc">Minimum State of Charge (%)</Label>
                            <Input 
                              id="min-soc" 
                              type="number" 
                              min="0" 
                              max="100" 
                              value={editedDevice.settings?.minimumSoc || 20} 
                              onChange={(e) => setEditedDevice({
                                ...editedDevice, 
                                settings: {...editedDevice.settings, minimumSoc: parseInt(e.target.value)}
                              })}
                            />
                          </div>
                        </div>
                      </>
                    )}
                    
                    {device.type === 'ev_charger' && (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="max-power">Maximum Power (kW)</Label>
                            <Input 
                              id="max-power" 
                              type="number" 
                              min="0" 
                              step="0.1" 
                              value={editedDevice.settings?.maxPower || 11} 
                              onChange={(e) => setEditedDevice({
                                ...editedDevice, 
                                settings: {...editedDevice.settings, maxPower: parseFloat(e.target.value)}
                              })}
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="charging-mode">Charging Mode</Label>
                            <Select 
                              value={editedDevice.settings?.mode || 'standard'} 
                              onValueChange={(value) => setEditedDevice({
                                ...editedDevice, 
                                settings: {...editedDevice.settings, mode: value}
                              })}
                            >
                              <SelectTrigger id="charging-mode">
                                <SelectValue placeholder="Select charging mode" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="standard">Standard</SelectItem>
                                <SelectItem value="eco">Eco (Solar Priority)</SelectItem>
                                <SelectItem value="fast">Fast Charging</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </>
                    )}
                    
                    {/* Common settings for all devices */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="device-enabled">Device Enabled</Label>
                        <Switch 
                          id="device-enabled" 
                          checked={editedDevice.settings?.enabled} 
                          onCheckedChange={(checked) => setEditedDevice({
                            ...editedDevice, 
                            settings: {...editedDevice.settings, enabled: checked}
                          })}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Device Name:</span>
                        <span className="font-medium">{device.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Location:</span>
                        <span className="font-medium">{device.location || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Status:</span>
                        <span className="font-medium capitalize">{device.status}</span>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Enabled:</span>
                        <span className="font-medium">{device.settings?.enabled ? 'Yes' : 'No'}</span>
                      </div>
                      {device.settings?.mode && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Operating Mode:</span>
                          <span className="font-medium capitalize">{device.settings.mode}</span>
                        </div>
                      )}
                      {device.settings?.maxPower && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Maximum Power:</span>
                          <span className="font-medium">{device.settings.maxPower} kW</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Device-specific settings display */}
                  {device.type === 'battery_storage' && device.settings?.minimumSoc && (
                    <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                      <h4 className="text-sm font-medium mb-2">Battery Settings</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Minimum SoC:</span>
                          <span className="font-medium">{device.settings.minimumSoc}%</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="connection" className="p-6 pb-14 m-0">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Connection Settings</h3>
                <div className="flex items-center space-x-2">
                  <div className="flex items-center">
                    <div className={`w-3 h-3 rounded-full ${device.status === 'online' ? 'bg-green-500' : 'bg-yellow-500'} mr-2`}></div>
                    <span className="text-sm font-medium capitalize">
                      {device.status === 'online' ? 'Connected' : 'Disconnected'}
                    </span>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => handleDeviceAction('test_connection')}>
                    Test Connection
                  </Button>
                </div>
              </div>
              
              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-4 bg-muted/30 p-4 rounded-lg">
                  <div className="flex items-center">
                    <Database className="h-5 w-5 mr-2 text-primary" />
                    <h4 className="text-md font-medium">Manufacturer & Model</h4>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="manufacturer">Manufacturer</Label>
                      <Select 
                        value={selectedManufacturerId?.toString() || ''} 
                        onValueChange={(value) => setSelectedManufacturerId(parseInt(value) || null)}
                      >
                        <SelectTrigger id="manufacturer">
                          <SelectValue placeholder="Select manufacturer" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">SolarEdge</SelectItem>
                          <SelectItem value="2">Tesla</SelectItem>
                          <SelectItem value="3">Schneider Electric</SelectItem>
                          <SelectItem value="4">ABB</SelectItem>
                          <SelectItem value="5">LG Energy Solution</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="device-model">Device Model</Label>
                      <Select 
                        value={selectedDeviceCatalogId?.toString() || ''} 
                        onValueChange={(value) => setSelectedDeviceCatalogId(parseInt(value) || null)}
                      >
                        <SelectTrigger id="device-model">
                          <SelectValue placeholder="Select model" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">PowerWall 2</SelectItem>
                          <SelectItem value="2">SolarEdge SE3000H</SelectItem>
                          <SelectItem value="3">Schneider EV Link</SelectItem>
                          <SelectItem value="4">ABB Terra AC</SelectItem>
                          <SelectItem value="5">LG RESU10H</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4 bg-muted/30 p-4 rounded-lg">
                  <div className="flex items-center">
                    <Cable className="h-5 w-5 mr-2 text-primary" />
                    <h4 className="text-md font-medium">Protocol & Connection</h4>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="space-y-2">
                      <Label htmlFor="connection-protocol">Connection Protocol</Label>
                      <Select 
                        value={selectedProtocol} 
                        onValueChange={setSelectedProtocol}
                      >
                        <SelectTrigger id="connection-protocol">
                          <SelectValue placeholder="Select protocol" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="modbus">Modbus TCP/RTU</SelectItem>
                          <SelectItem value="mqtt">MQTT</SelectItem>
                          <SelectItem value="ocpp">OCPP</SelectItem>
                          <SelectItem value="eebus">EEBus</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="connection-method">Connection Method</Label>
                      <Select 
                        value={selectedConnectionMethod} 
                        onValueChange={setSelectedConnectionMethod}
                      >
                        <SelectTrigger id="connection-method">
                          <SelectValue placeholder="Select method" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="direct">Direct</SelectItem>
                          <SelectItem value="gateway">Via Gateway</SelectItem>
                          <SelectItem value="cloud">Cloud API</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  {selectedManufacturerId && selectedDeviceCatalogId && (
                    <ManufacturerConnectionSettings 
                      manufacturerId={selectedManufacturerId} 
                      deviceCatalogId={selectedDeviceCatalogId}
                      deviceType={device.type}
                      protocol={selectedProtocol}
                      onSettingsChange={(settings) => setConnectionSettings(settings)}
                      initialSettings={connectionSettings || {
                        connection: 'tcp',
                        ipAddress: device.ipAddress,
                        port: 502,
                        slaveId: 1
                      }}
                    />
                  )}
                </div>
                
                <div className="flex justify-end">
                  <div className="flex items-center gap-2">
                    {isLoadingSettings && (
                      <div className="flex items-center">
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        <span className="text-sm text-muted-foreground">Loading settings...</span>
                      </div>
                    )}
                    <Button 
                      onClick={() => saveConnectionSettingsMutation.mutate()}
                      disabled={saveConnectionSettingsMutation.isPending || !selectedManufacturerId || !selectedDeviceCatalogId}
                    >
                      {saveConnectionSettingsMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Save Connection Settings
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="data" className="p-6 pb-14 m-0">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Data & Charts</h3>
                <Select defaultValue="day">
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day">Day</SelectItem>
                    <SelectItem value="week">Week</SelectItem>
                    <SelectItem value="month">Month</SelectItem>
                    <SelectItem value="year">Year</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Chart placeholder */}
              <div className="h-64 border rounded-md flex items-center justify-center bg-muted/50">
                <div className="text-center">
                  <LineChart className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">Chart data would be displayed here</p>
                  <p className="text-xs text-muted-foreground mt-1">Using real-time data from the device</p>
                </div>
              </div>
              
              {/* Current readings */}
              <div>
                <h3 className="text-md font-medium mb-3">Current Readings</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {device.readings?.power !== undefined && (
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <div className="text-xs text-muted-foreground">Power</div>
                      <div className="text-lg font-medium">{device.readings.power.toFixed(1)} kW</div>
                    </div>
                  )}
                  
                  {device.readings?.voltage !== undefined && (
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <div className="text-xs text-muted-foreground">Voltage</div>
                      <div className="text-lg font-medium">{device.readings.voltage.toFixed(1)} V</div>
                    </div>
                  )}
                  
                  {device.readings?.current !== undefined && (
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <div className="text-xs text-muted-foreground">Current</div>
                      <div className="text-lg font-medium">{device.readings.current.toFixed(1)} A</div>
                    </div>
                  )}
                  
                  {device.readings?.frequency !== undefined && (
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <div className="text-xs text-muted-foreground">Frequency</div>
                      <div className="text-lg font-medium">{device.readings.frequency.toFixed(2)} Hz</div>
                    </div>
                  )}
                  
                  {device.readings?.temperature !== undefined && (
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <div className="text-xs text-muted-foreground">Temperature</div>
                      <div className="text-lg font-medium">{device.readings.temperature.toFixed(1)} °C</div>
                    </div>
                  )}
                  
                  {device.readings?.soc !== undefined && (
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <div className="text-xs text-muted-foreground">State of Charge</div>
                      <div className="text-lg font-medium">{device.readings.soc}%</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="history" className="p-6 pb-14 m-0">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Event History</h3>
                <Select defaultValue="all">
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Events</SelectItem>
                    <SelectItem value="errors">Errors</SelectItem>
                    <SelectItem value="warnings">Warnings</SelectItem>
                    <SelectItem value="info">Info</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Event history placeholder */}
              <div className="space-y-3">
                <div className="p-4 border rounded-md bg-muted/20 flex items-start space-x-3">
                  <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
                  <div>
                    <div className="flex items-center">
                      <span className="font-medium">Communication Error</span>
                      <span className="text-xs text-muted-foreground ml-2">5 mins ago</span>
                    </div>
                    <p className="text-sm mt-1">
                      Device temporarily lost connection to the network. Connection restored automatically.
                    </p>
                  </div>
                </div>
                
                <div className="p-4 border rounded-md bg-muted/20 flex items-start space-x-3">
                  <History className="h-5 w-5 text-blue-500 mt-0.5" />
                  <div>
                    <div className="flex items-center">
                      <span className="font-medium">Status Change</span>
                      <span className="text-xs text-muted-foreground ml-2">1 hour ago</span>
                    </div>
                    <p className="text-sm mt-1">
                      Device status changed from "standby" to "online".
                    </p>
                  </div>
                </div>
                
                <div className="p-4 border rounded-md bg-muted/20 flex items-start space-x-3">
                  <Settings className="h-5 w-5 text-green-500 mt-0.5" />
                  <div>
                    <div className="flex items-center">
                      <span className="font-medium">Settings Updated</span>
                      <span className="text-xs text-muted-foreground ml-2">2 days ago</span>
                    </div>
                    <p className="text-sm mt-1">
                      Device settings were updated by Admin User.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </ScrollArea>
      </Tabs>
      
      <CardFooter className="border-t flex justify-between py-3">
        <Button variant="outline" onClick={onClose}>
          <XIcon className="h-4 w-4 mr-2" />
          Close
        </Button>
        <div className="flex space-x-2">
          <Button onClick={() => handleDeviceAction('reboot')}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Reboot Device
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}