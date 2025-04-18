import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { queryClient, apiRequest } from "@/lib/queryClient";
import DeviceHealthCard from "@/components/maintenance/DeviceHealthCard";
import MaintenanceAlertsList, { MaintenanceAlert } from "@/components/maintenance/MaintenanceAlertsList";
import MaintenanceIssueList, { MaintenanceIssue } from "@/components/maintenance/MaintenanceIssueList";
import AIAnalysisCard from "@/components/maintenance/AIAnalysisCard";
import DeviceHealthMetricsChart from "@/components/maintenance/DeviceHealthMetricsChart";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "lucide-react";
import { DatePicker } from "@/components/ui/date-picker";

interface Device {
  id: number;
  name: string;
  type: string;
  model?: string;
  manufacturer?: string;
  siteId: number;
}

interface ResolveIssueFormData {
  issueId: number;
  resolution: string;
  notes?: string;
  maintenanceCost?: number;
}

const PredictiveMaintenancePage: React.FC = () => {
  const { toast } = useToast();
  const [selectedTab, setSelectedTab] = useState("overview");
  const [selectedDeviceId, setSelectedDeviceId] = useState<number | null>(null);
  const [selectedSiteId, setSelectedSiteId] = useState<number | null>(null);
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
  const [selectedIssueId, setSelectedIssueId] = useState<number | null>(null);
  const [resolution, setResolution] = useState("");
  const [notes, setNotes] = useState("");
  const [maintenanceCost, setMaintenanceCost] = useState<string>("");
  const [analyzeDialogOpen, setAnalyzeDialogOpen] = useState(false);
  const [deviceForAnalysis, setDeviceForAnalysis] = useState<Device | null>(null);
  const [createScheduleDialogOpen, setCreateScheduleDialogOpen] = useState(false);
  const [scheduleTitle, setScheduleTitle] = useState("");
  const [scheduleDescription, setScheduleDescription] = useState("");
  const [scheduleFrequency, setScheduleFrequency] = useState("monthly");
  const [scheduleStartDate, setScheduleStartDate] = useState<Date | undefined>(new Date());

  // Get sites
  const { data: sites } = useQuery({
    queryKey: ["/api/sites"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/sites");
      return await res.json();
    },
  });

  // Get devices
  const { data: devices, isLoading: isLoadingDevices } = useQuery({
    queryKey: ["/api/devices", selectedSiteId],
    queryFn: async () => {
      const url = selectedSiteId 
        ? `/api/sites/${selectedSiteId}/devices` 
        : "/api/devices";
      const res = await apiRequest("GET", url);
      return await res.json();
    },
  });

  // Get health metrics for a device
  const { data: deviceHealth, isLoading: isLoadingHealth } = useQuery({
    queryKey: ["/api/maintenance/devices", selectedDeviceId, "health"],
    queryFn: async () => {
      if (!selectedDeviceId) return null;
      const res = await apiRequest("GET", `/api/maintenance/devices/${selectedDeviceId}/health`);
      return await res.json();
    },
    enabled: !!selectedDeviceId,
  });

  // Get health metrics history for a device
  const { data: healthHistory, isLoading: isLoadingHealthHistory } = useQuery({
    queryKey: ["/api/maintenance/devices", selectedDeviceId, "health/history"],
    queryFn: async () => {
      if (!selectedDeviceId) return [];
      const res = await apiRequest("GET", `/api/maintenance/devices/${selectedDeviceId}/health/history`);
      return await res.json();
    },
    enabled: !!selectedDeviceId && selectedTab === "metrics",
  });

  // Get maintenance issues for a device or site
  const { data: maintenanceIssues, isLoading: isLoadingIssues } = useQuery({
    queryKey: ["/api/maintenance/issues", selectedDeviceId, selectedSiteId],
    queryFn: async () => {
      let url = "/api/maintenance/issues";
      if (selectedDeviceId) {
        url = `/api/maintenance/devices/${selectedDeviceId}/issues`;
      }
      const res = await apiRequest("GET", url);
      return await res.json();
    },
  });

  // Get maintenance alerts for a device or site
  const { data: maintenanceAlerts, isLoading: isLoadingAlerts } = useQuery({
    queryKey: ["/api/maintenance/alerts", selectedDeviceId, selectedSiteId],
    queryFn: async () => {
      let url = "/api/maintenance/alerts";
      if (selectedDeviceId) {
        url = `/api/maintenance/devices/${selectedDeviceId}/alerts`;
      }
      const res = await apiRequest("GET", url);
      return await res.json();
    },
  });

  // Get AI health analysis for selected device
  const { data: aiAnalysis, isLoading: isLoadingAnalysis } = useQuery({
    queryKey: ["/api/maintenance/devices", deviceForAnalysis?.id, "health/analysis"],
    queryFn: async () => {
      if (!deviceForAnalysis?.id) return null;
      const res = await apiRequest("GET", `/api/maintenance/devices/${deviceForAnalysis.id}/health/analysis`);
      return await res.json();
    },
    enabled: !!deviceForAnalysis && analyzeDialogOpen,
  });

  // Calculate health score mutation
  const calculateHealthMutation = useMutation({
    mutationFn: async (deviceId: number) => {
      const selectedDevice = devices?.find((d: Device) => d.id === deviceId);
      if (!selectedDevice) throw new Error("Device not found");
      
      const res = await apiRequest("POST", `/api/maintenance/devices/${deviceId}/health/calculate`, {
        deviceType: selectedDevice.type
      });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Health score calculated",
        description: "Device health score has been updated",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance/devices"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to calculate health score",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Acknowledge alert mutation
  const acknowledgeAlertMutation = useMutation({
    mutationFn: async (alertId: number) => {
      const res = await apiRequest("POST", "/api/maintenance/alerts/acknowledge", {
        alertId,
      });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Alert acknowledged",
        description: "Maintenance alert has been acknowledged",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance/alerts"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to acknowledge alert",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Resolve issue mutation
  const resolveIssueMutation = useMutation({
    mutationFn: async (data: ResolveIssueFormData) => {
      const res = await apiRequest("POST", "/api/maintenance/issues/resolve", data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Issue resolved",
        description: "Maintenance issue has been marked as resolved",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance/issues"] });
      setResolveDialogOpen(false);
      resetResolveForm();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to resolve issue",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Create maintenance schedule mutation
  const createScheduleMutation = useMutation({
    mutationFn: async () => {
      if (!selectedDeviceId || !scheduleTitle || !scheduleFrequency || !scheduleStartDate) {
        throw new Error("Missing required fields");
      }
      
      const res = await apiRequest("POST", `/api/maintenance/devices/${selectedDeviceId}/schedules`, {
        title: scheduleTitle,
        description: scheduleDescription,
        frequency: scheduleFrequency,
        startDate: scheduleStartDate,
      });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Schedule created",
        description: "Maintenance schedule has been created successfully",
      });
      setCreateScheduleDialogOpen(false);
      resetScheduleForm();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create schedule",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Generate alerts mutation
  const generateAlertsMutation = useMutation({
    mutationFn: async (deviceId: number) => {
      const res = await apiRequest("POST", `/api/maintenance/devices/${deviceId}/alerts/generate`);
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: `${data.length} alerts generated`,
        description: "Predictive maintenance alerts have been generated",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance/alerts"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to generate alerts",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Handle site change
  const handleSiteChange = (siteId: string) => {
    setSelectedSiteId(siteId ? parseInt(siteId) : null);
    setSelectedDeviceId(null);
  };

  // Handle device change
  const handleDeviceChange = (deviceId: string) => {
    setSelectedDeviceId(deviceId ? parseInt(deviceId) : null);
  };

  // Handle resolving an issue
  const handleResolveIssue = (issueId: number) => {
    setSelectedIssueId(issueId);
    setResolveDialogOpen(true);
  };

  // Handle submit resolve form
  const handleResolveSubmit = () => {
    if (!selectedIssueId || !resolution) {
      toast({
        title: "Missing information",
        description: "Please provide a resolution",
        variant: "destructive",
      });
      return;
    }

    resolveIssueMutation.mutate({
      issueId: selectedIssueId,
      resolution,
      notes,
      maintenanceCost: maintenanceCost ? parseFloat(maintenanceCost) : undefined,
    });
  };

  // Handle analyze device
  const handleAnalyzeDevice = (deviceId: number) => {
    const device = devices?.find((d: Device) => d.id === deviceId);
    if (device) {
      setDeviceForAnalysis(device);
      setAnalyzeDialogOpen(true);
    }
  };

  // Reset the resolve form
  const resetResolveForm = () => {
    setSelectedIssueId(null);
    setResolution("");
    setNotes("");
    setMaintenanceCost("");
  };

  // Reset the schedule form
  const resetScheduleForm = () => {
    setScheduleTitle("");
    setScheduleDescription("");
    setScheduleFrequency("monthly");
    setScheduleStartDate(new Date());
  };

  // Get the selected device
  const selectedDevice = devices?.find((d: Device) => d.id === selectedDeviceId);

  // Filter battery and solar devices for the health dashboard
  const energyStorageDevices = devices?.filter((d: Device) => 
    d.type === "battery_storage" || d.type === "solar_pv"
  );

  return (
    <div className="w-full p-6 pt-3">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Predictive Maintenance</h1>
        
        <div className="flex gap-4">
          <Select value={selectedSiteId?.toString()} onValueChange={handleSiteChange}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All Sites" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Sites</SelectItem>
              {sites?.map((site: any) => (
                <SelectItem key={site.id} value={site.id.toString()}>
                  {site.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={selectedDeviceId?.toString()} onValueChange={handleDeviceChange}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All Devices" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Devices</SelectItem>
              {devices?.map((device: Device) => (
                <SelectItem key={device.id} value={device.id.toString()}>
                  {device.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="issues">Maintenance Issues</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
          <TabsTrigger value="metrics">Health Metrics</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-medium">Device Health</h2>
            {selectedDeviceId && (
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => calculateHealthMutation.mutate(selectedDeviceId)}
                  disabled={calculateHealthMutation.isPending}
                >
                  Calculate Health Score
                </Button>
                <Button
                  onClick={() => setCreateScheduleDialogOpen(true)}
                >
                  Schedule Maintenance
                </Button>
              </div>
            )}
          </div>
          
          {isLoadingDevices ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((n) => (
                <Card key={n}>
                  <CardContent className="p-6">
                    <div className="animate-pulse space-y-4">
                      <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                      <div className="h-4 bg-slate-200 rounded w-full"></div>
                      <div className="h-4 bg-slate-200 rounded w-5/6"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : energyStorageDevices?.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-muted-foreground">No battery or solar devices found for predictive maintenance.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {energyStorageDevices?.map((device: any) => {
                // For the overview, we need to fetch health data for each device
                const deviceHealthData = deviceHealth && selectedDeviceId === device.id
                  ? deviceHealth
                  : { overallHealthScore: 75, healthStatus: 'fair' }; // Default values

                return (
                  <DeviceHealthCard
                    key={device.id}
                    deviceId={device.id}
                    deviceName={device.name}
                    deviceType={device.type}
                    healthScore={deviceHealthData.overallHealthScore || 0}
                    healthStatus={deviceHealthData.healthStatus || 'unknown'}
                    lastUpdated={deviceHealthData.timestamp ? new Date(deviceHealthData.timestamp) : undefined}
                    remainingLife={deviceHealthData.remainingUsefulLife}
                    anomalyDetected={deviceHealthData.anomalyDetected}
                    onAnalyze={() => handleAnalyzeDevice(device.id)}
                    onViewDetails={() => {
                      setSelectedDeviceId(device.id);
                      setSelectedTab('metrics');
                    }}
                  />
                );
              })}
            </div>
          )}
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-medium">Recent Alerts</h2>
                {selectedDeviceId && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => generateAlertsMutation.mutate(selectedDeviceId)}
                    disabled={generateAlertsMutation.isPending}
                  >
                    Generate Alerts
                  </Button>
                )}
              </div>
              <MaintenanceAlertsList
                alerts={(maintenanceAlerts || []).slice(0, 3)}
                onAcknowledge={(alertId) => acknowledgeAlertMutation.mutate(alertId)}
                onView={(alertId) => setSelectedTab('alerts')}
              />
            </div>
            
            <div>
              <h2 className="text-xl font-medium mb-4">Maintenance Issues</h2>
              <MaintenanceIssueList
                issues={(maintenanceIssues || []).slice(0, 3)}
                onViewIssue={(issueId) => setSelectedTab('issues')}
                onResolveIssue={handleResolveIssue}
              />
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="issues">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-medium">Maintenance Issues</h2>
          </div>
          
          {isLoadingIssues ? (
            <div className="animate-pulse space-y-4">
              {[1, 2, 3].map((n) => (
                <Card key={n}>
                  <CardContent className="p-6">
                    <div className="h-4 bg-slate-200 rounded w-3/4 mb-2"></div>
                    <div className="h-4 bg-slate-200 rounded w-full mb-2"></div>
                    <div className="h-4 bg-slate-200 rounded w-5/6"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <MaintenanceIssueList
              issues={maintenanceIssues || []}
              onViewIssue={(issueId) => {
                // Implement view details modal
                console.log("View issue", issueId);
              }}
              onResolveIssue={handleResolveIssue}
            />
          )}
        </TabsContent>
        
        <TabsContent value="alerts">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-medium">Maintenance Alerts</h2>
            {selectedDeviceId && (
              <Button 
                onClick={() => generateAlertsMutation.mutate(selectedDeviceId)}
                disabled={generateAlertsMutation.isPending}
              >
                Generate New Alerts
              </Button>
            )}
          </div>
          
          {isLoadingAlerts ? (
            <div className="animate-pulse space-y-4">
              {[1, 2, 3].map((n) => (
                <Card key={n}>
                  <CardContent className="p-6">
                    <div className="h-4 bg-slate-200 rounded w-3/4 mb-2"></div>
                    <div className="h-4 bg-slate-200 rounded w-full mb-2"></div>
                    <div className="h-4 bg-slate-200 rounded w-5/6"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <MaintenanceAlertsList
              alerts={maintenanceAlerts || []}
              onAcknowledge={(alertId) => acknowledgeAlertMutation.mutate(alertId)}
              onView={(alertId) => {
                // Implement view details modal
                console.log("View alert", alertId);
              }}
            />
          )}
        </TabsContent>
        
        <TabsContent value="metrics">
          {!selectedDeviceId ? (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-muted-foreground">Please select a device to view health metrics.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-medium">
                  {selectedDevice?.name} Health Metrics
                </h2>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => calculateHealthMutation.mutate(selectedDeviceId)}
                    disabled={calculateHealthMutation.isPending}
                  >
                    Recalculate Health
                  </Button>
                  <Button
                    onClick={() => handleAnalyzeDevice(selectedDeviceId)}
                  >
                    AI Analysis
                  </Button>
                </div>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <DeviceHealthMetricsChart
                    deviceType={selectedDevice?.type || 'battery_storage'}
                    metricsHistory={healthHistory || []}
                    isLoading={isLoadingHealthHistory}
                  />
                </div>
                
                <div>
                  <Card>
                    <CardHeader>
                      <CardTitle>Current Health Status</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {isLoadingHealth ? (
                        <div className="animate-pulse space-y-3">
                          <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                          <div className="h-4 bg-slate-200 rounded w-full"></div>
                          <div className="h-4 bg-slate-200 rounded w-5/6"></div>
                        </div>
                      ) : !deviceHealth ? (
                        <p className="text-muted-foreground">No health data available.</p>
                      ) : (
                        <div className="space-y-4">
                          <div>
                            <p className="text-sm text-muted-foreground">Health Score</p>
                            <p className="text-2xl font-bold">{deviceHealth.overallHealthScore || 0}%</p>
                          </div>
                          
                          <div>
                            <p className="text-sm text-muted-foreground">Status</p>
                            <p className="text-lg font-medium capitalize">
                              {deviceHealth.healthStatus || 'Unknown'}
                            </p>
                          </div>
                          
                          {deviceHealth.remainingUsefulLife !== undefined && (
                            <div>
                              <p className="text-sm text-muted-foreground">Remaining Useful Life</p>
                              <p className="text-lg font-medium">
                                {deviceHealth.remainingUsefulLife > 365
                                  ? `${Math.round(deviceHealth.remainingUsefulLife / 365)} years`
                                  : `${deviceHealth.remainingUsefulLife} days`}
                              </p>
                            </div>
                          )}
                          
                          {deviceHealth.failureProbability !== undefined && (
                            <div>
                              <p className="text-sm text-muted-foreground">Failure Probability</p>
                              <p className="text-lg font-medium">
                                {deviceHealth.failureProbability}%
                              </p>
                            </div>
                          )}
                          
                          {selectedDevice?.type === 'battery_storage' && deviceHealth.cycleCount !== undefined && (
                            <div>
                              <p className="text-sm text-muted-foreground">Battery Cycles</p>
                              <p className="text-lg font-medium">
                                {deviceHealth.cycleCount}
                              </p>
                            </div>
                          )}
                          
                          {selectedDevice?.type === 'solar_pv' && deviceHealth.efficiencyRatio !== undefined && (
                            <div>
                              <p className="text-sm text-muted-foreground">Efficiency Ratio</p>
                              <p className="text-lg font-medium">
                                {Math.round(deviceHealth.efficiencyRatio * 100)}%
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
      
      {/* Resolve Issue Dialog */}
      <Dialog open={resolveDialogOpen} onOpenChange={setResolveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolve Maintenance Issue</DialogTitle>
            <DialogDescription>
              Enter the resolution details for this maintenance issue.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="resolution">Resolution *</Label>
              <Textarea
                id="resolution"
                placeholder="Describe how the issue was resolved"
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="notes">Additional Notes</Label>
              <Textarea
                id="notes"
                placeholder="Any additional notes about the resolution"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="cost">Maintenance Cost</Label>
              <Input
                id="cost"
                type="number"
                placeholder="Enter cost (optional)"
                value={maintenanceCost}
                onChange={(e) => setMaintenanceCost(e.target.value)}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolveDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleResolveSubmit}
              disabled={!resolution || resolveIssueMutation.isPending}
            >
              {resolveIssueMutation.isPending ? "Resolving..." : "Resolve Issue"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* AI Analysis Dialog */}
      <Dialog open={analyzeDialogOpen} onOpenChange={setAnalyzeDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>AI Health Analysis</DialogTitle>
            <DialogDescription>
              Advanced AI analysis of device health and performance.
            </DialogDescription>
          </DialogHeader>
          
          {deviceForAnalysis && (
            <AIAnalysisCard
              deviceName={deviceForAnalysis.name}
              deviceType={deviceForAnalysis.type}
              result={aiAnalysis || {
                analysis: "",
                recommendations: [],
                potentialIssues: [],
              }}
              isLoading={isLoadingAnalysis}
            />
          )}
          
          <DialogFooter>
            <Button onClick={() => setAnalyzeDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Create Schedule Dialog */}
      <Dialog open={createScheduleDialogOpen} onOpenChange={setCreateScheduleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Maintenance Schedule</DialogTitle>
            <DialogDescription>
              Schedule regular maintenance for this device.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                placeholder="Maintenance title"
                value={scheduleTitle}
                onChange={(e) => setScheduleTitle(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Description of maintenance tasks"
                value={scheduleDescription}
                onChange={(e) => setScheduleDescription(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="frequency">Frequency *</Label>
              <Select value={scheduleFrequency} onValueChange={setScheduleFrequency}>
                <SelectTrigger id="frequency">
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="bi-annual">Bi-Annual</SelectItem>
                  <SelectItem value="annual">Annual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date *</Label>
              <div className="flex w-full max-w-sm items-center space-x-2">
                <Calendar className="h-4 w-4 opacity-50" />
                <DatePicker
                  date={scheduleStartDate}
                  setDate={setScheduleStartDate}
                />
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateScheduleDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => createScheduleMutation.mutate()}
              disabled={!scheduleTitle || !scheduleFrequency || !scheduleStartDate || createScheduleMutation.isPending}
            >
              {createScheduleMutation.isPending ? "Creating..." : "Create Schedule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PredictiveMaintenancePage;