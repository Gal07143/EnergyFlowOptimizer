import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2, AlertTriangle } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { apiRequest } from "@/lib/queryClient";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface ManufacturerConnectionSettingsProps {
  manufacturerId: number | null;
  deviceCatalogId: number | null;
  deviceType: string;
  protocol: string;
  onSettingsChange: (settings: any) => void;
  initialSettings?: any;
}

interface ConnectionTemplate {
  id: number;
  name: string;
  description: string;
  protocol: string;
  settings: any;
  isDefault: boolean;
}

interface ModbusSettings {
  connection: 'tcp' | 'rtu';
  ipAddress?: string;
  port?: number;
  slaveId?: number;
  baudRate?: number;
  dataBits?: number;
  parity?: 'none' | 'even' | 'odd';
  stopBits?: number;
  serialPort?: string;
  timeout?: number;
  registers?: {
    address: number;
    name: string;
    type: string;
    scale?: number;
    unit?: string;
  }[];
}

interface MqttSettings {
  brokerUrl: string;
  port: number;
  clientId: string;
  username?: string;
  password?: string;
  useTls: boolean;
  topicPrefix: string;
  qos: 0 | 1 | 2;
  topics?: {
    telemetry: string;
    status: string;
    commands: string;
  };
}

interface OcppSettings {
  version: string;
  centralSystemUrl: string;
  chargePointId: string;
  authenticationKey?: string;
  heartbeatInterval: number;
  meterValuesInterval: number;
  connectors: number;
}

interface EEBusSettings {
  serverAddress: string;
  port: number;
  deviceId: string;
  brand: string;
  model: string;
  serialNumber: string;
  features: string[];
}

type ConnectionSettings = ModbusSettings | MqttSettings | OcppSettings | EEBusSettings;

