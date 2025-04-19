import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertTriangle,
  Battery,
  BatteryCharging,
  BatteryFull,
  Bolt,
  Activity,
  Thermometer,
  Clock,
  RefreshCw,
  ArrowUpDown,
  ZapOff,
  Zap,
  InfoIcon
} from "lucide-react";

interface BatteryTelemetryPanelProps {
  deviceId: number;
}

const BatteryTelemetryPanel: React.FC<BatteryTelemetryPanelProps> = ({ deviceId }) => {
  const [activeTab, setActiveTab] = useState<string>("electrical");
  const [refreshInterval, setRefreshInterval] = useState<number>(30); // seconds
  
  const { data: telemetry, isLoading: telemetryLoading, error: telemetryError, refetch: refetchTelemetry } = useQuery({
    queryKey: [`/api/devices/${deviceId}/battery/telemetry/latest`],
    refetchInterval: refreshInterval * 1000, // Convert to milliseconds
  });
  
  const { data: device, isLoading: deviceLoading } = useQuery({
    queryKey: [`/api/devices/${deviceId}`],
  });
  
  // Format a value with appropriate units and decimal places
  const formatValue = (value: number | undefined, unit: string, decimals: number = 1) => {
    if (value === undefined || value === null) return 'N/A';
    return `${value.toFixed(decimals)} ${unit}`;
  };
  
  // Get appropriate battery icon based on state of charge
  const getBatteryIcon = (stateOfCharge?: number) => {
    if (!stateOfCharge) return <Battery className="h-5 w-5" />;
    
    if (stateOfCharge > 80) return <BatteryFull className="h-5 w-5 text-green-500" />;
    if (stateOfCharge > 20) return <BatteryCharging className="h-5 w-5 text-amber-500" />;
    return <Battery className="h-5 w-5 text-red-500" />;
  };
  
  if (telemetryLoading || deviceLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading battery telemetry data...</span>
      </div>
    );
  }
  
  if (telemetryError) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error loading telemetry data</AlertTitle>
        <AlertDescription>
          {(telemetryError as Error).message || "Failed to load battery telemetry data"}
        </AlertDescription>
      </Alert>
    );
  }
  
  if (!telemetry) {
    return (
      <Alert>
        <InfoIcon className="h-4 w-4" />
        <AlertTitle>No telemetry data</AlertTitle>
        <AlertDescription>
          No telemetry data is available for this battery device.
        </AlertDescription>
      </Alert>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Real-time Battery Data</h2>
        <Button variant="outline" size="sm" onClick={() => refetchTelemetry()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh Data
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card/50">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <CardTitle className="text-base">State of Charge</CardTitle>
              {getBatteryIcon(telemetry.stateOfCharge)}
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{telemetry.stateOfCharge ? `${telemetry.stateOfCharge.toFixed(1)}%` : 'N/A'}</div>
          </CardContent>
        </Card>
        
        <Card className="bg-card/50">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <CardTitle className="text-base">Current Power</CardTitle>
              {telemetry.instantPower > 0 ? <Zap className="h-5 w-5 text-green-500" /> : <ZapOff className="h-5 w-5 text-red-500" />}
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatValue(telemetry.instantPower, 'W', 0)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {telemetry.instantPower > 0 ? 'Charging' : telemetry.instantPower < 0 ? 'Discharging' : 'Idle'}
            </p>
          </CardContent>
        </Card>
        
        <Card className="bg-card/50">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <CardTitle className="text-base">Temperature</CardTitle>
              <Thermometer className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatValue(telemetry.avgTemperature, '°C', 1)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Min: {formatValue(telemetry.minTemperature, '°C', 1)} | Max: {formatValue(telemetry.maxTemperature, '°C', 1)}
            </p>
          </CardContent>
        </Card>
        
        <Card className="bg-card/50">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <CardTitle className="text-base">Voltage & Current</CardTitle>
              <Activity className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatValue(telemetry.totalVoltage, 'V', 1)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Current: {formatValue(telemetry.currentCharge, 'A', 1)}
            </p>
          </CardContent>
        </Card>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="electrical">
            <Bolt className="h-4 w-4 mr-2" />
            Electrical Data
          </TabsTrigger>
          <TabsTrigger value="thermal">
            <Thermometer className="h-4 w-4 mr-2" />
            Thermal Data
          </TabsTrigger>
          <TabsTrigger value="efficiency">
            <ArrowUpDown className="h-4 w-4 mr-2" />
            Efficiency Metrics
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="electrical" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Electrical Parameters</CardTitle>
              <CardDescription>
                Current electrical measurements from the battery system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium mb-2">Voltage Data</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Total Voltage</span>
                        <span>{formatValue(telemetry.totalVoltage, 'V')}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Min Cell Voltage</span>
                        <span>{formatValue(telemetry.minCellVoltage, 'V', 3)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Max Cell Voltage</span>
                        <span>{formatValue(telemetry.maxCellVoltage, 'V', 3)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Cell Voltage Diff</span>
                        <span>{formatValue(telemetry.cellVoltageDelta, 'V', 3)}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium mb-2">Current Data</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Charge Current</span>
                        <span>{formatValue(telemetry.currentCharge, 'A')}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Max Current</span>
                        <span>{formatValue(telemetry.maxChargeCurrent, 'A')}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Min Current</span>
                        <span>{formatValue(telemetry.minChargeCurrent, 'A')}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium mb-2">Power Data</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Instant Power</span>
                        <span>{formatValue(telemetry.instantPower, 'W', 0)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Max Power</span>
                        <span>{formatValue(telemetry.maxPower, 'W', 0)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Available Power</span>
                        <span>{formatValue(telemetry.powerAvailable, 'W', 0)}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium mb-2">Energy Data</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Total Energy</span>
                        <span>{formatValue(telemetry.totalEnergy, 'kWh')}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Energy Today</span>
                        <span>{formatValue(telemetry.energyToday, 'kWh')}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Energy This Month</span>
                        <span>{formatValue(telemetry.energyThisMonth, 'kWh')}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="thermal" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Thermal Management</CardTitle>
              <CardDescription>
                Temperature and thermal management data from the battery system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium mb-2">Temperature Data</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Average Temperature</span>
                        <span>{formatValue(telemetry.avgTemperature, '°C')}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Min Temperature</span>
                        <span>{formatValue(telemetry.minTemperature, '°C')}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Max Temperature</span>
                        <span>{formatValue(telemetry.maxTemperature, '°C')}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Temperature Diff</span>
                        <span>{formatValue(telemetry.maxTemperature - telemetry.minTemperature, '°C')}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium mb-2">Environment</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Ambient Temperature</span>
                        <span>{formatValue(telemetry.ambientTemperature, '°C')}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Humidity</span>
                        <span>{telemetry.humidity ? `${telemetry.humidity.toFixed(1)}%` : 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium mb-2">Cooling System</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Cooling Status</span>
                        <span className="capitalize">{telemetry.coolingStatus || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Fan Speed</span>
                        <span>{telemetry.fanSpeed ? `${telemetry.fanSpeed}%` : 'N/A'}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Heating Status</span>
                        <span className="capitalize">{telemetry.heatingStatus || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium mb-2">Thermal Events</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Thermal Warnings</span>
                        <span>{telemetry.thermalWarnings || '0'}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Thermal Shutdowns</span>
                        <span>{telemetry.thermalShutdowns || '0'}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Last Thermal Event</span>
                        <span>{telemetry.lastThermalEvent ? new Date(telemetry.lastThermalEvent).toLocaleDateString() : 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="efficiency" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Efficiency Metrics</CardTitle>
              <CardDescription>
                Performance and efficiency data for the battery system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium mb-2">Efficiency Data</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Charge Efficiency</span>
                        <span>{telemetry.chargeEfficiency ? `${(telemetry.chargeEfficiency * 100).toFixed(1)}%` : 'N/A'}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Discharge Efficiency</span>
                        <span>{telemetry.dischargeEfficiency ? `${(telemetry.dischargeEfficiency * 100).toFixed(1)}%` : 'N/A'}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Round-trip Efficiency</span>
                        <span>{telemetry.roundTripEfficiency ? `${(telemetry.roundTripEfficiency * 100).toFixed(1)}%` : 'N/A'}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Thermal Loss</span>
                        <span>{formatValue(telemetry.thermalLoss, 'W')}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium mb-2">Time Estimates</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Time to Full Charge</span>
                        <span>{telemetry.timeToFullCharge ? `${Math.floor(telemetry.timeToFullCharge / 60)}h ${telemetry.timeToFullCharge % 60}m` : 'N/A'}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Time Remaining</span>
                        <span>{telemetry.estimatedTimeRemaining ? `${Math.floor(telemetry.estimatedTimeRemaining / 60)}h ${telemetry.estimatedTimeRemaining % 60}m` : 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium mb-2">Operation Status</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Operation Mode</span>
                        <span className="capitalize">{telemetry.operationMode || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">BMS Status</span>
                        <span className="capitalize">{telemetry.bmsStatus || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Alarms</span>
                        <span>{telemetry.alarmCount || '0'}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Warnings</span>
                        <span>{telemetry.warningCount || '0'}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium mb-2">Cell Status</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Cell Balancing</span>
                        <span>{telemetry.cellBalancingActive ? 'Active' : 'Inactive'}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Battery Health</span>
                        <span>{telemetry.stateOfHealth ? `${telemetry.stateOfHealth.toFixed(1)}%` : 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      <Card>
        <CardHeader>
          <CardTitle>System Warnings</CardTitle>
          <CardDescription>
            Alerts and warnings from the battery management system
          </CardDescription>
        </CardHeader>
        <CardContent>
          {telemetry.alarmStates && telemetry.alarmStates.length > 0 ? (
            <div className="space-y-2">
              {telemetry.alarmStates.map((alarm: string, index: number) => (
                <Alert key={index} variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Alarm</AlertTitle>
                  <AlertDescription className="capitalize">
                    {alarm.replace(/_/g, ' ')}
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          ) : telemetry.warningStates && telemetry.warningStates.length > 0 ? (
            <div className="space-y-2">
              {telemetry.warningStates.map((warning: string, index: number) => (
                <Alert key={index}>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Warning</AlertTitle>
                  <AlertDescription className="capitalize">
                    {warning.replace(/_/g, ' ')}
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center p-6 text-muted-foreground">
              No active warnings or alarms
            </div>
          )}
        </CardContent>
        <CardFooter className="border-t pt-4">
          <div className="flex justify-between items-center w-full text-xs text-muted-foreground">
            <span>Last updated: {new Date(telemetry.timestamp).toLocaleString()}</span>
            <span>Refresh interval: {refreshInterval} seconds</span>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default BatteryTelemetryPanel;