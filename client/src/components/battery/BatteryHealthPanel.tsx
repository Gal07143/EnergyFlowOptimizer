import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangleIcon, InfoIcon, CalendarIcon, BatteryChargingIcon, ThermometerIcon, LineChartIcon } from "lucide-react";

interface BatteryHealthPanelProps {
  deviceId: number;
}

const BatteryHealthPanel: React.FC<BatteryHealthPanelProps> = ({ deviceId }) => {
  const { data: device, isLoading: deviceLoading } = useQuery({
    queryKey: [`/api/devices/${deviceId}`],
  });
  
  const { data: healthData, isLoading: healthLoading, error: healthError } = useQuery({
    queryKey: [`/api/devices/${deviceId}/battery/telemetry/latest`],
  });
  
  const { data: capacityTests, isLoading: testsLoading } = useQuery({
    queryKey: [`/api/devices/${deviceId}/battery/capacity-tests`],
  });
  
  if (deviceLoading || healthLoading) {
    return <div className="flex justify-center p-8">Loading battery health data...</div>;
  }
  
  if (healthError) {
    return (
      <Alert variant="destructive" className="my-4">
        <AlertTriangleIcon className="h-4 w-4" />
        <AlertTitle>Error loading health data</AlertTitle>
        <AlertDescription>
          {(healthError as Error).message || "Failed to load battery health data"}
        </AlertDescription>
      </Alert>
    );
  }
  
  if (!healthData) {
    return (
      <Alert>
        <InfoIcon className="h-4 w-4" />
        <AlertTitle>No health data</AlertTitle>
        <AlertDescription>
          No health data found for this battery device.
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
  
  const getHealthDescription = (health?: number): string => {
    if (!health) return "Unknown";
    if (health >= 90) return "Excellent - battery is performing optimally";
    if (health >= 80) return "Very Good - minimal degradation detected";
    if (health >= 70) return "Good - degradation within normal parameters";
    if (health >= 60) return "Fair - moderate degradation, monitor closely";
    if (health >= 50) return "Mediocre - noticeable performance impact";
    if (health >= 30) return "Poor - significant degradation";
    return "Critical - replacement recommended";
  };
  
  const stateOfHealth = healthData?.stateOfHealth || 0;
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Battery Health Assessment</h2>
        <Button variant="outline" size="sm">
          Schedule Assessment
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="col-span-2">
          <CardHeader className="pb-3">
            <CardTitle>Health Overview</CardTitle>
            <CardDescription>Current health status and metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <div className="flex justify-between mb-2">
                  <div>
                    <span className="text-sm font-medium">State of Health</span>
                    <p className="text-xs text-muted-foreground mt-1">
                      {getHealthDescription(stateOfHealth)}
                    </p>
                  </div>
                  <span className="text-2xl font-bold">{stateOfHealth}%</span>
                </div>
                <Progress 
                  value={stateOfHealth} 
                  className="h-3"
                  // This will need to be handled in CSS as indicatorClassName doesn't exist
                  // in the current component definition
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="space-y-1.5">
                  <div className="text-xs text-muted-foreground">Capacity</div>
                  <div className="text-base font-medium">
                    {healthData.remainingCapacity?.toFixed(2) || "N/A"} kWh
                    <span className="text-xs text-muted-foreground ml-1">
                      / {device?.nominalCapacity || "Unknown"} kWh
                    </span>
                  </div>
                </div>
                
                <div className="space-y-1.5">
                  <div className="text-xs text-muted-foreground">Cycle Count</div>
                  <div className="text-base font-medium">
                    {healthData.cycleCount || "N/A"}
                    <span className="text-xs text-muted-foreground ml-1">
                      cycles
                    </span>
                  </div>
                </div>
                
                <div className="space-y-1.5">
                  <div className="text-xs text-muted-foreground">Age</div>
                  <div className="text-base font-medium">
                    {device?.installDate 
                      ? Math.floor((new Date().getTime() - new Date(device.installDate).getTime()) / (1000 * 60 * 60 * 24 * 30)) 
                      : "N/A"}
                    <span className="text-xs text-muted-foreground ml-1">
                      months
                    </span>
                  </div>
                </div>
                
                <div className="space-y-1.5">
                  <div className="text-xs text-muted-foreground">Est. Remaining Life</div>
                  <div className="text-base font-medium">
                    {healthData.estimatedRemainingLifetime
                      ? Math.round(healthData.estimatedRemainingLifetime / 30)
                      : "N/A"}
                    <span className="text-xs text-muted-foreground ml-1">
                      months
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Battery Specifications</CardTitle>
            <CardDescription>Technical parameters</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-1">
                <div className="text-xs text-muted-foreground">Chemistry</div>
                <div className="text-sm text-right capitalize">
                  {device?.batteryCellType?.replace(/_/g, ' ') || 'N/A'}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-1">
                <div className="text-xs text-muted-foreground">Cell Count</div>
                <div className="text-sm text-right">
                  {device?.cellCount || 'N/A'}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-1">
                <div className="text-xs text-muted-foreground">Nominal Capacity</div>
                <div className="text-sm text-right">
                  {device?.nominalCapacity ? `${device.nominalCapacity} kWh` : 'N/A'}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-1">
                <div className="text-xs text-muted-foreground">Nominal Voltage</div>
                <div className="text-sm text-right">
                  {device?.nominalVoltage ? `${device.nominalVoltage} V` : 'N/A'}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-1">
                <div className="text-xs text-muted-foreground">Cell Balancing</div>
                <div className="text-sm text-right capitalize">
                  {device?.batteryBalancingMethod?.replace(/_/g, ' ') || 'N/A'}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-1">
                <div className="text-xs text-muted-foreground">Manufacturer</div>
                <div className="text-sm text-right">
                  {device?.manufacturer || 'N/A'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Latest Capacity Test Results</CardTitle>
          <CardDescription>
            Results from recent capacity tests
          </CardDescription>
        </CardHeader>
        <CardContent>
          {testsLoading ? (
            <div className="text-center text-muted-foreground py-6">Loading capacity test data...</div>
          ) : !capacityTests || capacityTests.length === 0 ? (
            <div className="text-center text-muted-foreground py-6">
              No capacity tests have been performed yet
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left text-xs font-medium py-2">Date</th>
                    <th className="text-left text-xs font-medium py-2">Type</th>
                    <th className="text-left text-xs font-medium py-2">Start SoC</th>
                    <th className="text-left text-xs font-medium py-2">End SoC</th>
                    <th className="text-left text-xs font-medium py-2">Measured Capacity</th>
                    <th className="text-left text-xs font-medium py-2">Health</th>
                  </tr>
                </thead>
                <tbody>
                  {capacityTests.map((test: any) => (
                    <tr key={test.id} className="border-b">
                      <td className="py-2 text-sm">
                        {new Date(test.startTime).toLocaleDateString()}
                      </td>
                      <td className="py-2 text-sm capitalize">
                        {test.testType?.replace(/_/g, ' ') || 'N/A'}
                      </td>
                      <td className="py-2 text-sm">
                        {test.initialSoC ? `${test.initialSoC}%` : 'N/A'}
                      </td>
                      <td className="py-2 text-sm">
                        {test.finalSoC ? `${test.finalSoC}%` : 'N/A'}
                      </td>
                      <td className="py-2 text-sm">
                        {test.measuredCapacity ? `${test.measuredCapacity.toFixed(2)} kWh` : 'N/A'}
                      </td>
                      <td className="py-2 text-sm">
                        {test.calculatedSoh ? `${test.calculatedSoh.toFixed(1)}%` : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Button variant="outline" size="sm" className="ml-auto">
            Schedule Capacity Test
          </Button>
        </CardFooter>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Health Analysis</CardTitle>
          <CardDescription>
            Battery health assessment and recommendations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-card/50">
                <CardHeader className="pb-2">
                  <div className="flex items-center">
                    <BatteryChargingIcon className="h-4 w-4 mr-2" />
                    <CardTitle className="text-base">Health Trend</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-sm">
                    {stateOfHealth >= 90 
                      ? "Battery degradation is minimal and following the expected curve." 
                      : stateOfHealth >= 70 
                      ? "Battery degradation is within normal parameters." 
                      : stateOfHealth >= 50 
                      ? "Battery degradation is accelerated." 
                      : "Battery degradation is severe and requires attention."}
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-card/50">
                <CardHeader className="pb-2">
                  <div className="flex items-center">
                    <ThermometerIcon className="h-4 w-4 mr-2" />
                    <CardTitle className="text-base">Thermal Analysis</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-sm">
                    {healthData.maxTemperature && healthData.maxTemperature > 40 
                      ? "High operating temperatures detected, which may accelerate battery degradation." 
                      : healthData.maxTemperature && healthData.minTemperature && 
                        (healthData.maxTemperature - healthData.minTemperature > 5)
                      ? "Temperature gradient between cells is higher than optimal." 
                      : "Thermal conditions are within acceptable parameters."}
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-card/50">
                <CardHeader className="pb-2">
                  <div className="flex items-center">
                    <LineChartIcon className="h-4 w-4 mr-2" />
                    <CardTitle className="text-base">Usage Pattern</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-sm">
                    {healthData.cycleCount && healthData.cycleCount > 500
                      ? "High cycle count detected, which is contributing to battery degradation."
                      : "Usage patterns are within normal operational parameters."}
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <div className="mt-6">
              <h3 className="text-sm font-medium mb-3">Recommendations</h3>
              <div className="space-y-3">
                {stateOfHealth < 50 && (
                  <Alert>
                    <AlertTriangleIcon className="h-4 w-4" />
                    <AlertTitle className="text-sm">Battery Replacement</AlertTitle>
                    <AlertDescription className="text-xs">
                      Battery health is below 50%, which may significantly impact system performance and reliability. 
                      Consider scheduling a replacement within the next {Math.max(1, Math.floor(healthData.estimatedRemainingLifetime / 30))} months.
                    </AlertDescription>
                  </Alert>
                )}
                
                {healthData.cellVoltageDelta && healthData.cellVoltageDelta > 0.1 && (
                  <Alert>
                    <AlertTriangleIcon className="h-4 w-4" />
                    <AlertTitle className="text-sm">Cell Balancing Recommended</AlertTitle>
                    <AlertDescription className="text-xs">
                      Cell voltage imbalance ({healthData.cellVoltageDelta.toFixed(3)}V) exceeds the recommended threshold (0.100V).
                      Schedule a cell balancing procedure to improve performance and extend battery life.
                    </AlertDescription>
                  </Alert>
                )}
                
                {healthData.maxTemperature && healthData.maxTemperature > 40 && (
                  <Alert>
                    <AlertTriangleIcon className="h-4 w-4" />
                    <AlertTitle className="text-sm">Temperature Management</AlertTitle>
                    <AlertDescription className="text-xs">
                      High operating temperatures detected (max: {healthData.maxTemperature.toFixed(1)}°C).
                      Improve thermal management to extend battery life.
                    </AlertDescription>
                  </Alert>
                )}
                
                {(!capacityTests || capacityTests.length === 0) && (
                  <Alert>
                    <InfoIcon className="h-4 w-4" />
                    <AlertTitle className="text-sm">Baseline Capacity Test</AlertTitle>
                    <AlertDescription className="text-xs">
                      No capacity tests have been performed. Schedule a baseline capacity test to improve health tracking accuracy.
                    </AlertDescription>
                  </Alert>
                )}
                
                {!healthData.alarmStates && !healthData.warningStates && stateOfHealth >= 70 && (
                  <div className="text-sm text-muted-foreground">
                    No specific recommendations at this time. Battery is operating within normal parameters.
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BatteryHealthPanel;