import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { 
  Check, 
  CirclePlus, 
  CircleX, 
  FileCode, 
  QrCode, 
  RefreshCw, 
  ScanLine,
  Activity,
  Settings,
  DownloadCloud,
  HardDrive,
  Eye,
  Edit,
  Trash,
  Zap,
  AlertTriangle,
} from 'lucide-react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

// Zod schema for device registration
const deviceRegistrationSchema = z.object({
  deviceUid: z.string().min(3, { message: 'Device ID must be at least 3 characters' }),
  deviceType: z.enum(['solar_pv', 'battery_storage', 'ev_charger', 'smart_meter', 'heat_pump', 'inverter', 'load_controller', 'energy_gateway']),
  location: z.string().optional(),
  locationCoordinates: z.string().optional(),
  zoneId: z.string().optional(),
  authMethod: z.enum(['none', 'api_key', 'certificate', 'username_password', 'oauth', 'token']).default('api_key'),
  firmwareVersion: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

// Zod schema for template creation
const templateCreationSchema = z.object({
  name: z.string().min(3, { message: 'Template name must be at least 3 characters' }),
  description: z.string().optional(),
  deviceType: z.enum(['solar_pv', 'battery_storage', 'ev_charger', 'smart_meter', 'heat_pump', 'inverter', 'load_controller', 'energy_gateway']),
  configTemplate: z.record(z.string(), z.any()),
  firmwareVersion: z.string().optional(),
  authMethod: z.enum(['none', 'api_key', 'certificate', 'username_password', 'oauth', 'token']).default('api_key'),
  defaultSettings: z.record(z.string(), z.any()).optional(),
  requiredCapabilities: z.array(z.string()).optional(),
});

// Zod schema for registration code generation
const registrationCodeSchema = z.object({
  deviceType: z.enum(['solar_pv', 'battery_storage', 'ev_charger', 'smart_meter', 'heat_pump', 'inverter', 'load_controller', 'energy_gateway']).optional(),
  templateId: z.number().optional(),
  expiryHours: z.number().min(1).default(24),
  isOneTime: z.boolean().default(true),
  maxUses: z.number().min(1).default(1),
});

// Types for our data
type DeviceRegistry = {
  id: number;
  deviceUid: string;
  deviceType: string;
  registrationStatus: string;
  location?: string;
  isOnline: boolean;
  lastSeen?: string;
  firmwareVersion?: string;
  authMethod: string;
};

type ProvisioningTemplate = {
  id: number;
  name: string;
  description?: string;
  deviceType: string;
  configTemplate: Record<string, any>;
  firmwareVersion?: string;
  authMethod: string;
  isActive: boolean;
  createdAt: string;
};

type RegistrationCode = {
  id: number;
  code: string;
  qrCodeData?: string;
  registrationUrl?: string;
  deviceType?: string;
  expiresAt?: string;
  isOneTime: boolean;
  useCount: number;
  maxUses: number;
  isActive: boolean;
  createdAt: string;
};

type DeviceCredentials = {
  id: number;
  deviceRegistryId: number;
  authMethod: string;
  username?: string;
  password?: string;
  apiKey?: string;
  apiSecret?: string;
  certificatePem?: string;
  privateKeyPem?: string;
  tokenValue?: string;
  validUntil?: string;
  isActive: boolean;
  createdAt: string;
};

// Helper function to format date
const formatDate = (dateString?: string) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleString();
};

// Get status badge styling based on registration status
const getStatusBadge = (status: string) => {
  switch (status) {
    case 'active':
      return <Badge variant="success">{status}</Badge>;
    case 'pending':
      return <Badge variant="secondary">{status}</Badge>;
    case 'provisioning':
      return <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-700 dark:text-yellow-400">{status}</Badge>;
    case 'decommissioned':
      return <Badge variant="destructive">{status}</Badge>;
    case 'rejected':
      return <Badge variant="destructive">{status}</Badge>;
    default:
      return <Badge>{status}</Badge>;
  }
};

// Get device type icon
const getDeviceTypeIcon = (type: string) => {
  switch (type) {
    case 'solar_pv':
      return <Zap className="h-4 w-4 mr-1" />;
    case 'battery_storage':
      return <HardDrive className="h-4 w-4 mr-1" />;
    case 'ev_charger':
      return <Zap className="h-4 w-4 mr-1" />;
    case 'smart_meter':
      return <Activity className="h-4 w-4 mr-1" />;
    case 'heat_pump':
      return <Settings className="h-4 w-4 mr-1" />;
    case 'inverter':
      return <Zap className="h-4 w-4 mr-1" />;
    case 'load_controller':
      return <Settings className="h-4 w-4 mr-1" />;
    case 'energy_gateway':
      return <Settings className="h-4 w-4 mr-1" />;
    default:
      return <Settings className="h-4 w-4 mr-1" />;
  }
};

// Get online status badge
const getOnlineStatusBadge = (isOnline: boolean) => {
  return isOnline ? 
    <Badge variant="success" className="inline-flex items-center"><Check className="h-3 w-3 mr-1" />Online</Badge> : 
    <Badge variant="destructive" className="inline-flex items-center"><CircleX className="h-3 w-3 mr-1" />Offline</Badge>;
};

// Main component
const DeviceRegistryPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('devices');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Device Registry Tab
  const DeviceRegistryTab = () => {
    const [selectedDevice, setSelectedDevice] = useState<DeviceRegistry | null>(null);
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [showCredentialsDialog, setShowCredentialsDialog] = useState(false);
    const [credentials, setCredentials] = useState<DeviceCredentials | null>(null);
    
    // Fetch devices
    const { 
      data: devices = [], 
      isLoading: isLoadingDevices,
      error: devicesError,
      refetch: refetchDevices
    } = useQuery<DeviceRegistry[]>({
      queryKey: ['/api/device-registry/registry'],
    });
    
    // Fetch templates for dropdown
    const { 
      data: templates = [],
      isLoading: isLoadingTemplates 
    } = useQuery<ProvisioningTemplate[]>({
      queryKey: ['/api/device-registry/templates'],
    });
    
    // Create device mutation
    const createDeviceMutation = useMutation({
      mutationFn: async (formData: z.infer<typeof deviceRegistrationSchema>) => {
        const response = await apiRequest('POST', '/api/device-registry/registry', formData);
        return await response.json();
      },
      onSuccess: () => {
        toast({
          title: "Device added",
          description: "The device has been added to the registry."
        });
        setShowCreateDialog(false);
        queryClient.invalidateQueries({ queryKey: ['/api/device-registry/registry'] });
      },
      onError: (error: Error) => {
        toast({
          title: "Failed to add device",
          description: error.message,
          variant: "destructive"
        });
      }
    });
    
    // Generate credentials mutation
    const generateCredentialsMutation = useMutation({
      mutationFn: async ({ deviceId, authMethod }: { deviceId: number, authMethod: string }) => {
        const response = await apiRequest('POST', `/api/device-registry/registry/${deviceId}/credentials`, { authMethod });
        return await response.json();
      },
      onSuccess: (data) => {
        setCredentials(data);
        toast({
          title: "Credentials generated",
          description: "New credentials have been generated for the device."
        });
      },
      onError: (error: Error) => {
        toast({
          title: "Failed to generate credentials",
          description: error.message,
          variant: "destructive"
        });
      }
    });
    
    // Apply template mutation
    const applyTemplateMutation = useMutation({
      mutationFn: async ({ deviceId, templateId }: { deviceId: number, templateId: number }) => {
        const response = await apiRequest('POST', `/api/device-registry/registry/${deviceId}/apply-template`, { templateId });
        return await response.json();
      },
      onSuccess: () => {
        toast({
          title: "Template applied",
          description: "The template has been applied to the device."
        });
        queryClient.invalidateQueries({ queryKey: ['/api/device-registry/registry'] });
      },
      onError: (error: Error) => {
        toast({
          title: "Failed to apply template",
          description: error.message,
          variant: "destructive"
        });
      }
    });
    
    // Form for device registration
    const deviceForm = useForm<z.infer<typeof deviceRegistrationSchema>>({
      resolver: zodResolver(deviceRegistrationSchema),
      defaultValues: {
        deviceUid: '',
        deviceType: 'solar_pv',
        authMethod: 'api_key',
      },
    });
    
    // Form for applying template
    const templateForm = useForm({
      resolver: zodResolver(z.object({
        templateId: z.string().min(1, "Template is required"),
      })),
      defaultValues: {
        templateId: '',
      },
    });
    
    // Handle device registration
    const onSubmitDeviceRegistration = (data: z.infer<typeof deviceRegistrationSchema>) => {
      createDeviceMutation.mutate(data);
    };
    
    // Handle applying template
    const onSubmitApplyTemplate = (data: any) => {
      if (!selectedDevice) return;
      
      applyTemplateMutation.mutate({
        deviceId: selectedDevice.id,
        templateId: parseInt(data.templateId, 10)
      });
    };
    
    // Handle generating credentials
    const generateCredentials = (deviceId: number, authMethod: string) => {
      generateCredentialsMutation.mutate({ deviceId, authMethod });
      setShowCredentialsDialog(true);
    };
    
    if (isLoadingDevices) {
      return <div className="grid gap-4 grid-cols-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-4 w-3/4 mt-2" />
              <Skeleton className="h-4 w-1/2 mt-2" />
            </CardContent>
          </Card>
        ))}
      </div>;
    }
    
    if (devicesError) {
      return <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          {devicesError instanceof Error ? devicesError.message : 'Failed to load devices'}
        </AlertDescription>
      </Alert>;
    }
    
    return (
      <>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Device Registry</h2>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={() => refetchDevices()}>
              <RefreshCw className="h-4 w-4 mr-2" /> Refresh
            </Button>
            <Button onClick={() => setShowCreateDialog(true)}>
              <CirclePlus className="h-4 w-4 mr-2" /> Add Device
            </Button>
          </div>
        </div>
        
        {devices.length === 0 ? (
          <Card>
            <CardContent className="p-8 flex flex-col items-center justify-center text-center">
              <AlertTriangle className="h-10 w-10 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No devices registered yet</h3>
              <p className="text-muted-foreground mt-2 mb-4">
                Add your first device to start monitoring and controlling your energy assets.
              </p>
              <Button onClick={() => setShowCreateDialog(true)}>
                <CirclePlus className="h-4 w-4 mr-2" /> Register New Device
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Device ID</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Seen</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Auth Method</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {devices.map((device) => (
                    <TableRow key={device.id}>
                      <TableCell className="font-medium">{device.deviceUid}</TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          {getDeviceTypeIcon(device.deviceType)}
                          <span className="capitalize">{device.deviceType.replace('_', ' ')}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col space-y-1">
                          {getStatusBadge(device.registrationStatus)}
                          {getOnlineStatusBadge(device.isOnline)}
                        </div>
                      </TableCell>
                      <TableCell>{formatDate(device.lastSeen)}</TableCell>
                      <TableCell>{device.location || 'Not specified'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {device.authMethod.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="icon" onClick={() => setSelectedDevice(device)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[500px]">
                              <DialogHeader>
                                <DialogTitle>Device Details</DialogTitle>
                                <DialogDescription>
                                  Detailed information about the device.
                                </DialogDescription>
                              </DialogHeader>
                              <div className="grid gap-4 py-4">
                                <div className="grid grid-cols-4 items-center gap-4">
                                  <span className="font-medium text-right">Device ID:</span>
                                  <span className="col-span-3">{device.deviceUid}</span>
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                  <span className="font-medium text-right">Type:</span>
                                  <span className="col-span-3 capitalize">{device.deviceType.replace('_', ' ')}</span>
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                  <span className="font-medium text-right">Status:</span>
                                  <span className="col-span-3">{getStatusBadge(device.registrationStatus)}</span>
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                  <span className="font-medium text-right">Online:</span>
                                  <span className="col-span-3">{getOnlineStatusBadge(device.isOnline)}</span>
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                  <span className="font-medium text-right">Firmware:</span>
                                  <span className="col-span-3">{device.firmwareVersion || 'Not specified'}</span>
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                  <span className="font-medium text-right">Location:</span>
                                  <span className="col-span-3">{device.location || 'Not specified'}</span>
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                  <span className="font-medium text-right">Last Seen:</span>
                                  <span className="col-span-3">{formatDate(device.lastSeen)}</span>
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                  <span className="font-medium text-right">Auth Method:</span>
                                  <span className="col-span-3 capitalize">{device.authMethod.replace('_', ' ')}</span>
                                </div>
                              </div>
                              <DialogFooter>
                                <Button variant="secondary" onClick={() => setSelectedDevice(device)}>Close</Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                          
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="secondary" size="icon">
                                <FileCode className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Apply Template</DialogTitle>
                                <DialogDescription>
                                  Select a template to apply to this device.
                                </DialogDescription>
                              </DialogHeader>
                              <Form {...templateForm}>
                                <form onSubmit={templateForm.handleSubmit(onSubmitApplyTemplate)} className="space-y-6">
                                  <FormField
                                    control={templateForm.control}
                                    name="templateId"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Template</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                          <FormControl>
                                            <SelectTrigger>
                                              <SelectValue placeholder="Select a template" />
                                            </SelectTrigger>
                                          </FormControl>
                                          <SelectContent>
                                            {templates.map((template) => (
                                              <SelectItem key={template.id} value={template.id.toString()}>
                                                {template.name} ({template.deviceType})
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                        <FormDescription>
                                          The template will configure the device with predefined settings.
                                        </FormDescription>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                  <DialogFooter>
                                    <Button type="submit" disabled={applyTemplateMutation.isPending}>
                                      {applyTemplateMutation.isPending ? 'Applying...' : 'Apply Template'}
                                    </Button>
                                  </DialogFooter>
                                </form>
                              </Form>
                            </DialogContent>
                          </Dialog>
                          
                          <Button 
                            variant="secondary" 
                            size="icon" 
                            onClick={() => generateCredentials(device.id, device.authMethod)}
                          >
                            <ScanLine className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
        
        {/* Create Device Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Register New Device</DialogTitle>
              <DialogDescription>
                Add a new device to the registry to start monitoring and control.
              </DialogDescription>
            </DialogHeader>
            <Form {...deviceForm}>
              <form onSubmit={deviceForm.handleSubmit(onSubmitDeviceRegistration)} className="space-y-6">
                <FormField
                  control={deviceForm.control}
                  name="deviceUid"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Device ID</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter device ID" {...field} />
                      </FormControl>
                      <FormDescription>
                        Unique identifier for this device.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={deviceForm.control}
                  name="deviceType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Device Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select device type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="solar_pv">Solar PV</SelectItem>
                          <SelectItem value="battery_storage">Battery Storage</SelectItem>
                          <SelectItem value="ev_charger">EV Charger</SelectItem>
                          <SelectItem value="smart_meter">Smart Meter</SelectItem>
                          <SelectItem value="heat_pump">Heat Pump</SelectItem>
                          <SelectItem value="inverter">Inverter</SelectItem>
                          <SelectItem value="load_controller">Load Controller</SelectItem>
                          <SelectItem value="energy_gateway">Energy Gateway</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        The type of energy asset being registered.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={deviceForm.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location</FormLabel>
                      <FormControl>
                        <Input placeholder="Device location (optional)" {...field} />
                      </FormControl>
                      <FormDescription>
                        Physical location of the device.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={deviceForm.control}
                  name="authMethod"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Authentication Method</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select auth method" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          <SelectItem value="api_key">API Key</SelectItem>
                          <SelectItem value="certificate">Certificate</SelectItem>
                          <SelectItem value="username_password">Username/Password</SelectItem>
                          <SelectItem value="oauth">OAuth</SelectItem>
                          <SelectItem value="token">Token</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Method used for device authentication.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={deviceForm.control}
                  name="firmwareVersion"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Firmware Version</FormLabel>
                      <FormControl>
                        <Input placeholder="Device firmware version (optional)" {...field} />
                      </FormControl>
                      <FormDescription>
                        Current firmware version of the device.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <DialogFooter>
                  <Button type="submit" disabled={createDeviceMutation.isPending}>
                    {createDeviceMutation.isPending ? 'Registering...' : 'Register Device'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
        
        {/* Credentials Dialog */}
        <Dialog open={showCredentialsDialog} onOpenChange={setShowCredentialsDialog}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Device Credentials</DialogTitle>
              <DialogDescription>
                {credentials ? 'Credentials have been generated for this device.' : 'Generating credentials...'}
              </DialogDescription>
            </DialogHeader>
            
            {generateCredentialsMutation.isPending ? (
              <div className="py-6">
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-4 w-3/4 mt-2" />
                <Skeleton className="h-4 w-1/2 mt-2" />
              </div>
            ) : credentials ? (
              <div className="grid gap-4 py-4">
                {credentials.authMethod === 'api_key' && (
                  <>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <span className="font-medium text-right">API Key:</span>
                      <Input className="col-span-3" readOnly value={credentials.apiKey} />
                    </div>
                    {credentials.apiSecret && (
                      <div className="grid grid-cols-4 items-center gap-4">
                        <span className="font-medium text-right">API Secret:</span>
                        <Input className="col-span-3" readOnly value={credentials.apiSecret} />
                      </div>
                    )}
                  </>
                )}
                
                {credentials.authMethod === 'username_password' && (
                  <>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <span className="font-medium text-right">Username:</span>
                      <Input className="col-span-3" readOnly value={credentials.username} />
                    </div>
                    {credentials.password && (
                      <div className="grid grid-cols-4 items-center gap-4">
                        <span className="font-medium text-right">Password:</span>
                        <Input className="col-span-3" readOnly value={credentials.password} />
                      </div>
                    )}
                  </>
                )}
                
                {credentials.authMethod === 'token' && (
                  <div className="grid grid-cols-4 items-center gap-4">
                    <span className="font-medium text-right">Token:</span>
                    <Input className="col-span-3" readOnly value={credentials.tokenValue} />
                  </div>
                )}
                
                {credentials.authMethod === 'certificate' && (
                  <>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <span className="font-medium text-right">Certificate:</span>
                      <textarea 
                        className="col-span-3 min-h-[100px] rounded-md border border-input bg-background p-2" 
                        readOnly 
                        value={credentials.certificatePem}
                      />
                    </div>
                    {credentials.privateKeyPem && (
                      <div className="grid grid-cols-4 items-center gap-4">
                        <span className="font-medium text-right">Private Key:</span>
                        <textarea 
                          className="col-span-3 min-h-[100px] rounded-md border border-input bg-background p-2" 
                          readOnly 
                          value={credentials.privateKeyPem}
                        />
                      </div>
                    )}
                  </>
                )}
                
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Important!</AlertTitle>
                  <AlertDescription>
                    Copy these credentials now. For security reasons, the full credentials will not be displayed again.
                  </AlertDescription>
                </Alert>
              </div>
            ) : (
              <div className="py-6">
                <p>No credentials available. Please try again.</p>
              </div>
            )}
            
            <DialogFooter>
              <Button variant="secondary" onClick={() => setShowCredentialsDialog(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  };
  
  // Templates Tab
  const TemplatesTab = () => {
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    
    // Fetch templates
    const { 
      data: templates = [], 
      isLoading,
      error,
      refetch
    } = useQuery<ProvisioningTemplate[]>({
      queryKey: ['/api/device-registry/templates'],
    });
    
    // Create template mutation
    const createTemplateMutation = useMutation({
      mutationFn: async (formData: z.infer<typeof templateCreationSchema>) => {
        const response = await apiRequest('POST', '/api/device-registry/templates', formData);
        return await response.json();
      },
      onSuccess: () => {
        toast({
          title: "Template created",
          description: "The provisioning template has been created successfully."
        });
        setShowCreateDialog(false);
        queryClient.invalidateQueries({ queryKey: ['/api/device-registry/templates'] });
      },
      onError: (error: Error) => {
        toast({
          title: "Failed to create template",
          description: error.message,
          variant: "destructive"
        });
      }
    });
    
    // Form for template creation
    const templateForm = useForm<z.infer<typeof templateCreationSchema>>({
      resolver: zodResolver(templateCreationSchema),
      defaultValues: {
        name: '',
        deviceType: 'solar_pv',
        configTemplate: {},
        authMethod: 'api_key',
      },
    });
    
    const onSubmitCreateTemplate = (data: z.infer<typeof templateCreationSchema>) => {
      createTemplateMutation.mutate(data);
    };
    
    if (isLoading) {
      return <div className="grid gap-4 grid-cols-1">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-4 w-3/4 mt-2" />
              <Skeleton className="h-4 w-1/2 mt-2" />
            </CardContent>
          </Card>
        ))}
      </div>;
    }
    
    if (error) {
      return <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          {error instanceof Error ? error.message : 'Failed to load templates'}
        </AlertDescription>
      </Alert>;
    }
    
    return (
      <>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Provisioning Templates</h2>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" /> Refresh
            </Button>
            <Button onClick={() => setShowCreateDialog(true)}>
              <CirclePlus className="h-4 w-4 mr-2" /> Create Template
            </Button>
          </div>
        </div>
        
        {templates.length === 0 ? (
          <Card>
            <CardContent className="p-8 flex flex-col items-center justify-center text-center">
              <FileCode className="h-10 w-10 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No templates available</h3>
              <p className="text-muted-foreground mt-2 mb-4">
                Create a provisioning template to automate device configuration.
              </p>
              <Button onClick={() => setShowCreateDialog(true)}>
                <CirclePlus className="h-4 w-4 mr-2" /> Create New Template
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {templates.map((template) => (
              <Card key={template.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>{template.name}</CardTitle>
                      <CardDescription className="mt-1">{template.description || 'No description'}</CardDescription>
                    </div>
                    <Badge className="capitalize">{template.deviceType.replace('_', ' ')}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Auth Method:</span>
                      <span className="font-medium capitalize">{template.authMethod.replace('_', ' ')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Firmware Version:</span>
                      <span className="font-medium">{template.firmwareVersion || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Created:</span>
                      <span className="font-medium">{formatDate(template.createdAt)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status:</span>
                      <span>
                        {template.isActive ? (
                          <Badge variant="success" className="inline-flex items-center">
                            <Check className="h-3 w-3 mr-1" />Active
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="inline-flex items-center">
                            <CircleX className="h-3 w-3 mr-1" />Inactive
                          </Badge>
                        )}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        
        {/* Create Template Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create Provisioning Template</DialogTitle>
              <DialogDescription>
                Define a template for automating device configuration.
              </DialogDescription>
            </DialogHeader>
            <Form {...templateForm}>
              <form onSubmit={templateForm.handleSubmit(onSubmitCreateTemplate)} className="space-y-6">
                <FormField
                  control={templateForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Template Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter template name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={templateForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Input placeholder="Template description (optional)" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={templateForm.control}
                  name="deviceType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Device Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select device type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="solar_pv">Solar PV</SelectItem>
                          <SelectItem value="battery_storage">Battery Storage</SelectItem>
                          <SelectItem value="ev_charger">EV Charger</SelectItem>
                          <SelectItem value="smart_meter">Smart Meter</SelectItem>
                          <SelectItem value="heat_pump">Heat Pump</SelectItem>
                          <SelectItem value="inverter">Inverter</SelectItem>
                          <SelectItem value="load_controller">Load Controller</SelectItem>
                          <SelectItem value="energy_gateway">Energy Gateway</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={templateForm.control}
                  name="configTemplate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Configuration Template (JSON)</FormLabel>
                      <FormControl>
                        <textarea
                          className="min-h-[120px] w-full rounded-md border border-input bg-background p-2"
                          placeholder='{"setting1": "value1", "setting2": true}'
                          onChange={(e) => {
                            try {
                              const parsed = JSON.parse(e.target.value);
                              field.onChange(parsed);
                            } catch (error) {
                              // Allow invalid JSON during editing
                              field.onChange(e.target.value);
                            }
                          }}
                          defaultValue="{}"
                        />
                      </FormControl>
                      <FormDescription>
                        Enter the configuration template as a JSON object.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={templateForm.control}
                  name="firmwareVersion"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Firmware Version</FormLabel>
                      <FormControl>
                        <Input placeholder="Target firmware version (optional)" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={templateForm.control}
                  name="authMethod"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Authentication Method</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select auth method" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          <SelectItem value="api_key">API Key</SelectItem>
                          <SelectItem value="certificate">Certificate</SelectItem>
                          <SelectItem value="username_password">Username/Password</SelectItem>
                          <SelectItem value="oauth">OAuth</SelectItem>
                          <SelectItem value="token">Token</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <DialogFooter>
                  <Button type="submit" disabled={createTemplateMutation.isPending}>
                    {createTemplateMutation.isPending ? 'Creating...' : 'Create Template'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </>
    );
  };
  
  // Registration Codes Tab
  const RegistrationCodesTab = () => {
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
    const [selectedCodeId, setSelectedCodeId] = useState<number | null>(null);
    
    // Fetch codes
    const { 
      data: codes = [], 
      isLoading, 
      error,
      refetch
    } = useQuery<RegistrationCode[]>({
      queryKey: ['/api/device-registry/registration-codes'],
    });
    
    // Fetch templates for dropdown
    const { 
      data: templates = [] 
    } = useQuery<ProvisioningTemplate[]>({
      queryKey: ['/api/device-registry/templates'],
    });
    
    // Create registration code mutation
    const createCodeMutation = useMutation({
      mutationFn: async (formData: z.infer<typeof registrationCodeSchema>) => {
        const response = await apiRequest('POST', '/api/device-registry/registration-codes', formData);
        return await response.json();
      },
      onSuccess: () => {
        toast({
          title: "Registration code created",
          description: "The registration code has been created successfully."
        });
        setShowCreateDialog(false);
        queryClient.invalidateQueries({ queryKey: ['/api/device-registry/registration-codes'] });
      },
      onError: (error: Error) => {
        toast({
          title: "Failed to create registration code",
          description: error.message,
          variant: "destructive"
        });
      }
    });
    
    // Get QR code
    const getQrCodeMutation = useMutation({
      mutationFn: async (codeId: number) => {
        const response = await apiRequest('GET', `/api/device-registry/registration-codes/${codeId}/qr`);
        return await response.text();
      },
      onSuccess: (data) => {
        setQrCodeUrl(data);
      },
      onError: (error: Error) => {
        toast({
          title: "Failed to get QR code",
          description: error.message,
          variant: "destructive"
        });
      }
    });
    
    // Form for code generation
    const codeForm = useForm<z.infer<typeof registrationCodeSchema>>({
      resolver: zodResolver(registrationCodeSchema),
      defaultValues: {
        deviceType: undefined,
        templateId: undefined,
        expiryHours: 24,
        isOneTime: true,
        maxUses: 1,
      },
    });
    
    const onSubmitCreateCode = (data: z.infer<typeof registrationCodeSchema>) => {
      // Convert templateId to number if present
      if (data.templateId) {
        data.templateId = Number(data.templateId);
      }
      
      createCodeMutation.mutate(data);
    };
    
    const viewQrCode = (codeId: number) => {
      setSelectedCodeId(codeId);
      getQrCodeMutation.mutate(codeId);
    };
    
    if (isLoading) {
      return <div className="grid gap-4 grid-cols-1">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-4 w-3/4 mt-2" />
              <Skeleton className="h-4 w-1/2 mt-2" />
            </CardContent>
          </Card>
        ))}
      </div>;
    }
    
    if (error) {
      return <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          {error instanceof Error ? error.message : 'Failed to load registration codes'}
        </AlertDescription>
      </Alert>;
    }
    
    return (
      <>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Registration Codes</h2>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" /> Refresh
            </Button>
            <Button onClick={() => setShowCreateDialog(true)}>
              <CirclePlus className="h-4 w-4 mr-2" /> Generate Code
            </Button>
          </div>
        </div>
        
        {codes.length === 0 ? (
          <Card>
            <CardContent className="p-8 flex flex-col items-center justify-center text-center">
              <QrCode className="h-10 w-10 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No registration codes</h3>
              <p className="text-muted-foreground mt-2 mb-4">
                Generate a registration code to simplify device onboarding.
              </p>
              <Button onClick={() => setShowCreateDialog(true)}>
                <CirclePlus className="h-4 w-4 mr-2" /> Generate Registration Code
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Device Type</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead>Uses</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {codes.map((code) => (
                    <TableRow key={code.id}>
                      <TableCell className="font-medium">{code.code}</TableCell>
                      <TableCell>
                        {code.deviceType ? (
                          <div className="flex items-center">
                            {getDeviceTypeIcon(code.deviceType)}
                            <span className="capitalize">{code.deviceType.replace('_', ' ')}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Any</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {code.expiresAt ? formatDate(code.expiresAt) : 'Never'}
                      </TableCell>
                      <TableCell>
                        {code.useCount} / {code.isOneTime ? '1' : code.maxUses || '∞'}
                      </TableCell>
                      <TableCell>
                        {code.isActive ? (
                          <Badge variant="success" className="inline-flex items-center">
                            <Check className="h-3 w-3 mr-1" />Active
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="inline-flex items-center">
                            <CircleX className="h-3 w-3 mr-1" />Inactive
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>{formatDate(code.createdAt)}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={() => viewQrCode(code.id)}>
                          <QrCode className="h-4 w-4 mr-2" /> QR Code
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
        
        {/* Create Registration Code Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Generate Registration Code</DialogTitle>
              <DialogDescription>
                Create a code that can be used to register new devices.
              </DialogDescription>
            </DialogHeader>
            <Form {...codeForm}>
              <form onSubmit={codeForm.handleSubmit(onSubmitCreateCode)} className="space-y-6">
                <FormField
                  control={codeForm.control}
                  name="deviceType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Device Type (Optional)</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Any device type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="solar_pv">Solar PV</SelectItem>
                          <SelectItem value="battery_storage">Battery Storage</SelectItem>
                          <SelectItem value="ev_charger">EV Charger</SelectItem>
                          <SelectItem value="smart_meter">Smart Meter</SelectItem>
                          <SelectItem value="heat_pump">Heat Pump</SelectItem>
                          <SelectItem value="inverter">Inverter</SelectItem>
                          <SelectItem value="load_controller">Load Controller</SelectItem>
                          <SelectItem value="energy_gateway">Energy Gateway</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Restrict this code to a specific device type.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={codeForm.control}
                  name="templateId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Template (Optional)</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="No template" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {templates.map((template) => (
                            <SelectItem key={template.id} value={template.id.toString()}>
                              {template.name} ({template.deviceType})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Automatically apply this template when a device registers with this code.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={codeForm.control}
                  name="expiryHours"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Expiry (Hours)</FormLabel>
                      <FormControl>
                        <Input type="number" min="1" {...field} onChange={e => field.onChange(parseInt(e.target.value, 10))} />
                      </FormControl>
                      <FormDescription>
                        Number of hours until the code expires.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={codeForm.control}
                  name="isOneTime"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          checked={field.value}
                          onChange={e => field.onChange(e.target.checked)}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>One-time use</FormLabel>
                        <FormDescription>
                          The code can only be used once.
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={codeForm.control}
                  name="maxUses"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Maximum Uses</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="1" 
                          disabled={codeForm.watch('isOneTime')} 
                          {...field} 
                          onChange={e => field.onChange(parseInt(e.target.value, 10))} 
                        />
                      </FormControl>
                      <FormDescription>
                        Maximum number of times this code can be used.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <DialogFooter>
                  <Button type="submit" disabled={createCodeMutation.isPending}>
                    {createCodeMutation.isPending ? 'Generating...' : 'Generate Code'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
        
        {/* QR Code Dialog */}
        <Dialog open={!!qrCodeUrl} onOpenChange={() => setQrCodeUrl(null)}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>Registration QR Code</DialogTitle>
              <DialogDescription>
                Scan this QR code to register a new device.
              </DialogDescription>
            </DialogHeader>
            
            <div className="flex flex-col items-center justify-center p-4">
              {getQrCodeMutation.isPending ? (
                <Skeleton className="h-48 w-48" />
              ) : qrCodeUrl ? (
                <>
                  <img src={qrCodeUrl} alt="Registration QR Code" className="w-48 h-48" />
                  <p className="mt-4 text-sm text-center text-muted-foreground">
                    Let devices scan this code to automatically register with the system.
                  </p>
                </>
              ) : (
                <p>Could not generate QR code.</p>
              )}
            </div>
            
            <DialogFooter>
              <Button variant="secondary" onClick={() => setQrCodeUrl(null)}>Close</Button>
              {qrCodeUrl && (
                <Button variant="outline" onClick={() => {
                  const link = document.createElement('a');
                  link.href = qrCodeUrl;
                  link.download = 'registration-qr-code.png';
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}>
                  <DownloadCloud className="h-4 w-4 mr-2" /> Download
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  };
  
  // Health & Diagnostics Tab
  const HealthDiagnosticsTab = () => {
    // Fetch devices
    const { 
      data: devices = [], 
      isLoading,
    } = useQuery<DeviceRegistry[]>({
      queryKey: ['/api/device-registry/registry'],
    });
    
    if (isLoading) {
      return <div className="grid gap-4 grid-cols-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-4 w-3/4 mt-2" />
              <Skeleton className="h-4 w-1/2 mt-2" />
            </CardContent>
          </Card>
        ))}
      </div>;
    }
    
    // Group devices by status
    const activeDevices = devices.filter(d => d.registrationStatus === 'active');
    const pendingDevices = devices.filter(d => d.registrationStatus === 'pending');
    const offlineDevices = devices.filter(d => d.isOnline === false);
    
    return (
      <>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Health & Diagnostics</h2>
        </div>
        
        <div className="grid gap-4 md:grid-cols-3 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-center text-2xl">{activeDevices.length}</CardTitle>
              <CardDescription className="text-center">Active Devices</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-center">
                <Badge variant="success" className="text-center">
                  <Check className="h-4 w-4 mr-1" /> Online Devices
                </Badge>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-center text-2xl">{pendingDevices.length}</CardTitle>
              <CardDescription className="text-center">Pending Devices</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-center">
                <Badge variant="secondary" className="text-center">
                  Awaiting Provisioning
                </Badge>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-center text-2xl">{offlineDevices.length}</CardTitle>
              <CardDescription className="text-center">Offline Devices</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-center">
                <Badge variant="destructive" className="text-center">
                  <AlertTriangle className="h-4 w-4 mr-1" /> Require Attention
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Device Health Dashboard</CardTitle>
            <CardDescription>
              Real-time monitoring of device status and diagnostics
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Device ID</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Seen</TableHead>
                  <TableHead>Firmware</TableHead>
                  <TableHead>Health</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {devices.map((device) => {
                  // Calculate health status based on online status and last seen
                  let healthStatus: 'good' | 'warning' | 'critical' = 'good';
                  if (!device.isOnline) {
                    healthStatus = 'critical';
                  } else if (device.lastSeen) {
                    const lastSeen = new Date(device.lastSeen);
                    const now = new Date();
                    const hoursSinceLastSeen = (now.getTime() - lastSeen.getTime()) / (1000 * 60 * 60);
                    if (hoursSinceLastSeen > 24) {
                      healthStatus = 'warning';
                    }
                  }
                  
                  return (
                    <TableRow key={device.id}>
                      <TableCell className="font-medium">{device.deviceUid}</TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          {getDeviceTypeIcon(device.deviceType)}
                          <span className="capitalize">{device.deviceType.replace('_', ' ')}</span>
                        </div>
                      </TableCell>
                      <TableCell>{getOnlineStatusBadge(device.isOnline)}</TableCell>
                      <TableCell>{formatDate(device.lastSeen)}</TableCell>
                      <TableCell>{device.firmwareVersion || 'N/A'}</TableCell>
                      <TableCell>
                        {healthStatus === 'good' && (
                          <Badge variant="success" className="inline-flex items-center">
                            <Check className="h-3 w-3 mr-1" />Good
                          </Badge>
                        )}
                        {healthStatus === 'warning' && (
                          <Badge variant="secondary" className="inline-flex items-center bg-yellow-500/20 text-yellow-700 dark:text-yellow-400">
                            <AlertTriangle className="h-3 w-3 mr-1" />Warning
                          </Badge>
                        )}
                        {healthStatus === 'critical' && (
                          <Badge variant="destructive" className="inline-flex items-center">
                            <AlertTriangle className="h-3 w-3 mr-1" />Critical
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {devices.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-6">
                      <div className="flex flex-col items-center">
                        <AlertTriangle className="h-8 w-8 text-muted-foreground mb-2" />
                        <p className="text-muted-foreground">No devices found</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </>
    );
  };
  
  return (
    <div className="container mx-auto py-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Device Management</h1>
        <p className="text-muted-foreground mt-1">
          Register, monitor, and control your energy assets
        </p>
      </div>
      
      <Tabs defaultValue="devices" value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="devices">Device Registry</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="codes">Registration Codes</TabsTrigger>
          <TabsTrigger value="health">Health & Diagnostics</TabsTrigger>
        </TabsList>
        
        <TabsContent value="devices">
          <DeviceRegistryTab />
        </TabsContent>
        
        <TabsContent value="templates">
          <TemplatesTab />
        </TabsContent>
        
        <TabsContent value="codes">
          <RegistrationCodesTab />
        </TabsContent>
        
        <TabsContent value="health">
          <HealthDiagnosticsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DeviceRegistryPage;