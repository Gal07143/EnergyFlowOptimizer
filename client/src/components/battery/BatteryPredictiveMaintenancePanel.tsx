import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarClock,
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ClipboardCheck,
  Clock,
  Wrench,
  Activity,
  Calendar,
  ArrowUpDown,
  Info as InfoIcon,
  Bell as BellIcon,
  RefreshCw,
  BarChart,
  LineChart,
  Timer as TimerIcon,
} from "lucide-react";

interface BatteryPredictiveMaintenancePanelProps {
  deviceId: number;
}

const BatteryPredictiveMaintenancePanel: React.FC<BatteryPredictiveMaintenancePanelProps> = ({ deviceId }) => {
  const [activeTab, setActiveTab] = useState<string>("overview");
  
  // Fetch device data
  const { data: device, isLoading: deviceLoading } = useQuery({
    queryKey: [`/api/devices/${deviceId}`],
  });
  
  // Fetch maintenance data (API not implemented yet)
  const { data: maintenanceData, isLoading: maintenanceLoading } = useQuery({
    queryKey: [`/api/devices/${deviceId}/battery/maintenance`],
    enabled: false, // Disabled until we implement the API
  });
  
  // Mock data for now (will be replaced by actual API data)
  const mockMaintenanceData = {
    nextMaintenanceDate: "2025-06-15",
    maintenanceInterval: 90, // days
    daysUntilNextMaintenance: 45,
    maintenanceHistory: [
      {
        id: 123,
        date: "2025-01-15",
        type: "routine",
        technician: "David Cohen",
        findings: "Normal wear and tear. Replaced cooling fan.",
        actionsTaken: [
          "Firmware updated to v4.2.1",
          "Cell balancing performed",
          "Cooling system cleaned"
        ],
        nextScheduled: "2025-04-15"
      },
      {
        id: 112,
        date: "2024-10-22",
        type: "preventive",
        technician: "Sarah Johnson",
        findings: "Cell imbalance detected before it caused issues",
        actionsTaken: [
          "Cell balancing performed",
          "Cooling system inspected", 
          "Temperature sensors calibrated"
        ],
        nextScheduled: "2025-01-15"
      }
    ],
    healthIndicators: {
      cellBalance: 92, // 0-100 score
      coolingEfficiency: 87,
      controllerHealth: 98,
      terminalCondition: 95,
      batteryManagementSystem: 93
    },
    activeWarnings: [
      {
        id: 45,
        severity: "low",
        description: "Slight cell imbalance detected",
        recommendedAction: "Schedule balancing at next maintenance",
        detectedDate: "2025-03-22"
      }
    ],
    upgrades: [
      {
        id: 12,
        type: "firmware",
        currentVersion: "4.2.1",
        availableVersion: "4.3.0",
        releaseDate: "2025-03-10",
        improvements: [
          "Improved thermal management algorithm",
          "Enhanced cell balancing efficiency",
          "Fixed reporting issues on certain metrics"
        ],
        recommendedDate: "2025-04-10"
      }
    ],
    predictedIssues: [
      {
        component: "Cooling fan",
        probabilityOfFailure: 23, // percentage
        estimatedTimeToFailure: 120, // days
        recommendedAction: "Inspect at next maintenance cycle",
        potentialImpact: "Minor performance degradation if not addressed"
      },
      {
        component: "Cell group 3",
        probabilityOfFailure: 12,
        estimatedTimeToFailure: 180,
        recommendedAction: "Monitor for increased voltage variance",
        potentialImpact: "Capacity reduction if imbalance increases"
      }
    ],
    optimizationOpportunities: [
      {
        id: 34,
        title: "Thermal management optimization",
        potentialBenefit: "Reduce degradation by up to 0.4% per month",
        implementation: "Software update to optimize cooling system control",
        costLevel: "low"
      },
      {
        id: 35,
        title: "Recalibrate capacity measurement",
        potentialBenefit: "Improve SoC accuracy by 2-3%",
        implementation: "Perform full charge/discharge cycle under controlled conditions",
        costLevel: "medium"
      }
    ],
    lifeExtensionScore: 87, // 0-100
    maintenanceEfficiency: 92 // 0-100
  };
  
  // Use mock data for now
  const data = mockMaintenanceData;
  
  // Date formatting helper
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
  // Calculate days remaining to next maintenance
  const getDaysColor = (days: number): string => {
    if (days < 7) return "text-red-500";
    if (days < 14) return "text-amber-500";
    return "text-green-500";
  };
  
  // Get severity color
  const getSeverityColor = (severity: string): string => {
    switch (severity) {
      case 'critical': return "text-red-500";
      case 'high': return "text-orange-500";
      case 'medium': return "text-amber-500";
      case 'low': return "text-blue-500";
      default: return "text-muted-foreground";
    }
  };
  
  // Get severity badge variant
  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical': return "destructive";
      case 'high': return "secondary";
      case 'medium': return "secondary";
      case 'low': return "default";
      default: return "outline";
    }
  } as const;
  
  // Get cost level color
  const getCostLevelColor = (level: string): string => {
    switch (level) {
      case 'high': return "text-red-500";
      case 'medium': return "text-amber-500";
      case 'low': return "text-green-500";
      default: return "text-muted-foreground";
    }
  };
  
  if (deviceLoading) {
    return <div className="flex justify-center p-8">Loading maintenance data...</div>;
  }
  
  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card>
        <CardHeader>
          <div className="flex justify-between">
            <div>
              <CardTitle className="text-xl">Predictive Maintenance</CardTitle>
              <CardDescription>
                Proactive maintenance planning based on AI analysis
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" className="gap-1">
              <CalendarClock className="h-4 w-4" /> Schedule Maintenance
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Next Scheduled Maintenance</h3>
              <div className="bg-card/50 p-4 rounded-lg border text-center">
                <Calendar className="h-6 w-6 mx-auto mb-2 text-primary" />
                <p className="text-lg font-bold">{formatDate(data.nextMaintenanceDate)}</p>
                <p className={`text-sm font-medium ${getDaysColor(data.daysUntilNextMaintenance)}`}>
                  {data.daysUntilNextMaintenance} days remaining
                </p>
              </div>
            </div>
            
            <div className="space-y-2">
              <h3 className="text-sm font-medium">System Health Score</h3>
              <div className="bg-card/50 p-4 rounded-lg border text-center">
                <Activity className="h-6 w-6 mx-auto mb-2 text-primary" />
                <div className="mb-1">
                  <span className="text-lg font-bold">{data.lifeExtensionScore}</span>
                  <span className="text-sm text-muted-foreground">/100</span>
                </div>
                <Progress value={data.lifeExtensionScore} className="h-2 mb-1" />
                <p className="text-xs text-muted-foreground">
                  {data.lifeExtensionScore >= 90 ? "Excellent" : 
                   data.lifeExtensionScore >= 75 ? "Good" : 
                   data.lifeExtensionScore >= 60 ? "Fair" : "Needs attention"}
                </p>
              </div>
            </div>
            
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Active Warnings</h3>
              <div className="bg-card/50 p-4 rounded-lg border text-center">
                <AlertTriangle className={`h-6 w-6 mx-auto mb-2 ${data.activeWarnings.length > 0 ? "text-amber-500" : "text-green-500"}`} />
                <p className="text-lg font-bold">{data.activeWarnings.length}</p>
                <p className="text-sm text-muted-foreground">
                  {data.activeWarnings.length === 0 ? "No active warnings" : 
                   data.activeWarnings.length === 1 ? "1 active warning" :
                   `${data.activeWarnings.length} active warnings`}
                </p>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Component Health</h3>
              <div className="space-y-3 bg-card/50 p-4 rounded-lg border">
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Cell Balance</span>
                    <span className="font-medium">{data.healthIndicators.cellBalance}/100</span>
                  </div>
                  <Progress value={data.healthIndicators.cellBalance} className="h-1.5" />
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Cooling Efficiency</span>
                    <span className="font-medium">{data.healthIndicators.coolingEfficiency}/100</span>
                  </div>
                  <Progress value={data.healthIndicators.coolingEfficiency} className="h-1.5" />
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Controller Health</span>
                    <span className="font-medium">{data.healthIndicators.controllerHealth}/100</span>
                  </div>
                  <Progress value={data.healthIndicators.controllerHealth} className="h-1.5" />
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Terminal Condition</span>
                    <span className="font-medium">{data.healthIndicators.terminalCondition}/100</span>
                  </div>
                  <Progress value={data.healthIndicators.terminalCondition} className="h-1.5" />
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">BMS Health</span>
                    <span className="font-medium">{data.healthIndicators.batteryManagementSystem}/100</span>
                  </div>
                  <Progress value={data.healthIndicators.batteryManagementSystem} className="h-1.5" />
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Predicted Issues</h3>
              <div className="space-y-3 bg-card/50 p-4 rounded-lg border max-h-[220px] overflow-y-auto">
                {data.predictedIssues.map((issue, index) => (
                  <div key={index} className="p-3 rounded border bg-background/50">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-medium">{issue.component}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {issue.potentialImpact}
                        </p>
                      </div>
                      <Badge variant={
                        issue.probabilityOfFailure > 50 ? "destructive" : 
                        issue.probabilityOfFailure > 25 ? "secondary" : "outline"
                      }>
                        {issue.probabilityOfFailure}% risk
                      </Badge>
                    </div>
                    <div className="flex items-center mt-2">
                      <TimerIcon className="h-4 w-4 text-muted-foreground mr-1" />
                      <span className="text-xs text-muted-foreground">
                        Est. {issue.estimatedTimeToFailure} days until failure
                      </span>
                    </div>
                    <p className="text-xs font-medium mt-2">
                      {issue.recommendedAction}
                    </p>
                  </div>
                ))}
                
                {data.predictedIssues.length === 0 && (
                  <div className="flex flex-col items-center justify-center p-6 text-center">
                    <CheckCircle className="h-8 w-8 text-green-500 mb-2" />
                    <p className="text-sm font-medium">No predicted issues</p>
                    <p className="text-xs text-muted-foreground">All systems operating normally</p>
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
          <TabsTrigger value="history">
            <ClipboardCheck className="h-4 w-4 mr-2" />
            Maintenance History
          </TabsTrigger>
          <TabsTrigger value="warnings">
            <AlertTriangle className="h-4 w-4 mr-2" />
            Warnings
          </TabsTrigger>
          <TabsTrigger value="upgrades">
            <ArrowUpDown className="h-4 w-4 mr-2" />
            Upgrades
          </TabsTrigger>
          <TabsTrigger value="optimization">
            <BarChart className="h-4 w-4 mr-2" />
            Optimization
          </TabsTrigger>
        </TabsList>
        
        {/* Maintenance History Tab */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Maintenance History</CardTitle>
              <CardDescription>
                Past maintenance records and service history
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {data.maintenanceHistory.map((record, index) => (
                  <div key={index} className="border rounded-lg p-4 bg-card/50">
                    <div className="flex flex-col sm:flex-row justify-between">
                      <div>
                        <div className="flex items-center">
                          <Badge variant="outline" className="capitalize mr-2">
                            {record.type}
                          </Badge>
                          <span className="text-sm text-muted-foreground">ID: {record.id}</span>
                        </div>
                        <h3 className="text-lg font-medium mt-1">
                          Maintenance on {formatDate(record.date)}
                        </h3>
                      </div>
                      <div className="text-sm text-muted-foreground mt-2 sm:mt-0">
                        <p>Technician: {record.technician}</p>
                        <p>Next scheduled: {formatDate(record.nextScheduled)}</p>
                      </div>
                    </div>
                    
                    <Separator className="my-3" />
                    
                    <div className="space-y-2">
                      <p className="text-sm">{record.findings}</p>
                      <div>
                        <h4 className="text-sm font-medium">Actions Taken:</h4>
                        <ul className="mt-1 space-y-1">
                          {record.actionsTaken.map((action, idx) => (
                            <li key={idx} className="text-sm flex items-center">
                              <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                              {action}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button variant="outline" size="sm">View All Records</Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        {/* Warnings Tab */}
        <TabsContent value="warnings">
          <Card>
            <CardHeader>
              <CardTitle>Active Warnings</CardTitle>
              <CardDescription>
                Current issues requiring attention
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.activeWarnings.length > 0 ? (
                <div className="space-y-4">
                  {data.activeWarnings.map((warning, index) => (
                    <Alert key={index} variant={warning.severity === "low" ? "default" : "destructive"}>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle className="flex items-center">
                        <span>{warning.description}</span>
                        <Badge variant={getSeverityBadge(warning.severity)} className="ml-2 capitalize">
                          {warning.severity}
                        </Badge>
                      </AlertTitle>
                      <AlertDescription className="space-y-2">
                        <p>{warning.recommendedAction}</p>
                        <p className="text-xs text-muted-foreground">
                          First detected: {formatDate(warning.detectedDate)}
                        </p>
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-12 text-center">
                  <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
                  <h3 className="text-xl font-medium mb-2">All Systems Normal</h3>
                  <p className="text-muted-foreground">
                    No active warnings or alerts detected in the system
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Upgrades Tab */}
        <TabsContent value="upgrades">
          <Card>
            <CardHeader>
              <CardTitle>Available Upgrades</CardTitle>
              <CardDescription>
                Software, firmware and hardware updates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {data.upgrades.map((upgrade, index) => (
                  <div key={index} className="border rounded-lg p-4 bg-card/50">
                    <div className="flex justify-between">
                      <div>
                        <Badge className="uppercase">{upgrade.type}</Badge>
                        <h3 className="text-lg font-medium mt-1">
                          Update to version {upgrade.availableVersion}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Current version: {upgrade.currentVersion}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm">Released: {formatDate(upgrade.releaseDate)}</p>
                        <p className="text-sm text-muted-foreground">
                          Recommended by: {formatDate(upgrade.recommendedDate)}
                        </p>
                      </div>
                    </div>
                    
                    <Separator className="my-3" />
                    
                    <div>
                      <h4 className="text-sm font-medium">Improvements:</h4>
                      <ul className="mt-1 space-y-1">
                        {upgrade.improvements.map((improvement, idx) => (
                          <li key={idx} className="text-sm flex items-center">
                            <ArrowUpDown className="h-4 w-4 text-blue-500 mr-2 flex-shrink-0" />
                            {improvement}
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    <div className="mt-4 flex justify-end">
                      <Button variant="outline" size="sm">Schedule Update</Button>
                    </div>
                  </div>
                ))}
                
                {data.upgrades.length === 0 && (
                  <div className="flex flex-col items-center justify-center p-10 text-center">
                    <CheckCircle className="h-10 w-10 text-green-500 mb-2" />
                    <p className="text-lg font-medium">System Up-to-Date</p>
                    <p className="text-sm text-muted-foreground">
                      All software and firmware is at the latest version
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Optimization Tab */}
        <TabsContent value="optimization">
          <Card>
            <CardHeader>
              <CardTitle>Optimization Opportunities</CardTitle>
              <CardDescription>
                Recommendations to improve performance and longevity
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.optimizationOpportunities.map((opt, index) => (
                  <div key={index} className="border rounded-lg p-4 bg-card/50">
                    <div className="flex justify-between">
                      <h3 className="text-md font-medium">{opt.title}</h3>
                      <Badge variant="outline" className={getCostLevelColor(opt.costLevel)}>
                        {opt.costLevel} cost
                      </Badge>
                    </div>
                    
                    <p className="text-sm mt-2">{opt.potentialBenefit}</p>
                    
                    <div className="flex justify-between items-center mt-3">
                      <p className="text-sm text-muted-foreground">{opt.implementation}</p>
                      <Button variant="outline" size="sm">Apply</Button>
                    </div>
                  </div>
                ))}
                
                {data.optimizationOpportunities.length === 0 && (
                  <div className="flex flex-col items-center justify-center p-10 text-center">
                    <CheckCircle className="h-10 w-10 text-green-500 mb-2" />
                    <p className="text-lg font-medium">Fully Optimized</p>
                    <p className="text-sm text-muted-foreground">
                      Your system is already running at optimal settings
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter className="border-t pt-6">
              <Alert>
                <InfoIcon className="h-4 w-4" />
                <AlertTitle>Maintenance Efficiency Score</AlertTitle>
                <AlertDescription className="flex justify-between items-center">
                  <span>
                    Your current maintenance efficiency score is {data.maintenanceEfficiency}/100, which is
                    {data.maintenanceEfficiency >= 90 ? " excellent" :
                     data.maintenanceEfficiency >= 75 ? " good" :
                     data.maintenanceEfficiency >= 60 ? " fair" : " needs improvement"}.
                  </span>
                  <Progress value={data.maintenanceEfficiency} className="w-32 h-2" />
                </AlertDescription>
              </Alert>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default BatteryPredictiveMaintenancePanel;