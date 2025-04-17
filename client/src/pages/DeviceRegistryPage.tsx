import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, QrCode, Plus, Check, X, RefreshCw, Tag, Clock, Settings, History, Key } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import MainLayout from '@/components/layout/MainLayout';
import { ProtectedRoute } from '@/lib/protected-route';
import { apiRequest, queryClient } from '@/lib/queryClient';
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
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';

// Types for device registry data
type DeviceRegistryEntry = {
  id: number;
  deviceId?: number;
  registrationId: string;
  deviceUid: string;
  registrationStatus: 'pending' | 'registered' | 'provisioning' | 'active' | 'decommissioned' | 'rejected';
  deviceType: string;
  firmwareVersion?: string;
  lastConnected?: string;
  lastSeen?: string;
  metadata?: Record<string, any>;
  location?: string;
  isOnline: boolean;
  authMethod: 'none' | 'api_key' | 'certificate' | 'username_password' | 'oauth' | 'token';
  createdAt: string;
  updatedAt: string;
};

type ProvisioningTemplate = {
  id: number;
  name: string;
  description?: string;
  deviceType: string;
  configTemplate: Record<string, any>;
  firmwareVersion?: string;
  authMethod: 'none' | 'api_key' | 'certificate' | 'username_password' | 'oauth' | 'token';
  defaultSettings?: Record<string, any>;
  requiredCapabilities?: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type RegistrationCode = {
  id: number;
  code: string;
  qrCodeData?: string;
  registrationUrl?: string;
  provisioningTemplateId?: number;
  deviceType?: string;
  expiresAt?: string;
  isOneTime: boolean;
  useCount: number;
  maxUses: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

// Form schemas
const deviceRegistrationSchema = z.object({
  deviceUid: z.string().min(1, "Device UID is required"),
  deviceType: z.string().min(1, "Device type is required"),
  firmwareVersion: z.string().optional(),
  location: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

const templateSchema = z.object({
  name: z.string().min(1, "Template name is required"),
  description: z.string().optional(),
  deviceType: z.string().min(1, "Device type is required"),
  configTemplate: z.record(z.string(), z.any()),
  firmwareVersion: z.string().optional(),
  authMethod: z.enum(['none', 'api_key', 'certificate', 'username_password', 'oauth', 'token']),
  isActive: z.boolean().default(true),
});

const registrationCodeSchema = z.object({
  deviceType: z.string().min(1, "Device type is required"),
  templateId: z.number().optional(),
  expiryHours: z.number().int().min(1).max(8760).default(24),
  isOneTime: z.boolean().default(true),
});

const DeviceRegistryPage = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('devices');
  const [selectedDevice, setSelectedDevice] = useState<DeviceRegistryEntry | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<'register' | 'template' | 'code'>('register');

  // Queries
  const { data: devices, isLoading: isLoadingDevices } = useQuery<DeviceRegistryEntry[]>({
    queryKey: ['/api/device-registry/registry'],
    retry: 1,
  });

  const { data: templates, isLoading: isLoadingTemplates } = useQuery<ProvisioningTemplate[]>({
    queryKey: ['/api/device-registry/templates'],
    retry: 1,
  });

  const { data: registrationCodes, isLoading: isLoadingCodes } = useQuery<RegistrationCode[]>({
    queryKey: ['/api/device-registry/registration-codes'],
    retry: 1,
  });

  // Device type options (from your existing schema)
  const deviceTypeOptions = [
    'solar_pv',
    'battery_storage',
    'ev_charger',
    'smart_meter',
    'heat_pump',
    'inverter',
    'load_controller',
    'energy_gateway'
  ];

  // Auth method options
  const authMethodOptions = [
    'none',
    'api_key',
    'certificate',
    'username_password',
    'oauth',
    'token'
  ];

  // Mutations
  const registerDeviceMutation = useMutation({
    mutationFn: async (data: z.infer<typeof deviceRegistrationSchema>) => {
      const res = await apiRequest('POST', '/api/device-registry/registry', data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Device Registered",
        description: "Device has been registered successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/device-registry/registry'] });
      setIsDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Registration Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createTemplateMutation = useMutation({
    mutationFn: async (data: z.infer<typeof templateSchema>) => {
      const res = await apiRequest('POST', '/api/device-registry/templates', data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Template Created",
        description: "Provisioning template has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/device-registry/templates'] });
      setIsDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Template Creation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const generateCodeMutation = useMutation({
    mutationFn: async (data: z.infer<typeof registrationCodeSchema>) => {
      const res = await apiRequest('POST', '/api/device-registry/registration-codes', data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Registration Code Generated",
        description: "A new registration code has been generated.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/device-registry/registration-codes'] });
      setIsDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Code Generation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const applyTemplateMutation = useMutation({
    mutationFn: async ({ deviceId, templateId }: { deviceId: number, templateId: number }) => {
      const res = await apiRequest('POST', `/api/device-registry/registry/${deviceId}/apply-template`, { templateId });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Template Applied",
        description: "Provisioning template has been applied to the device.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/device-registry/registry'] });
      setSelectedDevice(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Template Application Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createCredentialsMutation = useMutation({
    mutationFn: async ({ deviceId, authMethod }: { deviceId: number, authMethod: string }) => {
      const res = await apiRequest('POST', `/api/device-registry/registry/${deviceId}/credentials`, { authMethod });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Credentials Created",
        description: "Device credentials have been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/device-registry/registry'] });
      setSelectedDevice(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Credential Creation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Get QR code image
  const fetchQrCode = async (codeId: number) => {
    try {
      const res = await fetch(`/api/device-registry/registration-codes/${codeId}/qr`);
      if (!res.ok) {
        throw new Error('Failed to fetch QR code');
      }
      const qrDataUrl = await res.text();
      setQrCodeUrl(qrDataUrl);
    } catch (error) {
      toast({
        title: "QR Code Error",
        description: "Failed to load QR code image.",
        variant: "destructive",
      });
    }
  };

  // Form handling
  const deviceForm = useForm<z.infer<typeof deviceRegistrationSchema>>({
    resolver: zodResolver(deviceRegistrationSchema),
    defaultValues: {
      deviceUid: '',
      deviceType: 'solar_pv',
      firmwareVersion: '',
      location: '',
    },
  });

  const templateForm = useForm<z.infer<typeof templateSchema>>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      name: '',
      description: '',
      deviceType: 'solar_pv',
      configTemplate: {},
      authMethod: 'api_key',
      isActive: true,
    },
  });

  const codeForm = useForm<z.infer<typeof registrationCodeSchema>>({
    resolver: zodResolver(registrationCodeSchema),
    defaultValues: {
      deviceType: 'solar_pv',
      expiryHours: 24,
      isOneTime: true,
    },
  });

  // UI helpers
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'pending': return 'bg-yellow-500';
      case 'registered': return 'bg-blue-500';
      case 'provisioning': return 'bg-purple-500';
      case 'decommissioned': return 'bg-gray-500';
      case 'rejected': return 'bg-red-500';
      default: return 'bg-gray-400';
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  const openDialog = (type: 'register' | 'template' | 'code') => {
    setDialogType(type);
    setIsDialogOpen(true);
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Device Registry & Provisioning</h1>
        <div className="flex gap-2">
          <Button onClick={() => openDialog('register')}>
            <Plus className="mr-2 h-4 w-4" /> Register Device
          </Button>
          <Button onClick={() => openDialog('template')} variant="outline">
            <Settings className="mr-2 h-4 w-4" /> Create Template
          </Button>
          <Button onClick={() => openDialog('code')} variant="outline">
            <QrCode className="mr-2 h-4 w-4" /> Generate Code
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="devices">Registered Devices</TabsTrigger>
          <TabsTrigger value="templates">Provisioning Templates</TabsTrigger>
          <TabsTrigger value="codes">Registration Codes</TabsTrigger>
        </TabsList>

        <TabsContent value="devices">
          <Card>
            <CardHeader>
              <CardTitle>Device Registry</CardTitle>
              <CardDescription>View and manage registered devices</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingDevices ? (
                <div className="flex justify-center p-4">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : !devices || devices.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No devices registered yet. Use the "Register Device" button to add your first device.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead>UID</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Firmware</TableHead>
                      <TableHead>Last Seen</TableHead>
                      <TableHead>Auth Method</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {devices.map((device) => (
                      <TableRow key={device.id}>
                        <TableCell>
                          <div className="flex items-center">
                            <div className={`h-3 w-3 rounded-full ${device.isOnline ? 'bg-green-500' : 'bg-gray-400'} mr-2`}></div>
                            <Badge className={getStatusColor(device.registrationStatus)}>
                              {device.registrationStatus}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>{device.deviceUid}</TableCell>
                        <TableCell>{device.deviceType}</TableCell>
                        <TableCell>{device.firmwareVersion || 'N/A'}</TableCell>
                        <TableCell>{formatDate(device.lastSeen)}</TableCell>
                        <TableCell>{device.authMethod}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setSelectedDevice(device)}
                            >
                              Details
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates">
          <Card>
            <CardHeader>
              <CardTitle>Provisioning Templates</CardTitle>
              <CardDescription>Manage device provisioning templates</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingTemplates ? (
                <div className="flex justify-center p-4">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : !templates || templates.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No templates created yet. Use the "Create Template" button to add your first template.
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {templates.map((template) => (
                    <Card key={template.id}>
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          {template.name}
                          {template.isActive ? (
                            <Badge variant="outline" className="bg-green-100 text-green-800">Active</Badge>
                          ) : (
                            <Badge variant="outline" className="bg-gray-100 text-gray-800">Inactive</Badge>
                          )}
                        </CardTitle>
                        <CardDescription>{template.description || 'No description'}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Device Type:</span>
                            <span className="font-medium">{template.deviceType}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Auth Method:</span>
                            <span className="font-medium">{template.authMethod}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Created:</span>
                            <span className="font-medium">{new Date(template.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </CardContent>
                      <CardFooter>
                        <Button variant="outline" size="sm" className="w-full">
                          View Details
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="codes">
          <Card>
            <CardHeader>
              <CardTitle>Registration Codes</CardTitle>
              <CardDescription>Manage device registration codes and QR codes</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingCodes ? (
                <div className="flex justify-center p-4">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : !registrationCodes || registrationCodes.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No registration codes generated yet. Use the "Generate Code" button to create a new registration code.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Device Type</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Usage</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {registrationCodes.map((code) => (
                      <TableRow key={code.id}>
                        <TableCell>
                          <code className="bg-gray-100 p-1 rounded">{code.code}</code>
                        </TableCell>
                        <TableCell>{code.deviceType || 'Any'}</TableCell>
                        <TableCell>{code.expiresAt ? formatDate(code.expiresAt) : 'Never'}</TableCell>
                        <TableCell>
                          {code.isActive ? (
                            <Badge variant="outline" className="bg-green-100 text-green-800">Active</Badge>
                          ) : (
                            <Badge variant="outline" className="bg-gray-100 text-gray-800">Inactive</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {code.useCount} / {code.isOneTime ? 1 : code.maxUses}
                        </TableCell>
                        <TableCell>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => fetchQrCode(code.id)}
                          >
                            <QrCode className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Device Details Dialog */}
      {selectedDevice && (
        <Dialog open={!!selectedDevice} onOpenChange={() => setSelectedDevice(null)}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Device Details</DialogTitle>
              <DialogDescription>
                Registration ID: {selectedDevice.registrationId}
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-lg font-medium">Device Information</h3>
                <div className="space-y-3 mt-2">
                  <div>
                    <Label>Status</Label>
                    <div className="flex items-center mt-1">
                      <div className={`h-3 w-3 rounded-full ${selectedDevice.isOnline ? 'bg-green-500' : 'bg-gray-400'} mr-2`}></div>
                      <Badge className={getStatusColor(selectedDevice.registrationStatus)}>
                        {selectedDevice.registrationStatus}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <Label>Device UID</Label>
                    <div className="text-sm mt-1">{selectedDevice.deviceUid}</div>
                  </div>
                  <div>
                    <Label>Device Type</Label>
                    <div className="text-sm mt-1">{selectedDevice.deviceType}</div>
                  </div>
                  <div>
                    <Label>Firmware Version</Label>
                    <div className="text-sm mt-1">{selectedDevice.firmwareVersion || 'N/A'}</div>
                  </div>
                  <div>
                    <Label>Location</Label>
                    <div className="text-sm mt-1">{selectedDevice.location || 'N/A'}</div>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-medium">Connectivity</h3>
                <div className="space-y-3 mt-2">
                  <div>
                    <Label>Authentication Method</Label>
                    <div className="text-sm mt-1">{selectedDevice.authMethod}</div>
                  </div>
                  <div>
                    <Label>Last Connected</Label>
                    <div className="text-sm mt-1">{formatDate(selectedDevice.lastConnected)}</div>
                  </div>
                  <div>
                    <Label>Last Seen</Label>
                    <div className="text-sm mt-1">{formatDate(selectedDevice.lastSeen)}</div>
                  </div>
                  <div>
                    <Label>Created At</Label>
                    <div className="text-sm mt-1">{formatDate(selectedDevice.createdAt)}</div>
                  </div>
                  <div>
                    <Label>Updated At</Label>
                    <div className="text-sm mt-1">{formatDate(selectedDevice.updatedAt)}</div>
                  </div>
                </div>
              </div>
            </div>
            <Separator />
            <div className="space-y-3">
              <h3 className="text-lg font-medium">Actions</h3>
              <div className="flex space-x-2">
                {selectedDevice.authMethod === 'none' && (
                  <div>
                    <Label className="mb-2 block">Create Credentials</Label>
                    <div className="flex space-x-2">
                      <Select onValueChange={(value) => {
                        createCredentialsMutation.mutate({ 
                          deviceId: selectedDevice.id, 
                          authMethod: value 
                        });
                      }}>
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="Select method" />
                        </SelectTrigger>
                        <SelectContent>
                          {authMethodOptions.filter(m => m !== 'none').map(method => (
                            <SelectItem key={method} value={method}>{method}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          createCredentialsMutation.mutate({ 
                            deviceId: selectedDevice.id, 
                            authMethod: 'api_key' 
                          });
                        }}
                        disabled={createCredentialsMutation.isPending}
                      >
                        {createCredentialsMutation.isPending && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        <Key className="mr-2 h-4 w-4" />
                        Create API Key
                      </Button>
                    </div>
                  </div>
                )}
                {selectedDevice.registrationStatus !== 'active' && templates && templates.length > 0 && (
                  <div>
                    <Label className="mb-2 block">Apply Template</Label>
                    <div className="flex space-x-2">
                      <Select onValueChange={(value) => {
                        applyTemplateMutation.mutate({ 
                          deviceId: selectedDevice.id, 
                          templateId: parseInt(value) 
                        });
                      }}>
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="Select template" />
                        </SelectTrigger>
                        <SelectContent>
                          {templates.map(template => (
                            <SelectItem key={template.id} value={template.id.toString()}>
                              {template.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button 
                        variant="outline" 
                        disabled={applyTemplateMutation.isPending}
                        onClick={() => {
                          if (templates.length > 0) {
                            applyTemplateMutation.mutate({ 
                              deviceId: selectedDevice.id, 
                              templateId: templates[0].id 
                            });
                          }
                        }}
                      >
                        {applyTemplateMutation.isPending && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        <Settings className="mr-2 h-4 w-4" />
                        Provision
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedDevice(null)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Forms Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogType === 'register' ? 'Register Device' : 
               dialogType === 'template' ? 'Create Provisioning Template' : 
               'Generate Registration Code'}
            </DialogTitle>
            <DialogDescription>
              {dialogType === 'register' ? 'Register a new device in the system' : 
               dialogType === 'template' ? 'Create a template for zero-touch provisioning' : 
               'Generate a code for device self-registration'}
            </DialogDescription>
          </DialogHeader>

          {dialogType === 'register' && (
            <Form {...deviceForm}>
              <form onSubmit={deviceForm.handleSubmit((data) => registerDeviceMutation.mutate(data))} className="space-y-4">
                <FormField
                  control={deviceForm.control}
                  name="deviceUid"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Device UID</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter device unique identifier" {...field} />
                      </FormControl>
                      <FormDescription>
                        This is usually the serial number or MAC address of the device
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
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select device type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {deviceTypeOptions.map(type => (
                            <SelectItem key={type} value={type}>{type.replace('_', ' ')}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
                        <Input placeholder="Enter firmware version" {...field} />
                      </FormControl>
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
                        <Input placeholder="Enter device location" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="submit" disabled={registerDeviceMutation.isPending}>
                    {registerDeviceMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Register Device
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          )}

          {dialogType === 'template' && (
            <Form {...templateForm}>
              <form onSubmit={templateForm.handleSubmit((data) => createTemplateMutation.mutate(data))} className="space-y-4">
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
                        <Input placeholder="Enter template description" {...field} />
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
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select device type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {deviceTypeOptions.map(type => (
                            <SelectItem key={type} value={type}>{type.replace('_', ' ')}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select auth method" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {authMethodOptions.map(method => (
                            <SelectItem key={method} value={method}>{method}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={templateForm.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Active</FormLabel>
                        <FormDescription>
                          Mark this template as active and available for use
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="submit" disabled={createTemplateMutation.isPending}>
                    {createTemplateMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Create Template
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          )}

          {dialogType === 'code' && (
            <Form {...codeForm}>
              <form onSubmit={codeForm.handleSubmit((data) => generateCodeMutation.mutate(data))} className="space-y-4">
                <FormField
                  control={codeForm.control}
                  name="deviceType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Device Type</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select device type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {deviceTypeOptions.map(type => (
                            <SelectItem key={type} value={type}>{type.replace('_', ' ')}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        The type of device this code can register
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {templates && templates.length > 0 && (
                  <FormField
                    control={codeForm.control}
                    name="templateId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Provisioning Template</FormLabel>
                        <Select 
                          onValueChange={(v) => field.onChange(parseInt(v))}
                          value={field.value?.toString()}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select template (optional)" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {templates.map(template => (
                              <SelectItem key={template.id} value={template.id.toString()}>
                                {template.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Optional template to apply during registration
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                <FormField
                  control={codeForm.control}
                  name="expiryHours"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Expiry Time (hours)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min={1} 
                          max={8760} 
                          {...field} 
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                        />
                      </FormControl>
                      <FormDescription>
                        Code will expire after this many hours (max 1 year)
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
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>One-time use</FormLabel>
                        <FormDescription>
                          Code can only be used once for device registration
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="submit" disabled={generateCodeMutation.isPending}>
                    {generateCodeMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Generate Code
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>

      {/* QR Code Dialog */}
      <Dialog open={!!qrCodeUrl} onOpenChange={() => setQrCodeUrl(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Registration QR Code</DialogTitle>
            <DialogDescription>
              Scan this QR code with the device to register it
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center">
            {qrCodeUrl && (
              <img 
                src={qrCodeUrl} 
                alt="Registration QR Code" 
                className="w-64 h-64 object-contain"
              />
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setQrCodeUrl(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export function DeviceRegistryPageWrapper() {
  return (
    <MainLayout>
      <DeviceRegistryPage />
    </MainLayout>
  );
}

export default function DeviceRegistryProtectedRoute() {
  return (
    <ProtectedRoute path="/device-registry" component={DeviceRegistryPageWrapper} />
  );
}