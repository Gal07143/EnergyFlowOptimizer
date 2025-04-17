import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { AlertCircle, RefreshCw, CheckCircle, XCircle, Settings, Zap, Activity, TimerIcon, Info, Battery, PlugZap } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useDevice, useDeviceReadings, useSendDeviceCommand } from '@/hooks/useDevice.ts';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { format, parseISO, subHours } from 'date-fns';

interface DeviceDetailPanelProps {
  deviceId: number;
  onClose?: () => void;
}

export default function DeviceDetailPanel({ deviceId, onClose }: DeviceDetailPanelProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const { data: device, isLoading, refetch } = useDevice(deviceId);
  const { data: readings = [], isLoading: readingsLoading } = useDeviceReadings(deviceId, 100);
  const { toast } = useToast();
  const sendCommand = useSendDeviceCommand();
  const [isSettingMode, setIsSettingMode] = useState(false);
  const [commandDialogOpen, setCommandDialogOpen] = useState(false);
  const [commandType, setCommandType] = useState('');
  const [commandValue, setCommandValue] = useState('');

  if (isLoading) {
    return (
      <Card className="w-full h-full flex items-center justify-center">
        <div className="flex flex-col items-center p-8">
          <RefreshCw className="h-8 w-8 animate-spin text-primary/70 mb-4" />
          <p className="text-muted-foreground">Loading device details...</p>
        </div>
      </Card>
    );
  }

  if (!device) {
    return (
      <Card className="w-full h-full">
        <CardHeader>
          <CardTitle className="text-destructive flex items-center">
            <AlertCircle className="h-5 w-5 mr-2" />
            Device Not Found
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p>The device with ID {deviceId} could not be found or has been removed.</p>
        </CardContent>
        <CardFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </CardFooter>
      </Card>
    );
  }

  // Format readings data for charts
  const chartData = readings.map(reading => ({
    time: format(new Date(reading.timestamp), 'HH:mm'),
    timestamp: reading.timestamp,
    power: reading.power || 0,
    voltage: reading.voltage || 0,
    current: reading.current || 0,
    temperature: reading.temperature || 0,
    soc: reading.soc || 0
  })).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  // Get device type-specific information and controls
  const getDeviceTypeInfo = () => {
    switch (device.type) {
      case 'battery':
      case 'battery storage':
        return {
          icon: <Battery className="h-5 w-5" />,
          color: 'text-green-500',
          primaryReading: {
            name: 'State of Charge',
            value: `${device.readings?.soc || 0}%`,
            component: <Progress value={device.readings?.soc || 0} className="h-2 w-full" />
          },
          secondaryReadings: [
            { name: 'Power', value: `${device.readings?.power || 0} kW` },
            { name: 'Voltage', value: `${device.readings?.voltage || 0} V` },
            { name: 'Temperature', value: `${device.readings?.temperature || 0}°C` }
          ],
          controls: [
            {
              name: 'Charge Mode',
              type: 'select',
              command: 'setChargeMode',
              options: ['Auto', 'Solar Only', 'Economy', 'Backup Reserve'],
              currentValue: device.settings?.chargeMode || 'Auto'
            },
            {
              name: 'Charge Limit',
              type: 'slider',
              command: 'setChargeLimit',
              min: 50,
              max: 100,
              step: 5,
              currentValue: device.settings?.chargeLimit || 80
            },
            {
              name: 'Discharge Limit',
              type: 'slider',
              command: 'setDischargeLimit',
              min: 0,
              max: 50,
              step: 5,
              currentValue: device.settings?.dischargeLimit || 20
            }
          ],
          availableCommands: [
            'setChargeMode', 'setChargeLimit', 'setDischargeLimit', 'startCharging', 'stopCharging'
          ]
        };
      case 'ev charger':
        return {
          icon: <PlugZap className="h-5 w-5" />,
          color: 'text-blue-500',
          primaryReading: {
            name: 'Charging Power',
            value: `${device.readings?.power || 0} kW`,
            component: 
              device.status === 'charging' ? 
                <div className="w-full bg-blue-100 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full animate-pulse" 
                    style={{ width: `${Math.min(100, (device.readings?.power || 0) / (device.capacity || 7) * 100)}%` }}
                  ></div>
                </div> : 
                <div className="w-full bg-gray-100 rounded-full h-2"></div>
          },
          secondaryReadings: [
            { name: 'Status', value: device.status || 'idle' },
            { name: 'Energy Delivered', value: `${device.readings?.energyDelivered || 0} kWh` },
            { name: 'Session Time', value: device.readings?.sessionTime || '00:00' }
          ],
          controls: [
            {
              name: 'Charging Limit',
              type: 'slider',
              command: 'setChargingLimit',
              min: 0,
              max: device.capacity || 7,
              step: 0.1,
              currentValue: device.settings?.chargingLimit || 7
            },
            {
              name: 'Smart Charging',
              type: 'switch',
              command: 'setSmartCharging',
              currentValue: device.settings?.smartCharging || false
            }
          ],
          availableCommands: [
            'startCharging', 'stopCharging', 'setChargingLimit', 'setSmartCharging'
          ]
        };
      case 'solar':
      case 'solar pv':
        return {
          icon: <Zap className="h-5 w-5" />,
          color: 'text-yellow-500',
          primaryReading: {
            name: 'Generation',
            value: `${device.readings?.power || 0} kW`,
            component: 
              <div className="w-full bg-yellow-100 rounded-full h-2">
                <div 
                  className="bg-yellow-500 h-2 rounded-full" 
                  style={{ width: `${Math.min(100, (device.readings?.power || 0) / (device.capacity || 5) * 100)}%` }}
                ></div>
              </div>
          },
          secondaryReadings: [
            { name: 'Daily Energy', value: `${device.readings?.dailyEnergy || 0} kWh` },
            { name: 'Voltage', value: `${device.readings?.voltage || 0} V` },
            { name: 'Efficiency', value: `${device.readings?.efficiency || 98}%` }
          ],
          controls: [
            {
              name: 'Export Limit',
              type: 'slider',
              command: 'setExportLimit',
              min: 0,
              max: device.capacity || 5,
              step: 0.1,
              currentValue: device.settings?.exportLimit || 5
            }
          ],
          availableCommands: [
            'setExportLimit', 'getInverterStatus'
          ]
        };
      case 'heat pump':
        return {
          icon: <Activity className="h-5 w-5" />,
          color: 'text-purple-500',
          primaryReading: {
            name: 'Operation Mode',
            value: device.readings?.mode || 'Off',
            component: 
              <Badge 
                variant="outline" 
                className={`
                  ${device.readings?.mode === 'Heating' ? 'border-red-200 text-red-700 bg-red-50' : 
                    device.readings?.mode === 'Cooling' ? 'border-blue-200 text-blue-700 bg-blue-50' : 
                    'border-gray-200 text-gray-700 bg-gray-50'}
                `}
              >
                {device.readings?.mode || 'Off'}
              </Badge>
          },
          secondaryReadings: [
            { name: 'Power', value: `${device.readings?.power || 0} kW` },
            { name: 'Temperature', value: `${device.readings?.targetTemp || 20}°C` },
            { name: 'COP', value: device.readings?.cop || '3.5' }
          ],
          controls: [
            {
              name: 'Operation Mode',
              type: 'select',
              command: 'setMode',
              options: ['Off', 'Heating', 'Cooling', 'Auto'],
              currentValue: device.settings?.mode || 'Auto'
            },
            {
              name: 'Target Temperature',
              type: 'slider',
              command: 'setTargetTemp',
              min: 16,
              max: 30,
              step: 0.5,
              currentValue: device.settings?.targetTemp || 21
            },
            {
              name: 'Smart Control',
              type: 'switch',
              command: 'setSmartControl',
              currentValue: device.settings?.smartControl || false
            }
          ],
          availableCommands: [
            'setMode', 'setTargetTemp', 'setSmartControl', 'setSchedule'
          ]
        };
      case 'smart meter':
        return {
          icon: <Activity className="h-5 w-5" />,
          color: 'text-blue-500',
          primaryReading: {
            name: 'Net Power',
            value: `${(device.readings?.import || 0) - (device.readings?.export || 0)} kW`,
            component: 
              <div className="flex items-center space-x-2">
                <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden relative">
                  {(device.readings?.import || 0) > (device.readings?.export || 0) ? (
                    <div 
                      className="bg-red-500 h-2 rounded-full absolute left-1/2" 
                      style={{ width: `${Math.min(50, ((device.readings?.import || 0) - (device.readings?.export || 0)) * 10)}%` }}
                    ></div>
                  ) : (
                    <div 
                      className="bg-green-500 h-2 rounded-full absolute right-1/2" 
                      style={{ width: `${Math.min(50, ((device.readings?.export || 0) - (device.readings?.import || 0)) * 10)}%` }}
                    ></div>
                  )}
                  <div className="absolute left-1/2 -translate-x-0.5 h-full w-1 bg-gray-300"></div>
                </div>
              </div>
          },
          secondaryReadings: [
            { name: 'Import', value: `${device.readings?.import || 0} kW` },
            { name: 'Export', value: `${device.readings?.export || 0} kW` },
            { name: 'Daily Usage', value: `${device.readings?.dailyEnergy || 0} kWh` }
          ],
          controls: [],
          availableCommands: [
            'resetMeter', 'getHistoricalData'
          ]
        };
      default:
        return {
          icon: <Info className="h-5 w-5" />,
          color: 'text-gray-500',
          primaryReading: {
            name: 'Power',
            value: `${device.readings?.power || 0} kW`,
            component: null
          },
          secondaryReadings: [
            { name: 'Status', value: device.status || 'unknown' }
          ],
          controls: [],
          availableCommands: []
        };
    }
  };

  const deviceInfo = getDeviceTypeInfo();

  // Handle command execution
  const executeCommand = async (command: string, params: any = {}) => {
    try {
      await sendCommand.mutateAsync({
        deviceId,
        command,
        params
      });
      
      toast({
        title: 'Command Sent',
        description: `The ${command} command was sent successfully`,
      });
      
      // Refetch device after command execution
      setTimeout(() => {
        refetch();
      }, 1000);
    } catch (error) {
      toast({
        title: 'Command Failed',
        description: `Failed to send ${command} command`,
        variant: 'destructive',
      });
    }
  };

  // Handle control changes
  const handleControlChange = (control: any, value: any) => {
    executeCommand(control.command, { [control.command.replace('set', '').toLowerCase()]: value });
  };

  // Handle custom command submission
  const handleCustomCommand = () => {
    if (!commandType) {
      toast({
        title: 'Command Required',
        description: 'Please select a command to send',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      const params = commandValue ? JSON.parse(commandValue) : {};
      executeCommand(commandType, params);
      setCommandDialogOpen(false);
      setCommandType('');
      setCommandValue('');
    } catch (error) {
      toast({
        title: 'Invalid Parameters',
        description: 'The command parameters are not valid JSON',
        variant: 'destructive',
      });
    }
  };

  return (
    <Card className="w-full h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <div>
          <CardTitle className="flex items-center">
            <span className={`mr-2 ${deviceInfo.color}`}>{deviceInfo.icon}</span>
            {device.name}
            <Badge
              variant="outline"
              className={`ml-2 ${
                device.status === 'online' || device.status === 'connected' || device.status === 'charging'
                  ? 'bg-green-50 text-green-700 border-green-200'
                  : device.status === 'offline' || device.status === 'disconnected'
                  ? 'bg-red-50 text-red-700 border-red-200'
                  : device.status === 'standby' || device.status === 'idle'
                  ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
                  : ''
              }`}
            >
              {device.status || 'unknown'}
            </Badge>
          </CardTitle>
          <CardDescription className="mt-1">
            {device.type} • ID: {device.id} • {device.location || 'No location'} • {device.manufacturer || 'Unknown'} {device.model || ''}
          </CardDescription>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="icon" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose}>
              <XCircle className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-[calc(100%-70px)]">
        <div className="px-6 border-b">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="telemetry">Telemetry</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="commands">Commands</TabsTrigger>
          </TabsList>
        </div>
        
        <div className="flex-1 overflow-auto">
          <TabsContent value="overview" className="p-6 h-full">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
              <div className="lg:col-span-2 space-y-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center">
                      <Activity className="h-4 w-4 mr-2 text-primary" />
                      Current Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-sm font-medium text-muted-foreground mb-1">{deviceInfo.primaryReading.name}</h3>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-2xl font-semibold">{deviceInfo.primaryReading.value}</span>
                          {device.capacity && <span className="text-sm text-muted-foreground">Capacity: {device.capacity} kW</span>}
                        </div>
                        {deviceInfo.primaryReading.component}
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4 pt-2">
                        {deviceInfo.secondaryReadings.map((reading, index) => (
                          <div key={index} className="bg-muted/50 p-3 rounded-lg">
                            <div className="text-sm text-muted-foreground">{reading.name}</div>
                            <div className="font-medium">{reading.value}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="h-[calc(100%-180px)]">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center">
                      <Activity className="h-4 w-4 mr-2 text-primary" />
                      Power Readings
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {readingsLoading ? (
                      <div className="h-64 flex items-center justify-center">
                        <RefreshCw className="h-6 w-6 animate-spin text-primary/70" />
                      </div>
                    ) : chartData.length > 0 ? (
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart
                            data={chartData}
                            margin={{ top: 5, right: 5, left: 0, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis 
                              dataKey="time"
                              tick={{ fontSize: 12 }}
                            />
                            <YAxis
                              tick={{ fontSize: 12 }}
                              width={30}
                            />
                            <Tooltip 
                              formatter={(value) => [`${value} kW`, 'Power']}
                              labelFormatter={(time) => `Time: ${time}`}
                            />
                            <Area 
                              type="monotone" 
                              dataKey="power" 
                              stroke="#3b82f6" 
                              fill="#93c5fd"
                              strokeWidth={2}
                              activeDot={{ r: 6 }}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="h-64 flex items-center justify-center">
                        <div className="text-center text-muted-foreground">
                          <p>No power data available</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
              
              <div className="space-y-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center">
                      <Info className="h-4 w-4 mr-2 text-primary" />
                      Device Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Type:</span>
                        <span className="font-medium">{device.type}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Manufacturer:</span>
                        <span className="font-medium">{device.manufacturer || 'Unknown'}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Model:</span>
                        <span className="font-medium">{device.model || 'Unknown'}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Serial Number:</span>
                        <span className="font-medium">{device.serialNumber || 'Unknown'}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Firmware:</span>
                        <span className="font-medium">{device.firmwareVersion || 'Unknown'}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">IP Address:</span>
                        <span className="font-medium">{device.ipAddress || 'Unknown'}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Last Connected:</span>
                        <span className="font-medium">
                          {device.lastConnected ? format(new Date(device.lastConnected), 'MMM d, yyyy HH:mm') : 'Unknown'}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center">
                      <Settings className="h-4 w-4 mr-2 text-primary" />
                      Quick Controls
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {deviceInfo.controls.length > 0 ? (
                      <div className="space-y-4">
                        {deviceInfo.controls.map((control, index) => (
                          <div key={index} className="space-y-2">
                            <Label>{control.name}</Label>
                            {control.type === 'slider' && (
                              <div className="flex items-center space-x-4">
                                <Slider
                                  min={control.min}
                                  max={control.max}
                                  step={control.step}
                                  value={[control.currentValue]}
                                  onValueChange={(values) => handleControlChange(control, values[0])}
                                  className="flex-1"
                                />
                                <div className="w-12 text-right font-medium">
                                  {control.currentValue}
                                </div>
                              </div>
                            )}
                            {control.type === 'switch' && (
                              <Switch
                                checked={control.currentValue}
                                onCheckedChange={(checked) => handleControlChange(control, checked)}
                              />
                            )}
                            {control.type === 'select' && (
                              <Select
                                defaultValue={control.currentValue}
                                onValueChange={(value) => handleControlChange(control, value)}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {control.options.map((option) => (
                                    <SelectItem key={option} value={option}>
                                      {option}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-2 text-sm text-muted-foreground">
                        No quick controls available for this device type.
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Alert>
                  <AlertTitle className="flex items-center">
                    <TimerIcon className="h-4 w-4 mr-2" />
                    Device Uptime
                  </AlertTitle>
                  <AlertDescription>
                    <div className="mt-2">
                      <div className="text-2xl font-semibold">
                        {device.uptime || '99.8%'}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Last restart: {device.lastRestart ? format(new Date(device.lastRestart), 'MMM d, yyyy') : 'Unknown'}
                      </p>
                    </div>
                  </AlertDescription>
                </Alert>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="telemetry" className="p-6 h-full">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Device Telemetry</h3>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => refetch()}
                  className="flex items-center"
                >
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                  Refresh Data
                </Button>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Power Chart */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center">
                      <Zap className="h-4 w-4 mr-2 text-primary" />
                      Power Consumption
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {readingsLoading ? (
                      <div className="h-64 flex items-center justify-center">
                        <RefreshCw className="h-6 w-6 animate-spin text-primary/70" />
                      </div>
                    ) : chartData.length > 0 ? (
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart
                            data={chartData}
                            margin={{ top: 5, right: 5, left: 0, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis 
                              dataKey="time"
                              tick={{ fontSize: 12 }}
                            />
                            <YAxis
                              tick={{ fontSize: 12 }}
                              domain={['auto', 'auto']}
                              label={{ value: 'kW', angle: -90, position: 'insideLeft', dy: 40 }}
                              width={40}
                            />
                            <Tooltip 
                              formatter={(value) => [`${value} kW`, 'Power']}
                            />
                            <Line 
                              type="monotone" 
                              dataKey="power" 
                              stroke="#2563eb" 
                              strokeWidth={2}
                              dot={false}
                              activeDot={{ r: 6 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="h-64 flex items-center justify-center">
                        <div className="text-center text-muted-foreground">
                          <p>No power data available</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
                
                {/* Voltage Chart - Only show for relevant devices */}
                {['battery', 'battery storage', 'solar', 'solar pv', 'smart meter'].includes(device.type || '') && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center">
                        <Activity className="h-4 w-4 mr-2 text-primary" />
                        Voltage
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {readingsLoading ? (
                        <div className="h-64 flex items-center justify-center">
                          <RefreshCw className="h-6 w-6 animate-spin text-primary/70" />
                        </div>
                      ) : chartData.length > 0 && chartData.some(d => d.voltage > 0) ? (
                        <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart
                              data={chartData}
                              margin={{ top: 5, right: 5, left: 0, bottom: 5 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                              <XAxis 
                                dataKey="time"
                                tick={{ fontSize: 12 }}
                              />
                              <YAxis
                                tick={{ fontSize: 12 }}
                                domain={['auto', 'auto']}
                                label={{ value: 'V', angle: -90, position: 'insideLeft', dy: 40 }}
                                width={40}
                              />
                              <Tooltip 
                                formatter={(value) => [`${value} V`, 'Voltage']}
                              />
                              <Line 
                                type="monotone" 
                                dataKey="voltage" 
                                stroke="#a855f7" 
                                strokeWidth={2}
                                dot={false}
                                activeDot={{ r: 6 }}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <div className="h-64 flex items-center justify-center">
                          <div className="text-center text-muted-foreground">
                            <p>No voltage data available</p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
                
                {/* SoC Chart - Only for batteries */}
                {['battery', 'battery storage'].includes(device.type || '') && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center">
                        <Battery className="h-4 w-4 mr-2 text-primary" />
                        State of Charge
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {readingsLoading ? (
                        <div className="h-64 flex items-center justify-center">
                          <RefreshCw className="h-6 w-6 animate-spin text-primary/70" />
                        </div>
                      ) : chartData.length > 0 && chartData.some(d => d.soc > 0) ? (
                        <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart
                              data={chartData}
                              margin={{ top: 5, right: 5, left: 0, bottom: 5 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                              <XAxis 
                                dataKey="time"
                                tick={{ fontSize: 12 }}
                              />
                              <YAxis
                                tick={{ fontSize: 12 }}
                                domain={[0, 100]}
                                label={{ value: '%', angle: -90, position: 'insideLeft', dy: 40 }}
                                width={40}
                              />
                              <Tooltip 
                                formatter={(value) => [`${value}%`, 'SoC']}
                              />
                              <Line 
                                type="monotone" 
                                dataKey="soc" 
                                stroke="#22c55e" 
                                strokeWidth={2}
                                dot={false}
                                activeDot={{ r: 6 }}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <div className="h-64 flex items-center justify-center">
                          <div className="text-center text-muted-foreground">
                            <p>No SoC data available</p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
                
                {/* Temperature Chart - For relevant devices */}
                {['battery', 'battery storage', 'heat pump'].includes(device.type || '') && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center">
                        <Activity className="h-4 w-4 mr-2 text-primary" />
                        Temperature
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {readingsLoading ? (
                        <div className="h-64 flex items-center justify-center">
                          <RefreshCw className="h-6 w-6 animate-spin text-primary/70" />
                        </div>
                      ) : chartData.length > 0 && chartData.some(d => d.temperature > 0) ? (
                        <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart
                              data={chartData}
                              margin={{ top: 5, right: 5, left: 0, bottom: 5 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                              <XAxis 
                                dataKey="time"
                                tick={{ fontSize: 12 }}
                              />
                              <YAxis
                                tick={{ fontSize: 12 }}
                                domain={['auto', 'auto']}
                                label={{ value: '°C', angle: -90, position: 'insideLeft', dy: 40 }}
                                width={40}
                              />
                              <Tooltip 
                                formatter={(value) => [`${value}°C`, 'Temperature']}
                              />
                              <Line 
                                type="monotone" 
                                dataKey="temperature" 
                                stroke="#ef4444" 
                                strokeWidth={2}
                                dot={false}
                                activeDot={{ r: 6 }}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <div className="h-64 flex items-center justify-center">
                          <div className="text-center text-muted-foreground">
                            <p>No temperature data available</p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center">
                    <Activity className="h-4 w-4 mr-2 text-primary" />
                    Raw Telemetry Data
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {readingsLoading ? (
                    <div className="h-64 flex items-center justify-center">
                      <RefreshCw className="h-6 w-6 animate-spin text-primary/70" />
                    </div>
                  ) : readings.length > 0 ? (
                    <div className="rounded-md border">
                      <div className="grid grid-cols-5 gap-4 bg-muted/50 p-3 font-medium border-b">
                        <div>Timestamp</div>
                        <div>Power (kW)</div>
                        <div>Voltage (V)</div>
                        <div>Current (A)</div>
                        <div>Other Readings</div>
                      </div>
                      <div className="max-h-64 overflow-y-auto">
                        {readings.slice(0, 20).map((reading, i) => (
                          <div key={i} className="grid grid-cols-5 gap-4 p-3 border-b last:border-b-0 text-sm">
                            <div>{format(new Date(reading.timestamp), 'yyyy-MM-dd HH:mm:ss')}</div>
                            <div>{reading.power || 0}</div>
                            <div>{reading.voltage || 0}</div>
                            <div>{reading.current || 0}</div>
                            <div>
                              {Object.entries(reading)
                                .filter(([key]) => !['timestamp', 'power', 'voltage', 'current', 'id', 'deviceId'].includes(key))
                                .map(([key, value]) => (
                                  <div key={key} className="text-xs">
                                    <span className="text-muted-foreground">{key}:</span> {value}
                                  </div>
                                ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center text-muted-foreground p-4">
                      No telemetry data available for this device
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="settings" className="p-6 h-full">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Device Settings</h3>
                <div className="flex items-center space-x-2">
                  <Button 
                    variant={isSettingMode ? 'default' : 'outline'} 
                    size="sm" 
                    onClick={() => setIsSettingMode(!isSettingMode)}
                    className="flex items-center"
                  >
                    <Settings className="h-3.5 w-3.5 mr-1.5" />
                    {isSettingMode ? 'Save Settings' : 'Edit Settings'}
                  </Button>
                </div>
              </div>
              
              {/* General Settings */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">General Settings</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="device-name">Device Name</Label>
                        <Input 
                          id="device-name" 
                          defaultValue={device.name} 
                          disabled={!isSettingMode}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="device-location">Location</Label>
                        <Input 
                          id="device-location" 
                          defaultValue={device.location || ''} 
                          disabled={!isSettingMode}
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="device-description">Description</Label>
                      <Input 
                        id="device-description" 
                        defaultValue={device.description || ''} 
                        disabled={!isSettingMode}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Device Type Specific Settings */}
              <Accordion type="single" defaultValue="device-settings" collapsible>
                <AccordionItem value="device-settings">
                  <AccordionTrigger className="text-base font-medium">
                    {device.type} Settings
                  </AccordionTrigger>
                  <AccordionContent className="pt-2">
                    <div className="space-y-4">
                      {deviceInfo.controls.map((control, index) => (
                        <div key={index} className="space-y-2">
                          <Label>{control.name}</Label>
                          {control.type === 'slider' && (
                            <div className="flex items-center space-x-4">
                              <Slider
                                min={control.min}
                                max={control.max}
                                step={control.step}
                                value={[control.currentValue]}
                                onValueChange={(values) => handleControlChange(control, values[0])}
                                disabled={!isSettingMode}
                                className="flex-1"
                              />
                              <div className="w-16 text-right font-medium">
                                {control.currentValue}
                              </div>
                            </div>
                          )}
                          {control.type === 'switch' && (
                            <Switch
                              checked={control.currentValue}
                              onCheckedChange={(checked) => handleControlChange(control, checked)}
                              disabled={!isSettingMode}
                            />
                          )}
                          {control.type === 'select' && (
                            <Select
                              defaultValue={control.currentValue}
                              onValueChange={(value) => handleControlChange(control, value)}
                              disabled={!isSettingMode}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select..." />
                              </SelectTrigger>
                              <SelectContent>
                                {control.options.map((option) => (
                                  <SelectItem key={option} value={option}>
                                    {option}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                      ))}
                      
                      {deviceInfo.controls.length === 0 && (
                        <div className="text-sm text-muted-foreground p-4">
                          No configurable settings available for this device type
                        </div>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="communication-settings">
                  <AccordionTrigger className="text-base font-medium">
                    Communication Settings
                  </AccordionTrigger>
                  <AccordionContent className="pt-2">
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="device-ip">IP Address</Label>
                          <Input 
                            id="device-ip" 
                            defaultValue={device.ipAddress || ''} 
                            disabled={!isSettingMode}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="device-port">Port</Label>
                          <Input 
                            id="device-port" 
                            defaultValue={device.port || ''} 
                            disabled={!isSettingMode}
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="protocol-select">Communication Protocol</Label>
                        <Select disabled={!isSettingMode} defaultValue={device.protocol || 'mqtt'}>
                          <SelectTrigger id="protocol-select">
                            <SelectValue placeholder="Select protocol..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="mqtt">MQTT</SelectItem>
                            <SelectItem value="modbus">Modbus TCP</SelectItem>
                            <SelectItem value="http">HTTP/REST</SelectItem>
                            <SelectItem value="ocpp">OCPP</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="advanced-settings">
                  <AccordionTrigger className="text-base font-medium">
                    Advanced Settings
                  </AccordionTrigger>
                  <AccordionContent className="pt-2">
                    <div className="space-y-4">
                      <Card className="bg-muted/50">
                        <CardContent className="pt-4">
                          <div className="text-sm text-muted-foreground">
                            <p className="mb-2">Warning: Changing advanced settings may affect device performance.</p>
                            <p>Only modify these settings if you understand their impact.</p>
                          </div>
                        </CardContent>
                      </Card>
                      
                      <div className="space-y-2">
                        <Label>Data Logging Interval</Label>
                        <Select disabled={!isSettingMode} defaultValue="5min">
                          <SelectTrigger>
                            <SelectValue placeholder="Select interval..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="10sec">10 seconds</SelectItem>
                            <SelectItem value="30sec">30 seconds</SelectItem>
                            <SelectItem value="1min">1 minute</SelectItem>
                            <SelectItem value="5min">5 minutes</SelectItem>
                            <SelectItem value="15min">15 minutes</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label>Allow Remote Control</Label>
                          <Switch checked={true} disabled={!isSettingMode} />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label>Automatic Firmware Updates</Label>
                          <Switch checked={true} disabled={!isSettingMode} />
                        </div>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </TabsContent>
          
          <TabsContent value="commands" className="p-6 h-full">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Device Commands</h3>
                <Dialog open={commandDialogOpen} onOpenChange={setCommandDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="flex items-center">
                      <Settings className="h-4 w-4 mr-1.5" />
                      Send Custom Command
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Send Custom Command</DialogTitle>
                      <DialogDescription>
                        Send a command to the device with optional parameters.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="command-type">Command</Label>
                        <Select
                          value={commandType}
                          onValueChange={setCommandType}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select command..." />
                          </SelectTrigger>
                          <SelectContent>
                            {deviceInfo.availableCommands.map((cmd) => (
                              <SelectItem key={cmd} value={cmd}>
                                {cmd}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="command-params">Parameters (JSON)</Label>
                        <Input
                          id="command-params"
                          placeholder='{"param": "value"}'
                          value={commandValue}
                          onChange={(e) => setCommandValue(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">Example: {"{ \"mode\": \"auto\" }"}</p>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setCommandDialogOpen(false)}>Cancel</Button>
                      <Button onClick={handleCustomCommand}>Send Command</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center">
                    <Zap className="h-4 w-4 mr-2 text-primary" />
                    Quick Commands
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {device.type === 'battery' || device.type === 'battery storage' ? (
                      <>
                        <Button 
                          variant="outline" 
                          className="justify-start"
                          onClick={() => executeCommand('startCharging')}
                        >
                          <Zap className="h-4 w-4 mr-2 text-green-500" />
                          Start Charging
                        </Button>
                        <Button 
                          variant="outline" 
                          className="justify-start"
                          onClick={() => executeCommand('stopCharging')}
                        >
                          <Zap className="h-4 w-4 mr-2 text-red-500" />
                          Stop Charging
                        </Button>
                        <Button 
                          variant="outline" 
                          className="justify-start"
                          onClick={() => executeCommand('setChargeMode', { mode: 'solar_only' })}
                        >
                          <Zap className="h-4 w-4 mr-2 text-yellow-500" />
                          Solar Only Mode
                        </Button>
                        <Button 
                          variant="outline" 
                          className="justify-start"
                          onClick={() => executeCommand('setChargeMode', { mode: 'economy' })}
                        >
                          <Zap className="h-4 w-4 mr-2 text-blue-500" />
                          Economy Mode
                        </Button>
                      </>
                    ) : device.type === 'ev charger' ? (
                      <>
                        <Button 
                          variant="outline" 
                          className="justify-start"
                          onClick={() => executeCommand('startCharging')}
                        >
                          <PlugZap className="h-4 w-4 mr-2 text-green-500" />
                          Start Charging
                        </Button>
                        <Button 
                          variant="outline" 
                          className="justify-start"
                          onClick={() => executeCommand('stopCharging')}
                        >
                          <PlugZap className="h-4 w-4 mr-2 text-red-500" />
                          Stop Charging
                        </Button>
                        <Button 
                          variant="outline" 
                          className="justify-start"
                          onClick={() => executeCommand('setChargingLimit', { limit: 7 })}
                        >
                          <Zap className="h-4 w-4 mr-2 text-blue-500" />
                          Set Max Power (7 kW)
                        </Button>
                        <Button 
                          variant="outline" 
                          className="justify-start"
                          onClick={() => executeCommand('setSmartCharging', { enabled: true })}
                        >
                          <Settings className="h-4 w-4 mr-2 text-purple-500" />
                          Enable Smart Charging
                        </Button>
                      </>
                    ) : device.type === 'solar' || device.type === 'solar pv' ? (
                      <>
                        <Button 
                          variant="outline" 
                          className="justify-start"
                          onClick={() => executeCommand('getInverterStatus')}
                        >
                          <Activity className="h-4 w-4 mr-2 text-yellow-500" />
                          Get Inverter Status
                        </Button>
                        <Button 
                          variant="outline" 
                          className="justify-start"
                          onClick={() => executeCommand('setExportLimit', { limit: 5 })}
                        >
                          <Zap className="h-4 w-4 mr-2 text-blue-500" />
                          Set Export Limit (5 kW)
                        </Button>
                        <Button 
                          variant="outline" 
                          className="justify-start"
                          onClick={() => executeCommand('getDailyYield')}
                        >
                          <Activity className="h-4 w-4 mr-2 text-green-500" />
                          Get Daily Yield
                        </Button>
                      </>
                    ) : device.type === 'heat pump' ? (
                      <>
                        <Button 
                          variant="outline" 
                          className="justify-start"
                          onClick={() => executeCommand('setMode', { mode: 'Heating' })}
                        >
                          <Zap className="h-4 w-4 mr-2 text-red-500" />
                          Set Heating Mode
                        </Button>
                        <Button 
                          variant="outline" 
                          className="justify-start"
                          onClick={() => executeCommand('setMode', { mode: 'Cooling' })}
                        >
                          <Zap className="h-4 w-4 mr-2 text-blue-500" />
                          Set Cooling Mode
                        </Button>
                        <Button 
                          variant="outline" 
                          className="justify-start"
                          onClick={() => executeCommand('setTargetTemp', { temp: 21 })}
                        >
                          <Settings className="h-4 w-4 mr-2 text-purple-500" />
                          Set Target Temp (21°C)
                        </Button>
                        <Button 
                          variant="outline" 
                          className="justify-start"
                          onClick={() => executeCommand('setMode', { mode: 'Off' })}
                        >
                          <Settings className="h-4 w-4 mr-2 text-gray-500" />
                          Turn Off
                        </Button>
                      </>
                    ) : device.type === 'smart meter' ? (
                      <>
                        <Button 
                          variant="outline" 
                          className="justify-start"
                          onClick={() => executeCommand('getHistoricalData')}
                        >
                          <Activity className="h-4 w-4 mr-2 text-blue-500" />
                          Get Historical Data
                        </Button>
                        <Button 
                          variant="outline" 
                          className="justify-start"
                          onClick={() => executeCommand('resetMeter')}
                        >
                          <RefreshCw className="h-4 w-4 mr-2 text-purple-500" />
                          Reset Meter
                        </Button>
                      </>
                    ) : (
                      <div className="col-span-2 py-2 text-sm text-muted-foreground">
                        No quick commands available for this device type.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center">
                    <Activity className="h-4 w-4 mr-2 text-primary" />
                    Command History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border">
                    <div className="flex flex-row bg-muted/50 p-3 font-medium border-b">
                      <div className="flex-1">Command</div>
                      <div className="w-1/5">Timestamp</div>
                      <div className="w-1/5">Status</div>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      {/* Sample command history - In a real app this would come from the API */}
                      {[
                        { command: 'getStatus', timestamp: new Date(Date.now() - 1000000), status: 'success' },
                        { command: 'setChargeMode', timestamp: new Date(Date.now() - 100000000), status: 'success' },
                        { command: 'getReadings', timestamp: new Date(Date.now() - 140000000), status: 'success' },
                        { command: 'firmwareUpdate', timestamp: new Date(Date.now() - 200000000), status: 'failed' },
                      ].map((cmd, i) => (
                        <div key={i} className="flex flex-row p-3 border-b last:border-b-0 text-sm">
                          <div className="flex-1 font-medium">{cmd.command}</div>
                          <div className="w-1/5">{format(cmd.timestamp, 'MM/dd HH:mm')}</div>
                          <div className="w-1/5">
                            <Badge variant="outline" className={
                              cmd.status === 'success' 
                                ? 'bg-green-50 text-green-700 border-green-200' 
                                : 'bg-red-50 text-red-700 border-red-200'
                            }>
                              {cmd.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </Card>
  );
}