export function ManufacturerConnectionSettings({
  manufacturerId,
  deviceCatalogId,
  deviceType,
  protocol,
  onSettingsChange,
  initialSettings
}: ManufacturerConnectionSettingsProps) {
  const [settings, setSettings] = useState<ConnectionSettings>(initialSettings || {});
  const [selectedTemplate, setSelectedTemplate] = useState<string>("default");

  // Fetch manufacturer-specific connection templates
  const { 
    data: connectionTemplates = [], 
    isLoading,
    error 
  } = useQuery<ConnectionTemplate[]>({
    queryKey: ['/api/connection-templates', manufacturerId, deviceCatalogId, protocol],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      if (manufacturerId) queryParams.append('manufacturerId', manufacturerId.toString());
      if (deviceCatalogId) queryParams.append('deviceCatalogId', deviceCatalogId.toString());
      if (protocol) queryParams.append('protocol', protocol);
      
      const response = await apiRequest('GET', `/api/connection-templates?${queryParams.toString()}`);
      return await response.json();
    },
    enabled: !!protocol && (!!manufacturerId || !!deviceCatalogId)
  });

  // Update settings when template changes
  useEffect(() => {
    if (selectedTemplate && selectedTemplate !== "custom") {
      const template = connectionTemplates.find(t => t.id.toString() === selectedTemplate);
      if (template) {
        setSettings(template.settings);
        onSettingsChange(template.settings);
      }
    }
  }, [selectedTemplate, connectionTemplates]);

  // Update parent component when settings change
  useEffect(() => {
    if (Object.keys(settings).length > 0) {
      onSettingsChange(settings);
    }
  }, [settings]);

  const handleSettingChange = (path: string, value: any) => {
    const newSettings = { ...settings };
    const pathParts = path.split('.');
    
    let current: any = newSettings;
    for (let i = 0; i < pathParts.length - 1; i++) {
      const part = pathParts[i];
      if (!current[part]) current[part] = {};
      current = current[part];
    }
    
    current[pathParts[pathParts.length - 1]] = value;
    setSettings(newSettings);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          Failed to load connection templates: {(error as Error).message}
        </AlertDescription>
      </Alert>
    );
  }

  // Render protocol-specific configuration
  const renderProtocolSettings = () => {
    switch (protocol) {
      case 'modbus':
      case 'modbus_tcp':
      case 'modbus_rtu':
        return renderModbusSettings(settings as ModbusSettings);
      case 'mqtt':
        return renderMqttSettings(settings as MqttSettings);
      case 'ocpp':
        return renderOcppSettings(settings as OcppSettings);
      case 'eebus':
        return renderEEBusSettings(settings as EEBusSettings);
      default:
        return (
          <Alert>
            <AlertDescription>
              No specific settings available for {protocol} protocol.
            </AlertDescription>
          </Alert>
        );
    }
  };

  const renderModbusSettings = (modbusSettings: ModbusSettings) => {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Connection Type</Label>
            <Select
              value={modbusSettings.connection || 'tcp'}
              onValueChange={(value) => handleSettingChange('connection', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select connection type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tcp">Modbus TCP</SelectItem>
                <SelectItem value="rtu">Modbus RTU</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {modbusSettings.connection === 'tcp' ? (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>IP Address</Label>
              <Input
                value={modbusSettings.ipAddress || ''}
                onChange={(e) => handleSettingChange('ipAddress', e.target.value)}
                placeholder="e.g. 192.168.1.100"
              />
            </div>
            <div>
              <Label>Port</Label>
              <Input
                type="number"
                value={modbusSettings.port || 502}
                onChange={(e) => handleSettingChange('port', parseInt(e.target.value))}
                placeholder="502"
              />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Serial Port</Label>
              <Input
                value={modbusSettings.serialPort || ''}
                onChange={(e) => handleSettingChange('serialPort', e.target.value)}
                placeholder="e.g. COM1 or /dev/ttyUSB0"
              />
            </div>
            <div>
              <Label>Baud Rate</Label>
              <Select
                value={(modbusSettings.baudRate || 9600).toString()}
                onValueChange={(value) => handleSettingChange('baudRate', parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select baud rate" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="9600">9600</SelectItem>
                  <SelectItem value="19200">19200</SelectItem>
                  <SelectItem value="38400">38400</SelectItem>
                  <SelectItem value="57600">57600</SelectItem>
                  <SelectItem value="115200">115200</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Slave ID / Unit ID</Label>
            <Input
              type="number"
              value={modbusSettings.slaveId || 1}
              onChange={(e) => handleSettingChange('slaveId', parseInt(e.target.value))}
              placeholder="1"
            />
          </div>
          <div>
            <Label>Timeout (ms)</Label>
            <Input
              type="number"
              value={modbusSettings.timeout || 1000}
              onChange={(e) => handleSettingChange('timeout', parseInt(e.target.value))}
              placeholder="1000"
            />
          </div>
        </div>

        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="registers">
            <AccordionTrigger>Modbus Registers</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4">
                {(modbusSettings.registers || []).map((register, index) => (
                  <Card key={index}>
                    <CardContent className="pt-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Register Name</Label>
                          <Input
                            value={register.name}
                            onChange={(e) => {
                              const newRegisters = [...(modbusSettings.registers || [])];
                              newRegisters[index].name = e.target.value;
                              handleSettingChange('registers', newRegisters);
                            }}
                          />
                        </div>
                        <div>
                          <Label>Register Address</Label>
                          <Input
                            type="number"
                            value={register.address}
                            onChange={(e) => {
                              const newRegisters = [...(modbusSettings.registers || [])];
                              newRegisters[index].address = parseInt(e.target.value);
                              handleSettingChange('registers', newRegisters);
                            }}
                          />
                        </div>
                        <div>
                          <Label>Data Type</Label>
                          <Select
                            value={register.type}
                            onValueChange={(value) => {
                              const newRegisters = [...(modbusSettings.registers || [])];
                              newRegisters[index].type = value;
                              handleSettingChange('registers', newRegisters);
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select data type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="int16">INT16</SelectItem>
                              <SelectItem value="uint16">UINT16</SelectItem>
                              <SelectItem value="int32">INT32</SelectItem>
                              <SelectItem value="uint32">UINT32</SelectItem>
                              <SelectItem value="float32">FLOAT32</SelectItem>
                              <SelectItem value="string">STRING</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Unit</Label>
                          <Input
                            value={register.unit || ''}
                            onChange={(e) => {
                              const newRegisters = [...(modbusSettings.registers || [])];
                              newRegisters[index].unit = e.target.value;
                              handleSettingChange('registers', newRegisters);
                            }}
                            placeholder="e.g. W, kWh, °C"
                          />
                        </div>
                      </div>
                      <div className="mt-2 flex justify-end">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            const newRegisters = [...(modbusSettings.registers || [])];
                            newRegisters.splice(index, 1);
                            handleSettingChange('registers', newRegisters);
                          }}
                        >
                          Remove
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                <Button
                  variant="outline"
                  onClick={() => {
                    const newRegisters = [
                      ...(modbusSettings.registers || []),
                      {
                        name: '',
                        address: 0,
                        type: 'uint16',
                        scale: 1,
                        unit: ''
                      }
                    ];
                    handleSettingChange('registers', newRegisters);
                  }}
                >
                  Add Register
                </Button>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    );
  };

  const renderMqttSettings = (mqttSettings: MqttSettings) => {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Broker URL</Label>
            <Input
              value={mqttSettings.brokerUrl || ''}
              onChange={(e) => handleSettingChange('brokerUrl', e.target.value)}
              placeholder="e.g. mqtt.example.com"
            />
          </div>
          <div>
            <Label>Port</Label>
            <Input
              type="number"
              value={mqttSettings.port || 1883}
              onChange={(e) => handleSettingChange('port', parseInt(e.target.value))}
              placeholder="1883"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Client ID</Label>
            <Input
              value={mqttSettings.clientId || ''}
              onChange={(e) => handleSettingChange('clientId', e.target.value)}
              placeholder="e.g. device-123"
            />
          </div>
          <div>
            <Label>Topic Prefix</Label>
            <Input
              value={mqttSettings.topicPrefix || ''}
              onChange={(e) => handleSettingChange('topicPrefix', e.target.value)}
              placeholder="e.g. devices/mydevice"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Username</Label>
            <Input
              value={mqttSettings.username || ''}
              onChange={(e) => handleSettingChange('username', e.target.value)}
              placeholder="Optional"
            />
          </div>
          <div>
            <Label>Password</Label>
            <Input
              type="password"
              value={mqttSettings.password || ''}
              onChange={(e) => handleSettingChange('password', e.target.value)}
              placeholder="Optional"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>QoS Level</Label>
            <Select
              value={(mqttSettings.qos || 0).toString()}
              onValueChange={(value) => handleSettingChange('qos', parseInt(value) as 0 | 1 | 2)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select QoS" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">0 - At most once</SelectItem>
                <SelectItem value="1">1 - At least once</SelectItem>
                <SelectItem value="2">2 - Exactly once</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center pt-8">
            <div className="flex items-center space-x-2">
              <Switch
                checked={mqttSettings.useTls || false}
                onCheckedChange={(checked) => handleSettingChange('useTls', checked)}
              />
              <Label>Use TLS/SSL</Label>
            </div>
          </div>
        </div>

        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="topics">
            <AccordionTrigger>MQTT Topics</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4">
                <div>
                  <Label>Telemetry Topic</Label>
                  <Input
                    value={mqttSettings.topics?.telemetry || ''}
                    onChange={(e) => handleSettingChange('topics.telemetry', e.target.value)}
                    placeholder="e.g. devices/{deviceId}/telemetry"
                  />
                </div>
                <div>
                  <Label>Status Topic</Label>
                  <Input
                    value={mqttSettings.topics?.status || ''}
                    onChange={(e) => handleSettingChange('topics.status', e.target.value)}
                    placeholder="e.g. devices/{deviceId}/status"
                  />
                </div>
                <div>
                  <Label>Commands Topic</Label>
                  <Input
                    value={mqttSettings.topics?.commands || ''}
                    onChange={(e) => handleSettingChange('topics.commands', e.target.value)}
                    placeholder="e.g. devices/{deviceId}/commands"
                  />
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    );
  };

  const renderOcppSettings = (ocppSettings: OcppSettings) => {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>OCPP Version</Label>
            <Select
              value={ocppSettings.version || '1.6'}
              onValueChange={(value) => handleSettingChange('version', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select OCPP version" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1.6">OCPP 1.6</SelectItem>
                <SelectItem value="2.0">OCPP 2.0</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Charge Point ID</Label>
            <Input
              value={ocppSettings.chargePointId || ''}
              onChange={(e) => handleSettingChange('chargePointId', e.target.value)}
              placeholder="e.g. CP001"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <div>
            <Label>Central System URL</Label>
            <Input
              value={ocppSettings.centralSystemUrl || ''}
              onChange={(e) => handleSettingChange('centralSystemUrl', e.target.value)}
              placeholder="e.g. wss://ocpp.example.com/OCPP16"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Authentication Key</Label>
            <Input
              value={ocppSettings.authenticationKey || ''}
              onChange={(e) => handleSettingChange('authenticationKey', e.target.value)}
              placeholder="Optional"
            />
          </div>
          <div>
            <Label>Number of Connectors</Label>
            <Input
              type="number"
              value={ocppSettings.connectors || 1}
              onChange={(e) => handleSettingChange('connectors', parseInt(e.target.value))}
              placeholder="1"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Heartbeat Interval (seconds)</Label>
            <Input
              type="number"
              value={ocppSettings.heartbeatInterval || 300}
              onChange={(e) => handleSettingChange('heartbeatInterval', parseInt(e.target.value))}
              placeholder="300"
            />
          </div>
          <div>
            <Label>Meter Values Interval (seconds)</Label>
            <Input
              type="number"
              value={ocppSettings.meterValuesInterval || 300}
              onChange={(e) => handleSettingChange('meterValuesInterval', parseInt(e.target.value))}
              placeholder="300"
            />
          </div>
        </div>
      </div>
    );
  };

  const renderEEBusSettings = (eebusSettings: EEBusSettings) => {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Server Address</Label>
            <Input
              value={eebusSettings.serverAddress || ''}
              onChange={(e) => handleSettingChange('serverAddress', e.target.value)}
              placeholder="e.g. 192.168.1.100"
            />
          </div>
          <div>
            <Label>Port</Label>
            <Input
              type="number"
              value={eebusSettings.port || 5678}
              onChange={(e) => handleSettingChange('port', parseInt(e.target.value))}
              placeholder="5678"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <div>
            <Label>Device ID</Label>
            <Input
              value={eebusSettings.deviceId || ''}
              onChange={(e) => handleSettingChange('deviceId', e.target.value)}
              placeholder="e.g. HP001"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label>Brand</Label>
            <Input
              value={eebusSettings.brand || ''}
              onChange={(e) => handleSettingChange('brand', e.target.value)}
              placeholder="e.g. Daikin"
            />
          </div>
          <div>
            <Label>Model</Label>
            <Input
              value={eebusSettings.model || ''}
              onChange={(e) => handleSettingChange('model', e.target.value)}
              placeholder="e.g. Altherma 3"
            />
          </div>
          <div>
            <Label>Serial Number</Label>
            <Input
              value={eebusSettings.serialNumber || ''}
              onChange={(e) => handleSettingChange('serialNumber', e.target.value)}
              placeholder="Optional"
            />
          </div>
        </div>

        <div>
          <Label>Supported Features</Label>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {[
              "HeatPump", "HotWater", "SpaceHeating", "SpaceCooling", 
              "LoadControl", "EnergyManagement", "PVIntegration"
            ].map(feature => (
              <div key={feature} className="flex items-center space-x-2">
                <Switch
                  checked={(eebusSettings.features || []).includes(feature)}
                  onCheckedChange={(checked) => {
                    const features = [...(eebusSettings.features || [])];
                    if (checked) {
                      features.push(feature);
                    } else {
                      const index = features.indexOf(feature);
                      if (index !== -1) features.splice(index, 1);
                    }
                    handleSettingChange('features', features);
                  }}
                />
                <Label>{feature}</Label>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {connectionTemplates.length > 0 && (
        <div>
          <Label>Connection Template</Label>
          <Select
            value={selectedTemplate}
            onValueChange={setSelectedTemplate}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a template" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="custom">Custom Configuration</SelectItem>
              {connectionTemplates.map(template => (
                <SelectItem key={template.id} value={template.id.toString()}>
                  {template.name} {template.isDefault && "(Default)"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      
      {selectedTemplate && (
        <div className="pt-4">
          {renderProtocolSettings()}
        </div>
      )}
    </div>
  );
}