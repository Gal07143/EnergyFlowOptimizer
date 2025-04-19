import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useQuery } from "@tanstack/react-query";
import { Battery, BatteryCharging, ThermometerIcon, HistoryIcon, AlertTriangleIcon, InfoIcon } from "lucide-react";
import BatteryHealthPanel from "./BatteryHealthPanel";
import BatteryTelemetryPanel from "./BatteryTelemetryPanel";

interface BatteryManagementPanelProps {
  deviceId: number;
}

const BatteryManagementPanel: React.FC<BatteryManagementPanelProps> = ({ deviceId }) => {
  const [activeTab, setActiveTab] = useState<string>("health");
  
  const { data: device, isLoading: deviceLoading } = useQuery({
    queryKey: [`/api/devices/${deviceId}`],
  });
  
  if (deviceLoading) {
    return <div className="flex justify-center p-8">Loading battery information...</div>;
  }
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Battery Management System</h2>
        <Badge variant="outline" className="capitalize">
          {device?.batteryHealthStatus || "Unknown"} Health
        </Badge>
      </div>
      
      <Card className="mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Quick Overview</CardTitle>
          <CardDescription>Current battery status and metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex flex-col items-center justify-center bg-card/50 p-4 rounded-lg border">
              <div className="flex items-center gap-2 mb-1">
                <Battery className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium">State of Health</span>
              </div>
              <span className="text-2xl font-bold">{device?.stateOfHealth || "N/A"}%</span>
            </div>
            
            <div className="flex flex-col items-center justify-center bg-card/50 p-4 rounded-lg border">
              <div className="flex items-center gap-2 mb-1">
                <BatteryCharging className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium">State of Charge</span>
              </div>
              <span className="text-2xl font-bold">{device?.stateOfCharge || "N/A"}%</span>
            </div>
            
            <div className="flex flex-col items-center justify-center bg-card/50 p-4 rounded-lg border">
              <div className="flex items-center gap-2 mb-1">
                <ThermometerIcon className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium">Temperature</span>
              </div>
              <span className="text-2xl font-bold">{device?.temperature ? `${device.temperature}°C` : "N/A"}</span>
            </div>
            
            <div className="flex flex-col items-center justify-center bg-card/50 p-4 rounded-lg border">
              <div className="flex items-center gap-2 mb-1">
                <HistoryIcon className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium">Cycles</span>
              </div>
              <span className="text-2xl font-bold">{device?.cycleCount || "N/A"}</span>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="health">
            <Battery className="h-4 w-4 mr-2" />
            Health & Status
          </TabsTrigger>
          <TabsTrigger value="telemetry">
            <BatteryCharging className="h-4 w-4 mr-2" />
            Telemetry
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="health" className="space-y-4">
          <BatteryHealthPanel deviceId={deviceId} />
        </TabsContent>
        
        <TabsContent value="telemetry" className="space-y-4">
          <BatteryTelemetryPanel deviceId={deviceId} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default BatteryManagementPanel;