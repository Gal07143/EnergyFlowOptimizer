import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSiteContext } from '@/hooks/use-site-context';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import {
  Bell,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Filter,
  MoreHorizontal,
  RefreshCw,
  Clock,
  BarChart2,
  PanelLeft,
  CalendarClock,
  Zap
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";

// Define interface for alarm data
interface AlarmData {
  id: string;
  deviceId: string;
  deviceName: string;
  deviceType: string;
  alarmType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: string;
  status: 'active' | 'acknowledged' | 'resolved';
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  resolvedBy?: string;
  resolvedAt?: string;
  source: string;
  metricName?: string;
  metricValue?: number;
  thresholdValue?: number;
}

// Define interface for alarm statistics
interface AlarmStats {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  active: number;
  acknowledged: number;
  resolved: number;
  byDevice: {
    deviceId: string;
    deviceName: string;
    count: number;
  }[];
  byType: {
    type: string;
    count: number;
  }[];
}

const AlarmsPage: React.FC = () => {
  const { toast } = useToast();
  const { currentSiteId } = useSiteContext();
  const [activeTab, setActiveTab] = useState<string>('current');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [deviceFilter, setDeviceFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedAlarm, setSelectedAlarm] = useState<AlarmData | null>(null);
  
  // Fetch alarms
  const { data: alarms, isLoading: isLoadingAlarms, refetch: refetchAlarms } = useQuery({
    queryKey: ['/api/alarms', currentSiteId, activeTab],
    queryFn: async () => {
      if (!currentSiteId) return [];
      
      const endpoint = activeTab === 'current' 
        ? `/api/sites/${currentSiteId}/alarms/current` 
        : `/api/sites/${currentSiteId}/alarms/history`;
      
      const res = await fetch(endpoint);
      if (!res.ok) throw new Error('Failed to fetch alarms');
      
      return res.json() as Promise<AlarmData[]>;
    },
    enabled: !!currentSiteId,
  });
  
  // Fetch alarm statistics
  const { data: alarmStats, isLoading: isLoadingStats } = useQuery({
    queryKey: ['/api/alarms/stats', currentSiteId],
    queryFn: async () => {
      if (!currentSiteId) return null;
      
      const res = await fetch(`/api/sites/${currentSiteId}/alarms/stats`);
      if (!res.ok) throw new Error('Failed to fetch alarm statistics');
      
      return res.json() as Promise<AlarmStats>;
    },
    enabled: !!currentSiteId,
  });
  
  // Filter alarms based on user selection
  const filteredAlarms = React.useMemo(() => {
    if (!alarms) return [];
    
    return alarms.filter(alarm => {
      // Apply status filter
      if (statusFilter !== 'all' && alarm.status !== statusFilter) {
        return false;
      }
      
      // Apply severity filter
      if (severityFilter !== 'all' && alarm.severity !== severityFilter) {
        return false;
      }
      
      // Apply device filter
      if (deviceFilter !== 'all' && alarm.deviceId !== deviceFilter) {
        return false;
      }
      
      // Apply search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          alarm.deviceName.toLowerCase().includes(query) ||
          alarm.message.toLowerCase().includes(query) ||
          alarm.alarmType.toLowerCase().includes(query) ||
          alarm.source.toLowerCase().includes(query)
        );
      }
      
      return true;
    });
  }, [alarms, statusFilter, severityFilter, deviceFilter, searchQuery]);
  
  // Handle alarm acknowledgement
  const handleAcknowledgeAlarm = async (alarmId: string) => {
    try {
      const res = await fetch(`/api/alarms/${alarmId}/acknowledge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!res.ok) {
        throw new Error('Failed to acknowledge alarm');
      }
      
      toast({
        title: 'Alarm Acknowledged',
        description: 'The alarm has been successfully acknowledged.',
      });
      
      refetchAlarms();
    } catch (error) {
      console.error('Error acknowledging alarm:', error);
      toast({
        title: 'Failed to Acknowledge',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    }
  };
  
  // Handle alarm resolution
  const handleResolveAlarm = async (alarmId: string) => {
    try {
      const res = await fetch(`/api/alarms/${alarmId}/resolve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!res.ok) {
        throw new Error('Failed to resolve alarm');
      }
      
      toast({
        title: 'Alarm Resolved',
        description: 'The alarm has been successfully resolved.',
      });
      
      refetchAlarms();
    } catch (error) {
      console.error('Error resolving alarm:', error);
      toast({
        title: 'Failed to Resolve',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    }
  };

  // Function to render severity badge
  const renderSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
        return (
          <Badge variant="destructive" className="flex gap-1 items-center">
            <AlertCircle className="h-3 w-3" />
            Critical
          </Badge>
        );
      case 'high':
        return (
          <Badge variant="destructive" className="flex gap-1 items-center bg-orange-600">
            <AlertTriangle className="h-3 w-3" />
            High
          </Badge>
        );
      case 'medium':
        return (
          <Badge variant="outline" className="flex gap-1 items-center bg-amber-100 text-amber-700 border-amber-200">
            <AlertTriangle className="h-3 w-3" />
            Medium
          </Badge>
        );
      case 'low':
        return (
          <Badge variant="outline" className="flex gap-1 items-center bg-blue-100 text-blue-700 border-blue-200">
            <Bell className="h-3 w-3" />
            Low
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            {severity}
          </Badge>
        );
    }
  };
  
  // Function to render status badge
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <Badge variant="outline" className="flex gap-1 items-center bg-red-100 text-red-700 border-red-200">
            <Zap className="h-3 w-3" />
            Active
          </Badge>
        );
      case 'acknowledged':
        return (
          <Badge variant="outline" className="flex gap-1 items-center bg-blue-100 text-blue-700 border-blue-200">
            <Clock className="h-3 w-3" />
            Acknowledged
          </Badge>
        );
      case 'resolved':
        return (
          <Badge variant="outline" className="flex gap-1 items-center bg-green-100 text-green-700 border-green-200">
            <CheckCircle2 className="h-3 w-3" />
            Resolved
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            {status}
          </Badge>
        );
    }
  };
  
  // Function to format timestamp
  const formatTimestamp = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM d, yyyy h:mm a');
    } catch (e) {
      return dateString;
    }
  };
  
  // Handle alarm selection for detail view
  const handleSelectAlarm = (alarm: AlarmData) => {
    setSelectedAlarm(alarm);
  };
  
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Alarms & Alerts</h1>
          <p className="text-muted-foreground">
            Monitor and manage system alarms and alerts
          </p>
        </div>
        <Button onClick={() => refetchAlarms()} variant="outline" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>
      
      {/* Alarm Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Alarms</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingStats ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <div className="text-2xl font-bold">{alarmStats?.total || 0}</div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Alarms</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingStats ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <div className="flex items-center">
                <div className="text-2xl font-bold">{alarmStats?.active || 0}</div>
                {(alarmStats?.active || 0) > 0 && (
                  <Badge variant="destructive" className="ml-2">
                    {(alarmStats?.active || 0) > 1 ? `${alarmStats?.active} Issues` : '1 Issue'}
                  </Badge>
                )}
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Critical</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingStats ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <div className="flex items-center">
                <div className="text-2xl font-bold">{alarmStats?.critical || 0}</div>
                {(alarmStats?.critical || 0) > 0 && (
                  <div className="ml-2 w-4 h-4 rounded-full bg-red-500"></div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">High</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingStats ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <div className="flex items-center">
                <div className="text-2xl font-bold">{alarmStats?.high || 0}</div>
                {(alarmStats?.high || 0) > 0 && (
                  <div className="ml-2 w-4 h-4 rounded-full bg-orange-500"></div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingStats ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <div>Health Score</div>
                  <div className="font-medium">
                    {alarmStats?.critical || alarmStats?.high 
                      ? "Attention Required" 
                      : "Good"}
                  </div>
                </div>
                <Progress 
                  value={alarmStats?.critical || alarmStats?.high 
                    ? 60 - ((alarmStats?.critical || 0) * 20) - ((alarmStats?.high || 0) * 10)
                    : 90
                  } 
                  className={
                    alarmStats?.critical ? "bg-red-200" : 
                    alarmStats?.high ? "bg-orange-200" : 
                    "bg-green-200"
                  }
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      <Tabs defaultValue={activeTab} onValueChange={setActiveTab}>
        <div className="flex justify-between items-center">
          <TabsList>
            <TabsTrigger value="current" className="flex gap-2 items-center">
              <AlertTriangle className="h-4 w-4" />
              Current Alarms
            </TabsTrigger>
            <TabsTrigger value="history" className="flex gap-2 items-center">
              <CalendarClock className="h-4 w-4" />
              Alarm History
            </TabsTrigger>
            <TabsTrigger value="statistics" className="flex gap-2 items-center">
              <BarChart2 className="h-4 w-4" />
              Statistics
            </TabsTrigger>
          </TabsList>
          
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Filter className="h-4 w-4" />
                Filters
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Filter Alarms</SheetTitle>
                <SheetDescription>
                  Set filters to narrow down the alarm list
                </SheetDescription>
              </SheetHeader>
              <div className="py-4 space-y-4">
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Alarm Status</h3>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="acknowledged">Acknowledged</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Severity</h3>
                  <Select value={severityFilter} onValueChange={setSeverityFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select severity" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Severities</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Device</h3>
                  <Select value={deviceFilter} onValueChange={setDeviceFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select device" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Devices</SelectItem>
                      {alarms && Array.from(new Set(alarms.map(a => a.deviceId))).map(deviceId => {
                        const device = alarms.find(a => a.deviceId === deviceId);
                        return (
                          <SelectItem key={deviceId} value={deviceId}>
                            {device?.deviceName || deviceId}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex justify-end gap-2 pt-4">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setStatusFilter('all');
                      setSeverityFilter('all');
                      setDeviceFilter('all');
                    }}
                  >
                    Reset
                  </Button>
                  <Button>Apply Filters</Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
        
        <div className="flex items-center space-x-2 py-4">
          <Input
            placeholder="Search alarms..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-sm"
          />
        </div>
        
        <TabsContent value="current" className="space-y-4">
          {isLoadingAlarms ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, index) => (
                <Card key={index}>
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      <Skeleton className="h-5 w-[250px]" />
                      <Skeleton className="h-4 w-[400px]" />
                      <div className="flex gap-2 pt-1">
                        <Skeleton className="h-8 w-[80px]" />
                        <Skeleton className="h-8 w-[80px]" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredAlarms.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-10 text-center">
                <CheckCircle2 className="h-10 w-10 text-green-500 mb-2" />
                <h3 className="text-lg font-medium">No Active Alarms</h3>
                <p className="text-muted-foreground">All systems are operating normally</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {filteredAlarms.filter(alarm => alarm.status !== 'resolved').map((alarm) => (
                <Card key={alarm.id} className={
                  alarm.severity === 'critical' ? 'border-l-4 border-l-red-500' :
                  alarm.severity === 'high' ? 'border-l-4 border-l-orange-500' :
                  alarm.severity === 'medium' ? 'border-l-4 border-l-amber-500' :
                  'border-l-4 border-l-blue-500'
                }>
                  <CardContent className="p-4">
                    <div className="flex justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{alarm.deviceName}</h3>
                          <span className="text-xs text-muted-foreground">({alarm.deviceType})</span>
                        </div>
                        <p className="text-sm">{alarm.message}</p>
                        <div className="flex gap-2 pt-1">
                          {renderSeverityBadge(alarm.severity)}
                          {renderStatusBadge(alarm.status)}
                          <Badge variant="outline" className="flex gap-1 items-center">
                            <Clock className="h-3 w-3" />
                            {formatTimestamp(alarm.timestamp)}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleSelectAlarm(alarm)}
                        >
                          Details
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {alarm.status === 'active' && (
                              <DropdownMenuItem onClick={() => handleAcknowledgeAlarm(alarm.id)}>
                                Acknowledge
                              </DropdownMenuItem>
                            )}
                            {(alarm.status === 'active' || alarm.status === 'acknowledged') && (
                              <DropdownMenuItem onClick={() => handleResolveAlarm(alarm.id)}>
                                Resolve
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => handleSelectAlarm(alarm)}>
                              View Details
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="history" className="space-y-4">
          {isLoadingAlarms ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, index) => (
                <Card key={index}>
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      <Skeleton className="h-5 w-[250px]" />
                      <Skeleton className="h-4 w-[400px]" />
                      <div className="flex gap-2 pt-1">
                        <Skeleton className="h-8 w-[80px]" />
                        <Skeleton className="h-8 w-[80px]" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredAlarms.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-10 text-center">
                <CalendarClock className="h-10 w-10 text-muted-foreground mb-2" />
                <h3 className="text-lg font-medium">No Alarm History</h3>
                <p className="text-muted-foreground">There are no historical alarms that match your filters</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {filteredAlarms.map((alarm) => (
                <Card key={alarm.id}>
                  <CardContent className="p-4">
                    <div className="flex justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{alarm.deviceName}</h3>
                          <span className="text-xs text-muted-foreground">({alarm.deviceType})</span>
                        </div>
                        <p className="text-sm">{alarm.message}</p>
                        <div className="flex gap-2 pt-1">
                          {renderSeverityBadge(alarm.severity)}
                          {renderStatusBadge(alarm.status)}
                          <Badge variant="outline" className="flex gap-1 items-center">
                            <Clock className="h-3 w-3" />
                            {formatTimestamp(alarm.timestamp)}
                          </Badge>
                        </div>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleSelectAlarm(alarm)}
                      >
                        Details
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="statistics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Alarms by Device */}
            <Card>
              <CardHeader>
                <CardTitle>Alarms by Device</CardTitle>
                <CardDescription>
                  Distribution of alarms across devices
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingStats ? (
                  <div className="space-y-2">
                    {[...Array(4)].map((_, index) => (
                      <Skeleton key={index} className="h-4 w-full" />
                    ))}
                  </div>
                ) : !alarmStats?.byDevice?.length ? (
                  <div className="text-center py-6 text-muted-foreground">
                    No device alarm data available
                  </div>
                ) : (
                  <div className="space-y-4">
                    {alarmStats.byDevice.map((item) => (
                      <div key={item.deviceId} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>{item.deviceName}</span>
                          <span className="font-medium">{item.count}</span>
                        </div>
                        <Progress value={(item.count / alarmStats.total) * 100} className="h-2" />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Alarms by Type */}
            <Card>
              <CardHeader>
                <CardTitle>Alarms by Type</CardTitle>
                <CardDescription>
                  Distribution of alarms by type
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingStats ? (
                  <div className="space-y-2">
                    {[...Array(4)].map((_, index) => (
                      <Skeleton key={index} className="h-4 w-full" />
                    ))}
                  </div>
                ) : !alarmStats?.byType?.length ? (
                  <div className="text-center py-6 text-muted-foreground">
                    No alarm type data available
                  </div>
                ) : (
                  <div className="space-y-4">
                    {alarmStats.byType.map((item) => (
                      <div key={item.type} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>{item.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                          <span className="font-medium">{item.count}</span>
                        </div>
                        <Progress value={(item.count / alarmStats.total) * 100} className="h-2" />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Alarm Trends</CardTitle>
              <CardDescription>
                Historical trend of alarms over time
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
              {isLoadingStats ? (
                <Skeleton className="h-full w-full" />
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <p>Alarm trend data visualization will be displayed here</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Alarm Detail Sheet */}
      {selectedAlarm && (
        <Sheet
          open={!!selectedAlarm}
          onOpenChange={(open) => !open && setSelectedAlarm(null)}
        >
          <SheetContent className="sm:max-w-md">
            <SheetHeader>
              <SheetTitle>Alarm Details</SheetTitle>
              <SheetDescription>
                Detailed information about the selected alarm
              </SheetDescription>
            </SheetHeader>
            <div className="py-4 space-y-4">
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-muted-foreground">Device</h3>
                <p className="text-sm">{selectedAlarm.deviceName} ({selectedAlarm.deviceType})</p>
              </div>
              
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-muted-foreground">Alarm Type</h3>
                <p className="text-sm">{selectedAlarm.alarmType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</p>
              </div>
              
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-muted-foreground">Message</h3>
                <p className="text-sm">{selectedAlarm.message}</p>
              </div>
              
              <div className="flex gap-4">
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-muted-foreground">Severity</h3>
                  <div>{renderSeverityBadge(selectedAlarm.severity)}</div>
                </div>
                
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-muted-foreground">Status</h3>
                  <div>{renderStatusBadge(selectedAlarm.status)}</div>
                </div>
              </div>
              
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-muted-foreground">Detected At</h3>
                <p className="text-sm">{formatTimestamp(selectedAlarm.timestamp)}</p>
              </div>
              
              {selectedAlarm.metricName && (
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-muted-foreground">Metric Information</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Metric:</span> {selectedAlarm.metricName}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Value:</span> {selectedAlarm.metricValue}
                    </div>
                    {selectedAlarm.thresholdValue && (
                      <div>
                        <span className="text-muted-foreground">Threshold:</span> {selectedAlarm.thresholdValue}
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {selectedAlarm.acknowledgedBy && (
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-muted-foreground">Acknowledged</h3>
                  <p className="text-sm">By: {selectedAlarm.acknowledgedBy}</p>
                  <p className="text-sm">At: {formatTimestamp(selectedAlarm.acknowledgedAt || '')}</p>
                </div>
              )}
              
              {selectedAlarm.resolvedBy && (
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-muted-foreground">Resolved</h3>
                  <p className="text-sm">By: {selectedAlarm.resolvedBy}</p>
                  <p className="text-sm">At: {formatTimestamp(selectedAlarm.resolvedAt || '')}</p>
                </div>
              )}
              
              <Separator />
              
              <div className="flex justify-end gap-2">
                {selectedAlarm.status === 'active' && (
                  <Button onClick={() => handleAcknowledgeAlarm(selectedAlarm.id)}>
                    Acknowledge
                  </Button>
                )}
                
                {(selectedAlarm.status === 'active' || selectedAlarm.status === 'acknowledged') && (
                  <Button onClick={() => handleResolveAlarm(selectedAlarm.id)}>
                    Resolve
                  </Button>
                )}
              </div>
            </div>
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
};

export default AlarmsPage;