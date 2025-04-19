import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  Battery,
  BatteryCharging,
  Thermometer,
  Calendar,
  Clock,
  Activity,
  BarChart3,
  ChevronDown,
  Info,
  LifeBuoy,
  CheckCircle,
  XCircle,
  RefreshCw,
  ZapIcon,
  ClockIcon,
} from "lucide-react";

interface BatteryHealthPanelProps {
  deviceId: number;
}

const BatteryHealthPanel: React.FC<BatteryHealthPanelProps> = ({ deviceId }) => {
  const [activeTab, setActiveTab] = useState<string>("overview");
  
  // Fetch device data
  const { data: device, isLoading: deviceLoading } = useQuery({
    queryKey: [`/api/devices/${deviceId}`],
  });
  
  // Fetch capacity test data
  const { data: capacityTests, isLoading: capacityTestsLoading } = useQuery({
    queryKey: [`/api/devices/${deviceId}/battery/capacity-tests`],
  });
  
  // Fetch lifecycle event data
  const { data: lifecycleEvents, isLoading: lifecycleEventsLoading } = useQuery({
    queryKey: [`/api/devices/${deviceId}/battery/lifecycle-events`],
  });
  
  // Determine battery health status color
  const getHealthStatusColor = (status?: string) => {
    switch (status) {
      case 'excellent': return 'text-green-500';
      case 'good': return 'text-green-400';
      case 'fair': return 'text-amber-400';
      case 'poor': return 'text-orange-500';
      case 'critical': return 'text-red-500';
      default: return 'text-gray-400';
    }
  };
  
  // Get badge variant based on health status
  const getBadgeVariant = (status?: string) => {
    switch (status) {
      case 'excellent': return 'default';
      case 'good': return 'default';
      case 'fair': return 'secondary';
      case 'poor': return 'warning';
      case 'critical': return 'destructive';
      default: return 'outline';
    }
  };
  
  // Format the date to a readable format
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
  if (deviceLoading) {
    return <div className="flex justify-center p-8">Loading battery health data...</div>;
  }
  
  return (
    <div className="space-y-6">
      {/* Health Status Overview */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex justify-between items-center">
            <CardTitle className="text-xl">Battery Health Status</CardTitle>
            <Badge variant={getBadgeVariant(device?.batteryHealthStatus)} className="capitalize">
              {device?.batteryHealthStatus || "Unknown"}
            </Badge>
          </div>
          <CardDescription>
            Overall battery health assessment and key metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* State of Health */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-medium">State of Health (SoH)</h3>
                <span className={`text-sm font-semibold ${getHealthStatusColor(device?.batteryHealthStatus)}`}>
                  {device?.stateOfHealth || 0}%
                </span>
              </div>
              <Progress 
                value={device?.stateOfHealth || 0} 
                className="h-2" 
              />
              <p className="text-xs text-muted-foreground mt-1">
                {device?.stateOfHealth >= 90 ? 'Excellent condition' :
                 device?.stateOfHealth >= 80 ? 'Good condition' :
                 device?.stateOfHealth >= 70 ? 'Fair condition' :
                 device?.stateOfHealth >= 60 ? 'Poor condition' : 'Critical condition'}
              </p>
            </div>
            
            {/* State of Charge */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-medium">State of Charge (SoC)</h3>
                <span className="text-sm font-semibold">
                  {device?.stateOfCharge || 0}%
                </span>
              </div>
              <Progress 
                value={device?.stateOfCharge || 0} 
                className="h-2" 
              />
              <p className="text-xs text-muted-foreground mt-1">
                Current charge level of the battery
              </p>
            </div>
            
            {/* Cycle Count */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-medium">Charge Cycles</h3>
                <span className="text-sm font-semibold">
                  {device?.cycleCount || 0} cycles
                </span>
              </div>
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary" 
                  style={{ 
                    width: `${Math.min(((device?.cycleCount || 0) / (device?.maxCycles || 3000)) * 100, 100)}%` 
                  }}
                ></div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {device?.maxCycles ? `${Math.round(((device?.cycleCount || 0) / device.maxCycles) * 100)}% of rated cycles used` : 'Cycle usage information not available'}
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <div className="space-y-3">
              <h3 className="text-sm font-medium">Battery Specifications</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cell Type</span>
                  <span className="capitalize">{device?.batteryCellType?.replace('_', ' ') || "Unknown"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cell Count</span>
                  <span>{device?.cellCount || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Nominal Capacity</span>
                  <span>{device?.nominalCapacity ? `${device.nominalCapacity} kWh` : "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Nominal Voltage</span>
                  <span>{device?.nominalVoltage ? `${device.nominalVoltage} V` : "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Balancing Method</span>
                  <span className="capitalize">{device?.batteryBalancingMethod?.replace('_', ' ') || "Unknown"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Manufacturer</span>
                  <span>{device?.manufacturer || "Unknown"}</span>
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              <h3 className="text-sm font-medium">Health Assessment</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Voltage</span>
                  <span>{device?.totalVoltage ? `${device.totalVoltage} V` : "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Current Charge</span>
                  <span>{device?.currentCharge ? `${device.currentCharge} A` : "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Instant Power</span>
                  <span>{device?.instantPower ? `${device.instantPower} W` : "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Power Available</span>
                  <span>{device?.powerAvailable ? `${device.powerAvailable} W` : "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Charge Efficiency</span>
                  <span>{device?.chargeEfficiency ? `${(device.chargeEfficiency * 100).toFixed(1)}%` : "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Thermal Loss</span>
                  <span>{device?.thermalLoss ? `${device.thermalLoss} W` : "N/A"}</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <div className="space-y-3">
              <h3 className="text-sm font-medium">Time Estimates</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Time to Full Charge</span>
                  <span>{device?.timeToFullCharge ? 
                    `${Math.floor(device.timeToFullCharge / 60)}h ${device.timeToFullCharge % 60}m` 
                    : "N/A"}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Estimated Time Remaining</span>
                  <span>{device?.estimatedTimeRemaining ? 
                    `${Math.floor(device.estimatedTimeRemaining / 60)}h ${device.estimatedTimeRemaining % 60}m` 
                    : "N/A"}</span>
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              <h3 className="text-sm font-medium">Latest Tests & Events</h3>
              <div className="space-y-2">
                {capacityTests && capacityTests.length > 0 ? (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Last Capacity Test</span>
                    <span>{formatDate(capacityTests[0].startTime)}</span>
                  </div>
                ) : (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Last Capacity Test</span>
                    <span>No tests recorded</span>
                  </div>
                )}
                
                {lifecycleEvents && lifecycleEvents.length > 0 ? (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Last Event</span>
                    <span>{formatDate(lifecycleEvents[0].timestamp)}</span>
                  </div>
                ) : (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Last Event</span>
                    <span>No events recorded</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Detailed Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="thermal">
            <Thermometer className="h-4 w-4 mr-2" />
            Thermal Data
          </TabsTrigger>
          <TabsTrigger value="lifecycle">
            <Calendar className="h-4 w-4 mr-2" />
            Lifecycle Events
          </TabsTrigger>
          <TabsTrigger value="capacity">
            <Battery className="h-4 w-4 mr-2" />
            Capacity Tests
          </TabsTrigger>
        </TabsList>
        
        {/* Thermal Data Tab */}
        <TabsContent value="thermal" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Thermal Management & Analysis</CardTitle>
              <CardDescription>
                Temperature data and thermal management status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium mb-2">Temperature Readings</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Minimum Temperature</span>
                        <span>{device?.minTemperature ? `${device.minTemperature}°C` : "N/A"}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Maximum Temperature</span>
                        <span>{device?.maxTemperature ? `${device.maxTemperature}°C` : "N/A"}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Average Temperature</span>
                        <span>{device?.avgTemperature ? `${device.avgTemperature}°C` : "N/A"}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Temperature Range</span>
                        <span>
                          {device?.maxTemperature && device?.minTemperature
                            ? `${(device.maxTemperature - device.minTemperature).toFixed(1)}°C`
                            : "N/A"}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium mb-2">Cooling System</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Cooling Status</span>
                        <span className="capitalize">{device?.coolingStatus || "N/A"}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Heating Status</span>
                        <span className="capitalize">{device?.heatingStatus || "N/A"}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium mb-2">Thermal Analysis</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Operating Temperature</span>
                        <span>{device?.maxTemperature ? `${device.maxTemperature}°C` : "N/A"}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Temperature Spread</span>
                        <span>
                          {device?.maxTemperature && device?.minTemperature
                            ? `${(device.maxTemperature - device.minTemperature).toFixed(1)}°C`
                            : "N/A"}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium mb-2">Thermal Events</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Cycle Count</span>
                        <span>{device?.cycleCount || "0"}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium mb-2">Health Impact</h3>
                    <p className="text-sm text-muted-foreground">
                      {device?.maxTemperature && device.maxTemperature > 35
                        ? "High operating temperatures may be reducing battery lifespan"
                        : "Temperature range is within normal operating parameters"}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Lifecycle Events Tab */}
        <TabsContent value="lifecycle" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Battery Lifecycle Events</CardTitle>
              <CardDescription>
                Critical events throughout the battery's operational lifetime
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="space-y-3">
                  <h3 className="text-sm font-medium">Battery Status</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-card/50 p-4 rounded-lg border">
                      <div className="flex flex-col items-center">
                        <div className="text-sm font-medium mb-1">BMS Status</div>
                        <div className="text-lg font-semibold capitalize">{device?.bmsStatus || "Unknown"}</div>
                      </div>
                    </div>
                    
                    <div className="bg-card/50 p-4 rounded-lg border">
                      <div className="flex flex-col items-center">
                        <div className="text-sm font-medium mb-1">Cycle Count</div>
                        <div className="text-lg font-semibold">{device?.cycleCount || "0"}</div>
                      </div>
                    </div>
                    
                    <div className="bg-card/50 p-4 rounded-lg border">
                      <div className="flex flex-col items-center">
                        <div className="text-sm font-medium mb-1">Expected Lifespan</div>
                        <div className="text-lg font-semibold">{device?.estimatedRemainingLifetime || "Unknown"}</div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <h3 className="text-sm font-medium">Key Health Indicators</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Cell Voltage Delta</span>
                        <span>{device?.cellVoltageDelta ? `${device.cellVoltageDelta.toFixed(3)} V` : "N/A"}</span>
                      </div>
                      <Progress 
                        value={device?.cellVoltageDelta ? Math.min(device.cellVoltageDelta / 0.5 * 100, 100) : 0} 
                        className="h-2" 
                      />
                      {device?.cellVoltageDelta && (
                        <p className="text-xs text-muted-foreground">
                          {device.cellVoltageDelta < 0.05 ? "Excellent cell balance" : 
                           device.cellVoltageDelta < 0.1 ? "Good cell balance" :
                           device.cellVoltageDelta < 0.2 ? "Fair cell balance" : "Poor cell balance"}
                        </p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Temperature Variance</span>
                        <span>{device?.maxTemperature ? `${device.maxTemperature.toFixed(1)}°C` : "N/A"}</span>
                      </div>
                      <Progress 
                        value={device?.maxTemperature ? Math.min(device.maxTemperature / 60 * 100, 100) : 0} 
                        className="h-2" 
                      />
                      {device?.maxTemperature && (
                        <p className="text-xs text-muted-foreground">
                          {device.maxTemperature < 30 ? "Optimal temperature range" :
                           device.maxTemperature < 40 ? "Acceptable temperature range" :
                           "Temperature too high, may impact lifespan"}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-medium">Recent Lifecycle Events</h3>
                    <span className="text-xs text-muted-foreground">{lifecycleEvents ? lifecycleEvents.length : 0} events</span>
                  </div>
                  
                  {lifecycleEventsLoading ? (
                    <div className="flex justify-center p-6">
                      <RefreshCw className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  ) : lifecycleEvents && lifecycleEvents.length > 0 ? (
                    <div className="space-y-2">
                      {lifecycleEvents.slice(0, 5).map((event: any, index: number) => (
                        <div key={index} className="flex items-start space-x-3 p-3 rounded-md bg-card/50 border">
                          {event.eventType === 'warning' && <AlertTriangle className="h-5 w-5 mt-0.5 text-amber-500" />}
                          {event.eventType === 'error' && <XCircle className="h-5 w-5 mt-0.5 text-red-500" />}
                          {event.eventType === 'info' && <Info className="h-5 w-5 mt-0.5 text-blue-500" />}
                          {event.eventType === 'recovery' && <CheckCircle className="h-5 w-5 mt-0.5 text-green-500" />}
                          
                          <div className="flex-1">
                            <div className="flex justify-between">
                              <p className="text-sm font-medium">{event.eventDescription || 'Unknown event'}</p>
                              <p className="text-xs text-muted-foreground">{formatDate(event.timestamp)}</p>
                            </div>
                            {event.details && <p className="text-xs text-muted-foreground mt-1">{event.details}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex justify-center p-6 text-muted-foreground">
                      No lifecycle events recorded
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Capacity Tests Tab */}
        <TabsContent value="capacity" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Capacity Tests</CardTitle>
                  <CardDescription>
                    Historical capacity tests and performance analysis
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm">
                  Schedule Test
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="space-y-3">
                  <h3 className="text-sm font-medium">Battery Capacity Overview</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-card/50 p-4 rounded-lg border">
                      <div className="flex flex-col items-center">
                        <div className="text-sm font-medium mb-1">Nominal Capacity</div>
                        <div className="text-lg font-semibold">{device?.nominalCapacity || "N/A"} kWh</div>
                      </div>
                    </div>
                    
                    <div className="bg-card/50 p-4 rounded-lg border">
                      <div className="flex flex-col items-center">
                        <div className="text-sm font-medium mb-1">Current Capacity</div>
                        <div className="text-lg font-semibold">{device?.currentCapacity || "N/A"} kWh</div>
                      </div>
                    </div>
                    
                    <div className="bg-card/50 p-4 rounded-lg border">
                      <div className="flex flex-col items-center">
                        <div className="text-sm font-medium mb-1">Capacity Retention</div>
                        <div className="text-lg font-semibold">
                          {device?.currentCapacity && device?.nominalCapacity 
                            ? `${((device.currentCapacity / device.nominalCapacity) * 100).toFixed(1)}%` 
                            : "N/A"}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-medium">Recent Capacity Tests</h3>
                    <span className="text-xs text-muted-foreground">
                      {capacityTests ? capacityTests.length : 0} tests recorded
                    </span>
                  </div>
                  
                  {capacityTestsLoading ? (
                    <div className="flex justify-center p-6">
                      <RefreshCw className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  ) : capacityTests && capacityTests.length > 0 ? (
                    <div className="space-y-4">
                      {capacityTests.slice(0, 3).map((test: any, index: number) => (
                        <div key={index} className="p-4 rounded-md bg-card/50 border">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="flex items-center">
                                <Badge 
                                  variant={test.status === 'completed' ? 'default' : 
                                           test.status === 'failed' ? 'destructive' : 
                                           test.status === 'scheduled' ? 'outline' : 'secondary'}
                                  className="capitalize mb-1"
                                >
                                  {test.status}
                                </Badge>
                                
                                <span className="ml-2 text-xs text-muted-foreground">
                                  {test.testType === 'full_cycle' ? 'Full Cycle Test' :
                                   test.testType === 'partial_cycle' ? 'Partial Cycle Test' :
                                   test.testType === 'pulse_test' ? 'Pulse Test' : 'Capacity Test'}
                                </span>
                              </div>
                              
                              <p className="text-sm font-medium mt-1">
                                {test.status === 'completed' ? 
                                  `Measured capacity: ${test.measuredCapacity} kWh (${((test.measuredCapacity / (device?.nominalCapacity || 1)) * 100).toFixed(1)}%)` : 
                                  test.status === 'scheduled' ? 
                                  'Test scheduled' : 
                                  'Test information'}
                              </p>
                              
                              {test.notes && (
                                <p className="text-xs text-muted-foreground mt-1">{test.notes}</p>
                              )}
                            </div>
                            
                            <div className="text-right">
                              <div className="text-xs text-muted-foreground">
                                {formatDate(test.startTime)}
                              </div>
                              
                              <div className="text-xs mt-1">
                                {test.chargeRate && test.dischargeRate && (
                                  <span>
                                    {test.chargeRate}C / {test.dischargeRate}C
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {test.status === 'completed' && (
                            <div className="grid grid-cols-3 gap-2 mt-3 text-xs">
                              <div>
                                <p className="text-muted-foreground">Duration</p>
                                <p>
                                  {test.duration ? 
                                    `${Math.floor(test.duration / 60)}h ${test.duration % 60}m` : 
                                    'N/A'}
                                </p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Energy In/Out</p>
                                <p>
                                  {test.energyIn && test.energyOut ? 
                                    `${test.energyIn.toFixed(1)} / ${test.energyOut.toFixed(1)} kWh` : 
                                    'N/A'}
                                </p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Efficiency</p>
                                <p>
                                  {test.roundTripEfficiency ? 
                                    `${(test.roundTripEfficiency * 100).toFixed(1)}%` : 
                                    'N/A'}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex justify-center p-6 text-muted-foreground">
                      No capacity tests recorded
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
            <CardFooter className="border-t pt-6">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Capacity Testing</AlertTitle>
                <AlertDescription>
                  Regular capacity tests help track battery degradation over time and optimize charging strategies.
                  It is recommended to perform a full capacity test every 30-60 days.
                </AlertDescription>
              </Alert>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default BatteryHealthPanel;