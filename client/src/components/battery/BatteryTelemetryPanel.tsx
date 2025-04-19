import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangleIcon, InfoIcon, DownloadIcon, RefreshCwIcon } from "lucide-react";

interface BatteryTelemetryPanelProps {
  deviceId: number;
}

const BatteryTelemetryPanel: React.FC<BatteryTelemetryPanelProps> = ({ deviceId }) => {
  const [activeTab, setActiveTab] = useState("real-time");
  const [refreshKey, setRefreshKey] = useState(0);
  
  const { data: telemetry, isLoading: telemetryLoading, error: telemetryError } = useQuery({
    queryKey: [`/api/devices/${deviceId}/battery/telemetry/latest`, refreshKey],
    queryFn: undefined, // Will use the default fetcher configured in the app
  });
  
  const { data: telemetryHistory, isLoading: historyLoading, error: historyError } = useQuery({
    queryKey: [`/api/devices/${deviceId}/battery/telemetry/history`],
    queryFn: undefined, // Will use the default fetcher configured in the app
  });
  
  const handleRefreshData = () => {
    setRefreshKey(prevKey => prevKey + 1);
  };
  
  if (telemetryLoading && activeTab === "real-time") {
    return <div className="flex justify-center p-8">Loading battery telemetry data...</div>;
  }
  
  if (telemetryError && activeTab === "real-time") {
    return (
      <Alert variant="destructive" className="my-4">
        <AlertTriangleIcon className="h-4 w-4" />
        <AlertTitle>Error loading telemetry data</AlertTitle>
        <AlertDescription>
          {(telemetryError as Error).message || "Failed to load battery telemetry data"}
        </AlertDescription>
      </Alert>
    );
  }
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Battery Telemetry</h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefreshData}>
            <RefreshCwIcon className="h-4 w-4 mr-2" />
            Refresh Data
          </Button>
        </div>
      </div>
      
      <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-2 mb-4">
          <TabsTrigger value="real-time">Real-Time Telemetry</TabsTrigger>
          <TabsTrigger value="history">Historical Data</TabsTrigger>
        </TabsList>
        
        <TabsContent value="real-time" className="space-y-4">
          {telemetry ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Battery Status</CardTitle>
                    <CardDescription>Current state and operational metrics</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">State of Charge</div>
                        <div className="text-xl font-semibold">{telemetry.stateOfCharge}%</div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">State of Health</div>
                        <div className="text-xl font-semibold">{telemetry.stateOfHealth}%</div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">Cycle Count</div>
                        <div className="text-xl font-semibold">{telemetry.cycleCount || "N/A"}</div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">Remaining Capacity</div>
                        <div className="text-xl font-semibold">{telemetry.remainingCapacity?.toFixed(2) || "N/A"} kWh</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Electrical</CardTitle>
                    <CardDescription>Voltage, current, and power metrics</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">Total Voltage</div>
                        <div className="text-xl font-semibold">{telemetry.totalVoltage?.toFixed(1) || "N/A"} V</div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">Current</div>
                        <div className="text-xl font-semibold">
                          {telemetry.currentCharge ? `${telemetry.currentCharge.toFixed(1)} A (charging)` : 
                           telemetry.currentDischarge ? `${telemetry.currentDischarge.toFixed(1)} A (discharging)` : "0.0 A"}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">Power</div>
                        <div className="text-xl font-semibold">{telemetry.instantPower?.toFixed(2) || "N/A"} kW</div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">Internal Resistance</div>
                        <div className="text-xl font-semibold">{telemetry.internalResistance?.toFixed(2) || "N/A"} mΩ</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              <Card>
                <CardHeader>
                  <CardTitle>Cell-Level Data</CardTitle>
                  <CardDescription>Individual cell voltage and temperature</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-sm font-medium mb-2">Cell Voltages</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Min: {telemetry.minCellVoltage?.toFixed(3) || "N/A"} V</span>
                          <span>Max: {telemetry.maxCellVoltage?.toFixed(3) || "N/A"} V</span>
                          <span>Avg: {telemetry.avgCellVoltage?.toFixed(3) || "N/A"} V</span>
                          <span>Δ: {telemetry.cellVoltageDelta?.toFixed(3) || "N/A"} V</span>
                        </div>
                        
                        {telemetry.cellVoltageDelta && telemetry.cellVoltageDelta > 0.1 && (
                          <Alert variant="warning" className="mt-2 py-2">
                            <AlertTitle className="text-xs">Cell Voltage Imbalance</AlertTitle>
                            <AlertDescription className="text-xs">
                              Cell voltage difference exceeds 100 mV, which may indicate cell imbalance.
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-sm font-medium mb-2">Cell Temperatures</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Min: {telemetry.minTemperature?.toFixed(1) || "N/A"}°C</span>
                          <span>Max: {telemetry.maxTemperature?.toFixed(1) || "N/A"}°C</span>
                          <span>Avg: {telemetry.avgTemperature?.toFixed(1) || "N/A"}°C</span>
                          <span>Δ: {telemetry.maxTemperature && telemetry.minTemperature ? 
                            (telemetry.maxTemperature - telemetry.minTemperature).toFixed(1) : "N/A"}°C</span>
                        </div>
                        
                        {telemetry.maxTemperature && telemetry.minTemperature && 
                          (telemetry.maxTemperature - telemetry.minTemperature > 5) && (
                          <Alert variant="warning" className="mt-2 py-2">
                            <AlertTitle className="text-xs">Temperature Gradient</AlertTitle>
                            <AlertDescription className="text-xs">
                              Temperature difference between cells exceeds 5°C, which may affect performance.
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <Separator className="my-4" />
                  
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-medium">Cell Balancing Status</h3>
                    <Badge variant={telemetry.cellBalancingStatus?.some(status => status) ? "default" : "outline"}>
                      {telemetry.cellBalancingStatus?.some(status => status) ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Alert>
              <InfoIcon className="h-4 w-4" />
              <AlertTitle>No telemetry data</AlertTitle>
              <AlertDescription>
                No recent telemetry data found for this battery device.
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>
        
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Historical Telemetry</CardTitle>
              <CardDescription>Battery performance over time</CardDescription>
            </CardHeader>
            <CardContent>
              {historyLoading ? (
                <div className="flex justify-center p-8">Loading historical data...</div>
              ) : historyError ? (
                <Alert variant="destructive" className="my-4">
                  <AlertTriangleIcon className="h-4 w-4" />
                  <AlertTitle>Error loading historical data</AlertTitle>
                  <AlertDescription>
                    {(historyError as Error).message || "Failed to load historical telemetry data"}
                  </AlertDescription>
                </Alert>
              ) : !telemetryHistory || telemetryHistory.length === 0 ? (
                <Alert>
                  <InfoIcon className="h-4 w-4" />
                  <AlertTitle>No historical data</AlertTitle>
                  <AlertDescription>
                    No historical telemetry data found for this battery device.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-6">
                  <div className="text-center text-muted-foreground mb-4">
                    Historical data visualization will be displayed here when available.
                  </div>
                  <Button variant="outline" size="sm" className="w-full">
                    <DownloadIcon className="h-4 w-4 mr-2" />
                    Export Data as CSV
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default BatteryTelemetryPanel;