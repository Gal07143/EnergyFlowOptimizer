import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { InfoIcon, BatteryChargingIcon, ThermometerIcon, AlertTriangleIcon, HistoryIcon, ZapIcon, CalendarIcon } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface BatteryManagementPanelProps {
  deviceId: number;
}

const BatteryManagementPanel: React.FC<BatteryManagementPanelProps> = ({ deviceId }) => {
  const [activeTab, setActiveTab] = useState("overview");
  
  const { data: device, isLoading: deviceLoading, error: deviceError } = useQuery({
    queryKey: [`/api/devices/${deviceId}`],
    queryFn: undefined, // Will use the default fetcher configured in the app
  });
  
  const { data: telemetry, isLoading: telemetryLoading, error: telemetryError } = useQuery({
    queryKey: [`/api/devices/${deviceId}/battery/telemetry/latest`],
    queryFn: undefined, // Will use the default fetcher configured in the app
  });

  if (deviceLoading) {
    return <div className="flex justify-center p-8">Loading battery device data...</div>;
  }

  if (deviceError) {
    return (
      <Alert variant="destructive" className="my-4">
        <AlertTriangleIcon className="h-4 w-4" />
        <AlertTitle>Error loading battery device</AlertTitle>
        <AlertDescription>
          {(deviceError as Error).message || "Failed to load battery device data"}
        </AlertDescription>
      </Alert>
    );
  }

  if (!device || device.type !== "battery_storage") {
    return (
      <Alert variant="warning" className="my-4">
        <InfoIcon className="h-4 w-4" />
        <AlertTitle>Not a battery device</AlertTitle>
        <AlertDescription>
          This device is not configured as a battery storage device.
        </AlertDescription>
      </Alert>
    );
  }

  const getBatteryHealthColor = (health?: number): string => {
    if (!health) return "bg-gray-400";
    if (health >= 90) return "bg-green-500";
    if (health >= 70) return "bg-green-400";
    if (health >= 50) return "bg-yellow-400";
    if (health >= 30) return "bg-orange-400";
    return "bg-red-500";
  };

  const getHealthStatus = (status?: string): { label: string; color: string } => {
    switch (status) {
      case "excellent":
        return { label: "Excellent", color: "bg-green-500" };
      case "good":
        return { label: "Good", color: "bg-green-400" };
      case "fair":
        return { label: "Fair", color: "bg-yellow-400" };
      case "poor":
        return { label: "Poor", color: "bg-orange-400" };
      case "critical":
        return { label: "Critical", color: "bg-red-500" };
      default:
        return { label: "Unknown", color: "bg-gray-400" };
    }
  };

  const healthStatus = getHealthStatus(device.batteryHealthStatus);
  const stateOfHealth = telemetry?.stateOfHealth || 0;
  const stateOfCharge = telemetry?.stateOfCharge || 0;

  return (
    <div className="w-full">
      <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-3 mb-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="telemetry">Telemetry</TabsTrigger>
          <TabsTrigger value="health">Health Assessment</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Battery Overview Card */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-medium flex items-center">
                  <BatteryChargingIcon className="mr-2 h-5 w-5" />
                  Battery Overview
                </CardTitle>
                <CardDescription>
                  Key battery metrics and information
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium">State of Charge</span>
                      <span className="text-sm font-medium">{stateOfCharge}%</span>
                    </div>
                    <Progress value={stateOfCharge} className="h-2" />
                  </div>
                  
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium">State of Health</span>
                      <span className="text-sm font-medium">{stateOfHealth}%</span>
                    </div>
                    <Progress 
                      value={stateOfHealth} 
                      className="h-2"
                      indicatorClassName={getBatteryHealthColor(stateOfHealth)}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 mt-4">
                    <div className="flex flex-col">
                      <span className="text-xs text-muted-foreground">Status</span>
                      <div className="flex items-center">
                        <div className={`w-2 h-2 rounded-full ${healthStatus.color} mr-2`}></div>
                        <span className="text-sm font-medium">{healthStatus.label}</span>
                      </div>
                    </div>
                    
                    <div className="flex flex-col">
                      <span className="text-xs text-muted-foreground">Cell Type</span>
                      <span className="text-sm font-medium capitalize">
                        {device.batteryCellType?.replace(/_/g, ' ') || 'Unknown'}
                      </span>
                    </div>
                    
                    <div className="flex flex-col">
                      <span className="text-xs text-muted-foreground">Cell Count</span>
                      <span className="text-sm font-medium">
                        {device.cellCount || 'N/A'}
                      </span>
                    </div>
                    
                    <div className="flex flex-col">
                      <span className="text-xs text-muted-foreground">Capacity</span>
                      <span className="text-sm font-medium">
                        {device.nominalCapacity ? `${device.nominalCapacity} kWh` : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Battery Performance Card */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-medium flex items-center">
                  <ZapIcon className="mr-2 h-5 w-5" />
                  Performance
                </CardTitle>
                <CardDescription>
                  Current battery performance metrics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {telemetryLoading ? (
                    <div className="text-sm text-muted-foreground">Loading telemetry data...</div>
                  ) : telemetryError ? (
                    <div className="text-sm text-red-500">Failed to load telemetry data</div>
                  ) : (
                    <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                      <div className="flex flex-col">
                        <span className="text-xs text-muted-foreground">Voltage</span>
                        <span className="text-sm font-medium">
                          {telemetry?.totalVoltage ? `${telemetry.totalVoltage.toFixed(1)} V` : 'N/A'}
                        </span>
                      </div>
                      
                      <div className="flex flex-col">
                        <span className="text-xs text-muted-foreground">Current</span>
                        <span className="text-sm font-medium">
                          {telemetry?.currentCharge ? `${telemetry.currentCharge.toFixed(1)} A` : 'N/A'}
                        </span>
                      </div>
                      
                      <div className="flex flex-col">
                        <span className="text-xs text-muted-foreground">Power</span>
                        <span className="text-sm font-medium">
                          {telemetry?.instantPower ? `${telemetry.instantPower.toFixed(1)} kW` : 'N/A'}
                        </span>
                      </div>
                      
                      <div className="flex flex-col">
                        <span className="text-xs text-muted-foreground">Available Power</span>
                        <span className="text-sm font-medium">
                          {telemetry?.powerAvailable ? `${telemetry.powerAvailable.toFixed(1)} kW` : 'N/A'}
                        </span>
                      </div>
                      
                      <div className="flex flex-col">
                        <span className="text-xs text-muted-foreground">Charge Efficiency</span>
                        <span className="text-sm font-medium">
                          {telemetry?.chargeEfficiency ? `${telemetry.chargeEfficiency.toFixed(1)}%` : 'N/A'}
                        </span>
                      </div>
                      
                      <div className="flex flex-col">
                        <span className="text-xs text-muted-foreground">Thermal Loss</span>
                        <span className="text-sm font-medium">
                          {telemetry?.thermalLoss ? `${telemetry.thermalLoss.toFixed(1)} kW` : 'N/A'}
                        </span>
                      </div>
                      
                      <div className="flex flex-col">
                        <span className="text-xs text-muted-foreground">Time to Full</span>
                        <span className="text-sm font-medium">
                          {telemetry?.timeToFullCharge 
                            ? `${Math.floor(telemetry.timeToFullCharge / 60)}h ${telemetry.timeToFullCharge % 60}m` 
                            : 'N/A'}
                        </span>
                      </div>
                      
                      <div className="flex flex-col">
                        <span className="text-xs text-muted-foreground">Time Remaining</span>
                        <span className="text-sm font-medium">
                          {telemetry?.estimatedTimeRemaining 
                            ? `${Math.floor(telemetry.estimatedTimeRemaining / 60)}h ${telemetry.estimatedTimeRemaining % 60}m` 
                            : 'N/A'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            
            {/* Battery Thermal Card */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-medium flex items-center">
                  <ThermometerIcon className="mr-2 h-5 w-5" />
                  Thermal Status
                </CardTitle>
                <CardDescription>
                  Temperature and thermal management
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {telemetryLoading ? (
                    <div className="text-sm text-muted-foreground">Loading thermal data...</div>
                  ) : telemetryError ? (
                    <div className="text-sm text-red-500">Failed to load thermal data</div>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                        <div className="flex flex-col">
                          <span className="text-xs text-muted-foreground">Min Temperature</span>
                          <span className="text-sm font-medium">
                            {telemetry?.minTemperature ? `${telemetry.minTemperature.toFixed(1)}°C` : 'N/A'}
                          </span>
                        </div>
                        
                        <div className="flex flex-col">
                          <span className="text-xs text-muted-foreground">Max Temperature</span>
                          <span className="text-sm font-medium">
                            {telemetry?.maxTemperature ? `${telemetry.maxTemperature.toFixed(1)}°C` : 'N/A'}
                          </span>
                        </div>
                        
                        <div className="flex flex-col">
                          <span className="text-xs text-muted-foreground">Avg Temperature</span>
                          <span className="text-sm font-medium">
                            {telemetry?.avgTemperature ? `${telemetry.avgTemperature.toFixed(1)}°C` : 'N/A'}
                          </span>
                        </div>
                        
                        <div className="flex flex-col">
                          <span className="text-xs text-muted-foreground">Temperature Δ</span>
                          <span className="text-sm font-medium">
                            {telemetry?.maxTemperature && telemetry?.minTemperature 
                              ? `${(telemetry.maxTemperature - telemetry.minTemperature).toFixed(1)}°C` 
                              : 'N/A'}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <div className="flex items-center">
                          <span className="text-xs text-muted-foreground mr-2">Cooling</span>
                          <Badge variant={telemetry?.coolingStatus === 'active' ? 'default' : 'outline'}>
                            {telemetry?.coolingStatus || 'Inactive'}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center">
                          <span className="text-xs text-muted-foreground mr-2">Heating</span>
                          <Badge variant={telemetry?.heatingStatus === 'active' ? 'default' : 'outline'}>
                            {telemetry?.heatingStatus || 'Inactive'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Status and Alerts Section */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-medium flex items-center">
                <AlertTriangleIcon className="mr-2 h-5 w-5" />
                Status & Alerts
              </CardTitle>
              <CardDescription>
                Current battery status and active alerts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {telemetryLoading ? (
                  <div className="text-sm text-muted-foreground">Loading status data...</div>
                ) : telemetryError ? (
                  <div className="text-sm text-red-500">Failed to load status data</div>
                ) : (
                  <>
                    <div className="flex items-center mb-4">
                      <span className="text-sm font-medium mr-2">BMS Status:</span>
                      <Badge 
                        variant={telemetry?.bmsStatus === 'normal' ? 'outline' : 'default'}
                        className={telemetry?.bmsStatus === 'normal' 
                          ? 'bg-green-500/10 text-green-500 hover:bg-green-500/20'
                          : telemetry?.bmsStatus === 'warning'
                            ? 'bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20'
                            : telemetry?.bmsStatus === 'alarm'
                              ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20'
                              : ''
                        }
                      >
                        {telemetry?.bmsStatus || 'Unknown'}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-sm font-medium mb-2">Active Alarms</h4>
                        {telemetry?.alarmStates && Object.keys(telemetry.alarmStates).length > 0 ? (
                          <div className="space-y-2">
                            {Object.entries(telemetry.alarmStates).map(([key, value]) => (
                              <Alert key={key} variant="destructive" className="py-2">
                                <AlertTitle className="text-xs font-medium">{key}</AlertTitle>
                                <AlertDescription className="text-xs">
                                  {String(value)}
                                </AlertDescription>
                              </Alert>
                            ))}
                          </div>
                        ) : (
                          <div className="text-sm text-muted-foreground">
                            No active alarms
                          </div>
                        )}
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-medium mb-2">Active Warnings</h4>
                        {telemetry?.warningStates && Object.keys(telemetry.warningStates).length > 0 ? (
                          <div className="space-y-2">
                            {Object.entries(telemetry.warningStates).map(([key, value]) => (
                              <Alert key={key} variant="warning" className="py-2">
                                <AlertTitle className="text-xs font-medium">{key}</AlertTitle>
                                <AlertDescription className="text-xs">
                                  {String(value)}
                                </AlertDescription>
                              </Alert>
                            ))}
                          </div>
                        ) : (
                          <div className="text-sm text-muted-foreground">
                            No active warnings
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
            <CardFooter className="pt-0">
              <Button variant="outline" size="sm" onClick={() => setActiveTab("health")}>
                View Health Assessment
              </Button>
              <Button variant="outline" size="sm" className="ml-2" onClick={() => setActiveTab("telemetry")}>
                View Detailed Telemetry
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="telemetry">
          <Card>
            <CardHeader>
              <CardTitle>Cell-Level Telemetry</CardTitle>
              <CardDescription>
                Detailed battery cell metrics and information
              </CardDescription>
            </CardHeader>
            <CardContent>
              {telemetryLoading ? (
                <div className="text-sm text-muted-foreground">Loading telemetry data...</div>
              ) : telemetryError ? (
                <div className="text-sm text-red-500">Failed to load telemetry data</div>
              ) : !telemetry?.cellVoltages ? (
                <div className="text-sm text-muted-foreground">No cell-level data available</div>
              ) : (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-medium mb-3">Cell Voltage Distribution</h3>
                    <div className="h-64 border rounded p-4 flex items-end justify-between">
                      {/* Simple bar graph visualization of cell voltages */}
                      {Array.isArray(telemetry.cellVoltages) && telemetry.cellVoltages.map((voltage: number, index: number) => {
                        const maxVoltage = Math.max(...telemetry.cellVoltages as number[]);
                        const minVoltage = Math.min(...telemetry.cellVoltages as number[]);
                        const range = maxVoltage - minVoltage;
                        const height = range > 0 
                          ? Math.max(10, ((voltage - minVoltage) / range) * 100) 
                          : 50;
                          
                        return (
                          <div key={index} className="flex flex-col items-center">
                            <div 
                              className={`w-5 bg-primary/80 rounded-t`} 
                              style={{ height: `${height}%` }}
                              title={`Cell ${index + 1}: ${voltage.toFixed(3)}V`}
                            ></div>
                            <span className="text-xs mt-1">{index + 1}</span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex justify-between mt-2">
                      <div className="text-xs text-muted-foreground">
                        Min: {telemetry.minCellVoltage?.toFixed(3) || 'N/A'}V
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Max: {telemetry.maxCellVoltage?.toFixed(3) || 'N/A'}V
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Δ: {telemetry.cellVoltageDelta?.toFixed(3) || 'N/A'}V
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium mb-3">Cell Temperature Distribution</h3>
                    <div className="h-64 border rounded p-4 flex items-end justify-between">
                      {/* Simple visualization of cell temperatures */}
                      {Array.isArray(telemetry.cellTemperatures) && telemetry.cellTemperatures.map((temp: number, index: number) => {
                        const maxTemp = Math.max(...telemetry.cellTemperatures as number[]);
                        const minTemp = Math.min(...telemetry.cellTemperatures as number[]);
                        const range = maxTemp - minTemp;
                        const height = range > 0 
                          ? Math.max(10, ((temp - minTemp) / range) * 100) 
                          : 50;
                        
                        // Determine color based on temperature
                        let bgColor = 'bg-blue-400';
                        if (temp > 45) bgColor = 'bg-red-500';
                        else if (temp > 40) bgColor = 'bg-orange-500';
                        else if (temp > 35) bgColor = 'bg-yellow-500';
                        else if (temp > 30) bgColor = 'bg-green-500';
                        else if (temp > 25) bgColor = 'bg-blue-400';
                        else bgColor = 'bg-blue-600';
                        
                        return (
                          <div key={index} className="flex flex-col items-center">
                            <div 
                              className={`w-5 ${bgColor} rounded-t`} 
                              style={{ height: `${height}%` }}
                              title={`Cell ${index + 1}: ${temp.toFixed(1)}°C`}
                            ></div>
                            <span className="text-xs mt-1">{index + 1}</span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex justify-between mt-2">
                      <div className="text-xs text-muted-foreground">
                        Min: {telemetry.minTemperature?.toFixed(1) || 'N/A'}°C
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Max: {telemetry.maxTemperature?.toFixed(1) || 'N/A'}°C
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Avg: {telemetry.avgTemperature?.toFixed(1) || 'N/A'}°C
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="health">
          <Card>
            <CardHeader>
              <CardTitle>Battery Health Assessment</CardTitle>
              <CardDescription>
                Detailed health metrics and predictions for your battery
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex flex-col p-4 border rounded-lg">
                    <h3 className="text-sm font-medium mb-2">State of Health</h3>
                    <div className="text-2xl font-bold mb-2">
                      {stateOfHealth}%
                    </div>
                    <Progress 
                      value={stateOfHealth} 
                      className="h-2 mb-2"
                      indicatorClassName={getBatteryHealthColor(stateOfHealth)}
                    />
                    <span className="text-xs text-muted-foreground">
                      {stateOfHealth >= 90 ? 'Excellent condition' : 
                       stateOfHealth >= 80 ? 'Good condition' :
                       stateOfHealth >= 70 ? 'Fair condition' :
                       stateOfHealth >= 60 ? 'Degraded performance' :
                       'Replacement recommended'}
                    </span>
                  </div>
                  
                  <div className="flex flex-col p-4 border rounded-lg">
                    <h3 className="text-sm font-medium mb-2">Cycle Count</h3>
                    <div className="text-2xl font-bold mb-2">
                      {telemetry?.cycleCount || 'N/A'}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {device.nominalCapacity 
                        ? `${(((telemetry?.cycleCount || 0) * device.nominalCapacity) / 1000).toFixed(1)} MWh lifetime throughput` 
                        : 'Throughput data unavailable'}
                    </div>
                  </div>
                  
                  <div className="flex flex-col p-4 border rounded-lg">
                    <h3 className="text-sm font-medium mb-2">Remaining Life</h3>
                    <div className="text-2xl font-bold mb-2">
                      {telemetry?.estimatedRemainingLifetime 
                        ? `${Math.round(telemetry.estimatedRemainingLifetime / 30)} months` 
                        : 'N/A'}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {telemetry?.predictedRemainingCapacity
                        ? `Projected capacity: ${telemetry.predictedRemainingCapacity.toFixed(1)}%`
                        : 'Projection unavailable'}
                    </div>
                  </div>
                </div>
                
                <div className="border rounded-lg p-4">
                  <h3 className="text-sm font-medium mb-3">Capacity Trend</h3>
                  <div className="text-sm text-muted-foreground mb-4">
                    Battery capacity tests and trend analysis will be displayed here when available.
                  </div>
                  <Button variant="outline" size="sm">
                    Schedule Capacity Test
                  </Button>
                </div>
                
                <div className="border rounded-lg p-4">
                  <h3 className="text-sm font-medium mb-3">Recommendations</h3>
                  <div className="space-y-2">
                    {stateOfHealth < 70 && (
                      <Alert className="py-2">
                        <AlertTitle className="text-xs font-medium">Consider battery replacement</AlertTitle>
                        <AlertDescription className="text-xs">
                          Battery health is below 70%, which may affect system performance and reliability.
                        </AlertDescription>
                      </Alert>
                    )}
                    
                    {telemetry?.cellVoltageDelta && telemetry.cellVoltageDelta > 0.1 && (
                      <Alert className="py-2">
                        <AlertTitle className="text-xs font-medium">Cell balancing recommended</AlertTitle>
                        <AlertDescription className="text-xs">
                          Cell voltage imbalance ({telemetry.cellVoltageDelta.toFixed(3)}V) exceeds recommended threshold (0.100V).
                        </AlertDescription>
                      </Alert>
                    )}
                    
                    {!telemetry?.alarmStates && !telemetry?.warningStates && stateOfHealth >= 70 && (
                      <div className="text-sm text-muted-foreground">
                        No specific recommendations at this time. Battery is operating within normal parameters.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default BatteryManagementPanel;