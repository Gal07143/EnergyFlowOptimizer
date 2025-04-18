import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Calendar, AlertTriangle, CheckCircle, XCircle, BarChart3, Clock, Landmark, ZapOff, Zap } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { queryClient } from "@/lib/queryClient";

// VPP program types from schema
type VPPProgramType = 'demand_response' | 'frequency_regulation' | 'capacity_market' | 'energy_market';
type VPPEventStatus = 'upcoming' | 'active' | 'completed' | 'cancelled';
type VPPParticipationMode = 'automatic' | 'manual' | 'opt_out';

// Program interface
interface VPPProgram {
  id: number;
  name: string;
  description: string;
  type: VPPProgramType;
  provider: string;
  incentiveRate: number;
  incentiveUnit: string;
  minCapacity: number;
  maxCapacity: number;
  startDate: string;
  endDate?: string;
  status: 'active' | 'inactive' | 'upcoming' | 'completed';
  maxEvents?: number;
  noticeTime: number; // Notice time in minutes
  participationRequirements?: string[];
  termsUrl?: string;
  createdAt: string;
  updatedAt: string;
  totalEvents?: number;
  enrolledSites?: number;
  totalEarned?: number;
}

// Event interface
interface VPPEvent {
  id: number;
  programId: number;
  name: string;
  description: string;
  startTime: string;
  endTime: string;
  notificationTime: string;
  requestedCapacity: number;
  status: VPPEventStatus;
  compensationRate?: number;
  compensationUnit?: string;
  createdAt: string;
  updatedAt: string;
  program?: VPPProgram;
  participationCount?: number;
}

// Enrollment interface
interface VPPEnrollment {
  id: number;
  programId: number;
  siteId: number;
  status: 'active' | 'pending' | 'suspended' | 'terminated';
  defaultParticipationMode: VPPParticipationMode;
  maxCapacity: number;
  autoAcceptEvents: boolean;
  startDate: string;
  endDate?: string;
  enrolledAt: string;
  updatedAt: string;
  program?: VPPProgram;
  siteName?: string;
  totalParticipations?: number;
  totalRevenue?: number;
}

// Participation interface
interface VPPParticipation {
  id: number;
  eventId: number;
  siteId: number;
  status: 'accepted' | 'rejected' | 'in_progress' | 'completed' | 'failed';
  mode: VPPParticipationMode;
  committedCapacity: number;
  actualCapacity?: number;
  responseTime?: string;
  startTime?: string;
  endTime?: string;
  earnings?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  event?: VPPEvent;
  siteName?: string;
}

// Metrics interface
interface VPPMetrics {
  id: number;
  participationId: number;
  timestamp: string; 
  metrics: {
    targetCapacity: number;
    actualCapacity: number;
    deviation: number;
    deviationPercentage: number;
    activeResources: number;
    totalResources: number;
    averageBatterySOC?: number;
    gridFrequency?: number;
    gridVoltage?: number;
    renewable?: number;
  };
  resourceMetrics: {
    resourceId: number;
    targetCapacity: number;
    actualCapacity: number;
    status: 'active' | 'inactive' | 'error';
    message?: string;
  }[];
  createdAt: string;
}

// Site interface (simplified)
interface Site {
  id: number;
  name: string;
}

const VPPPage = () => {
  const { toast } = useToast();
  const [selectedSiteId, setSelectedSiteId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

  // Fetch sites
  const { 
    data: sites, 
    isLoading: sitesLoading 
  } = useQuery<Site[]>({
    queryKey: ['/api/sites'],
  });

  // Set the first site as default when sites are loaded
  useEffect(() => {
    if (sites && sites.length > 0 && !selectedSiteId) {
      setSelectedSiteId(sites[0].id);
    }
  }, [sites, selectedSiteId]);

  // Fetch VPP enrollments for selected site
  const {
    data: enrollments,
    isLoading: enrollmentsLoading,
    isError: enrollmentsError,
  } = useQuery<VPPEnrollment[]>({
    queryKey: ['/api/vpp/sites', selectedSiteId, 'enrollments'],
    enabled: !!selectedSiteId,
  });

  // Fetch upcoming VPP events for selected site
  const {
    data: upcomingEvents,
    isLoading: upcomingEventsLoading,
    isError: upcomingEventsError,
  } = useQuery<VPPEvent[]>({
    queryKey: ['/api/vpp/sites', selectedSiteId, 'events'],
    enabled: !!selectedSiteId,
  });

  // Fetch participations for selected site
  const {
    data: participations,
    isLoading: participationsLoading,
    isError: participationsError,
  } = useQuery<VPPParticipation[]>({
    queryKey: ['/api/vpp/sites', selectedSiteId, 'participations'],
    enabled: !!selectedSiteId,
  });

  // Fetch all VPP programs
  const {
    data: allPrograms,
    isLoading: programsLoading,
    isError: programsError,
  } = useQuery<VPPProgram[]>({
    queryKey: ['/api/vpp/programs'],
  });

  // Handle enrollment toggle
  const handleAutoAcceptToggle = async (enrollmentId: number, currentValue: boolean) => {
    try {
      // Update enrollment auto-accept setting
      const response = await fetch(`/api/vpp/enrollments/${enrollmentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ autoAcceptEvents: !currentValue }),
      });

      if (!response.ok) {
        throw new Error("Failed to update enrollment settings");
      }

      // Invalidate enrollments query to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/vpp/sites', selectedSiteId, 'enrollments'] });

      toast({
        title: "Settings updated",
        description: `Auto-accept events has been ${!currentValue ? 'enabled' : 'disabled'}.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update enrollment settings. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle event response (accept/reject)
  const handleEventResponse = async (eventId: number, siteId: number, accept: boolean) => {
    try {
      const endpoint = accept 
        ? `/api/vpp/events/${eventId}/sites/${siteId}/accept`
        : `/api/vpp/events/${eventId}/sites/${siteId}/reject`;
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to ${accept ? 'accept' : 'reject'} event`);
      }

      // Invalidate relevant queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/vpp/sites', selectedSiteId, 'events'] });
      queryClient.invalidateQueries({ queryKey: ['/api/vpp/sites', selectedSiteId, 'participations'] });

      toast({
        title: accept ? "Event accepted" : "Event rejected",
        description: accept 
          ? "Your site will participate in this VPP event" 
          : "You have opted out of this VPP event",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to ${accept ? 'accept' : 'reject'} the event. Please try again.`,
        variant: "destructive",
      });
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  // Get status badge styling
  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'active':
        return <Badge className="bg-green-500">Active</Badge>;
      case 'upcoming':
        return <Badge className="bg-blue-500">Upcoming</Badge>;
      case 'completed':
        return <Badge className="bg-gray-500">Completed</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-500">Cancelled</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500">Pending</Badge>;
      case 'in_progress':
        return <Badge className="bg-purple-500">In Progress</Badge>;
      case 'failed':
        return <Badge className="bg-red-700">Failed</Badge>;
      case 'accepted':
        return <Badge className="bg-green-500">Accepted</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500">Rejected</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  // Get program type display
  const getProgramTypeDisplay = (type: VPPProgramType) => {
    switch(type) {
      case 'demand_response':
        return "Demand Response";
      case 'frequency_regulation':
        return "Frequency Regulation";
      case 'capacity_market':
        return "Capacity Market";
      case 'energy_market':
        return "Energy Market";
      default:
        return type;
    }
  };

  // Render loading state
  if (sitesLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto py-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Virtual Power Plant</h1>
            <p className="text-muted-foreground">
              Participate in grid services and earn incentives by joining VPP programs
            </p>
          </div>
          
          {/* Site selector */}
          {sites && sites.length > 0 && (
            <div className="flex items-center space-x-2">
              <Label htmlFor="site-select">Select Site:</Label>
              <select
                id="site-select"
                className="rounded-md border border-input bg-background px-3 py-2"
                value={selectedSiteId || ""}
                onChange={(e) => setSelectedSiteId(parseInt(e.target.value))}
              >
                {sites.map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Main content */}
        <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="programs">Programs</TabsTrigger>
            <TabsTrigger value="events">Events</TabsTrigger>
            <TabsTrigger value="history">Participation History</TabsTrigger>
          </TabsList>

          {/* Overview tab */}
          <TabsContent value="overview">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Enrollments summary card */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Enrollments</CardTitle>
                  <Landmark className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {enrollmentsLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      enrollments?.filter(e => e.status === 'active').length || 0
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {enrollments?.length 
                      ? `${enrollments.filter(e => e.status === 'active').length} of ${enrollments.length} programs`
                      : "No program enrollments"
                    }
                  </p>
                </CardContent>
              </Card>

              {/* Upcoming events card */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Upcoming Events</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {upcomingEventsLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      upcomingEvents?.filter(e => e.status === 'upcoming' || e.status === 'active').length || 0
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {upcomingEvents?.filter(e => e.status === 'active').length 
                      ? `${upcomingEvents?.filter(e => e.status === 'active').length} event(s) active now`
                      : "No active events currently"
                    }
                  </p>
                </CardContent>
              </Card>

              {/* Earnings card */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {participationsLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      `$${
                        participations
                          ?.filter(p => p.earnings)
                          .reduce((sum, p) => sum + (p.earnings || 0), 0)
                          .toFixed(2)
                      }`
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {participations?.filter(p => p.status === 'completed').length || 0} completed participations
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Active events */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Active & Upcoming Events</CardTitle>
                <CardDescription>
                  Respond to VPP events or manage your automatic participation
                </CardDescription>
              </CardHeader>
              <CardContent>
                {upcomingEventsLoading ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : upcomingEvents && upcomingEvents.filter(e => e.status === 'upcoming' || e.status === 'active').length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Event</TableHead>
                        <TableHead>Program</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Start Time</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Capacity</TableHead>
                        <TableHead>Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {upcomingEvents
                        .filter(e => e.status === 'upcoming' || e.status === 'active')
                        .map((event) => {
                          // Find if there's already a participation for this event
                          const participation = participations?.find(p => p.eventId === event.id);
                          
                          // Calculate duration in hours
                          const startTime = new Date(event.startTime);
                          const endTime = new Date(event.endTime);
                          const durationHours = ((endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60)).toFixed(1);
                          
                          return (
                            <TableRow key={event.id}>
                              <TableCell className="font-medium">{event.name}</TableCell>
                              <TableCell>{event.program?.name || `Program ${event.programId}`}</TableCell>
                              <TableCell>{getStatusBadge(event.status)}</TableCell>
                              <TableCell>{formatDate(event.startTime)}</TableCell>
                              <TableCell>{durationHours} hours</TableCell>
                              <TableCell>{event.requestedCapacity} kW</TableCell>
                              <TableCell>
                                {participation ? (
                                  <div className="flex items-center">
                                    {participation.status === 'accepted' ? (
                                      <Badge className="bg-green-500">Accepted</Badge>
                                    ) : participation.status === 'rejected' ? (
                                      <Badge className="bg-red-500">Rejected</Badge>
                                    ) : (
                                      <Badge className="bg-purple-500">{participation.status.replace('_', ' ')}</Badge>
                                    )}
                                  </div>
                                ) : (
                                  <div className="flex space-x-2">
                                    <Button
                                      size="sm"
                                      variant="default"
                                      onClick={() => handleEventResponse(event.id, selectedSiteId!, true)}
                                    >
                                      <CheckCircle className="h-4 w-4 mr-1" /> Accept
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleEventResponse(event.id, selectedSiteId!, false)}
                                    >
                                      <XCircle className="h-4 w-4 mr-1" /> Reject
                                    </Button>
                                  </div>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="py-8 text-center">
                    <Clock className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">No active or upcoming events</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Programs tab */}
          <TabsContent value="programs">
            <Card>
              <CardHeader>
                <CardTitle>VPP Programs & Enrollments</CardTitle>
                <CardDescription>Manage your VPP program enrollments and settings</CardDescription>
              </CardHeader>
              <CardContent>
                {enrollmentsLoading ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : enrollments && enrollments.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Program</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Start Date</TableHead>
                        <TableHead>Auto-Accept</TableHead>
                        <TableHead>Max Capacity</TableHead>
                        <TableHead>Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {enrollments.map((enrollment) => (
                        <TableRow key={enrollment.id}>
                          <TableCell className="font-medium">
                            {enrollment.program?.name || `Program ${enrollment.programId}`}
                          </TableCell>
                          <TableCell>
                            {enrollment.program 
                              ? getProgramTypeDisplay(enrollment.program.type) 
                              : "Unknown"
                            }
                          </TableCell>
                          <TableCell>{getStatusBadge(enrollment.status)}</TableCell>
                          <TableCell>{formatDate(enrollment.startDate)}</TableCell>
                          <TableCell>
                            <Switch
                              checked={enrollment.autoAcceptEvents}
                              onCheckedChange={() => 
                                handleAutoAcceptToggle(enrollment.id, enrollment.autoAcceptEvents)
                              }
                              id={`auto-accept-${enrollment.id}`}
                            />
                          </TableCell>
                          <TableCell>{enrollment.maxCapacity} kW</TableCell>
                          <TableCell>
                            <Button variant="outline" size="sm">
                              Details
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="py-8 text-center">
                    <Landmark className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">No program enrollments found</p>
                    <Button className="mt-4">Explore Programs</Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Available programs */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Available Programs</CardTitle>
                <CardDescription>Explore and join new VPP programs</CardDescription>
              </CardHeader>
              <CardContent>
                {programsLoading ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : allPrograms && allPrograms.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Program</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Provider</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Incentive</TableHead>
                        <TableHead>Required Capacity</TableHead>
                        <TableHead>Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allPrograms
                        .filter(program => !enrollments?.some(e => e.programId === program.id))
                        .map((program) => (
                          <TableRow key={program.id}>
                            <TableCell className="font-medium">{program.name}</TableCell>
                            <TableCell>{getProgramTypeDisplay(program.type)}</TableCell>
                            <TableCell>{program.provider}</TableCell>
                            <TableCell>{getStatusBadge(program.status)}</TableCell>
                            <TableCell>
                              {program.incentiveRate} {program.incentiveUnit}/kWh
                            </TableCell>
                            <TableCell>
                              {program.minCapacity} - {program.maxCapacity} kW
                            </TableCell>
                            <TableCell>
                              <Button 
                                variant="outline" 
                                size="sm"
                                disabled={program.status !== 'active'}
                              >
                                Enroll
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="py-8 text-center">
                    <AlertTriangle className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">No available programs found</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Events tab */}
          <TabsContent value="events">
            <Card>
              <CardHeader>
                <CardTitle>VPP Events</CardTitle>
                <CardDescription>View upcoming, active, and past VPP events</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="upcoming">
                  <TabsList className="mb-4">
                    <TabsTrigger value="upcoming">Upcoming & Active</TabsTrigger>
                    <TabsTrigger value="past">Past Events</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="upcoming">
                    {upcomingEventsLoading ? (
                      <div className="flex justify-center py-4">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      </div>
                    ) : upcomingEvents && upcomingEvents.filter(e => e.status === 'upcoming' || e.status === 'active').length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Event</TableHead>
                            <TableHead>Program</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Start Time</TableHead>
                            <TableHead>End Time</TableHead>
                            <TableHead>Capacity</TableHead>
                            <TableHead>Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {upcomingEvents
                            .filter(e => e.status === 'upcoming' || e.status === 'active')
                            .map((event) => (
                              <TableRow key={event.id}>
                                <TableCell className="font-medium">{event.name}</TableCell>
                                <TableCell>{event.program?.name || `Program ${event.programId}`}</TableCell>
                                <TableCell>{getStatusBadge(event.status)}</TableCell>
                                <TableCell>{formatDate(event.startTime)}</TableCell>
                                <TableCell>{formatDate(event.endTime)}</TableCell>
                                <TableCell>{event.requestedCapacity} kW</TableCell>
                                <TableCell>
                                  <Button variant="outline" size="sm">Details</Button>
                                </TableCell>
                              </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="py-8 text-center">
                        <Clock className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                        <p className="text-muted-foreground">No upcoming events found</p>
                      </div>
                    )}
                  </TabsContent>
                  
                  <TabsContent value="past">
                    {upcomingEventsLoading ? (
                      <div className="flex justify-center py-4">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      </div>
                    ) : upcomingEvents && upcomingEvents.filter(e => e.status === 'completed' || e.status === 'cancelled').length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Event</TableHead>
                            <TableHead>Program</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Start Time</TableHead>
                            <TableHead>End Time</TableHead>
                            <TableHead>Capacity</TableHead>
                            <TableHead>Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {upcomingEvents
                            .filter(e => e.status === 'completed' || e.status === 'cancelled')
                            .map((event) => (
                              <TableRow key={event.id}>
                                <TableCell className="font-medium">{event.name}</TableCell>
                                <TableCell>{event.program?.name || `Program ${event.programId}`}</TableCell>
                                <TableCell>{getStatusBadge(event.status)}</TableCell>
                                <TableCell>{formatDate(event.startTime)}</TableCell>
                                <TableCell>{formatDate(event.endTime)}</TableCell>
                                <TableCell>{event.requestedCapacity} kW</TableCell>
                                <TableCell>
                                  <Button variant="outline" size="sm">Details</Button>
                                </TableCell>
                              </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="py-8 text-center">
                        <Clock className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                        <p className="text-muted-foreground">No past events found</p>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Participation history tab */}
          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>Participation History</CardTitle>
                <CardDescription>Review your past VPP event participations and earnings</CardDescription>
              </CardHeader>
              <CardContent>
                {participationsLoading ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : participations && participations.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Event</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Mode</TableHead>
                        <TableHead>Committed</TableHead>
                        <TableHead>Actual</TableHead>
                        <TableHead>Earnings</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {participations.map((participation) => (
                        <TableRow key={participation.id}>
                          <TableCell className="font-medium">
                            {participation.event?.name || `Event ${participation.eventId}`}
                          </TableCell>
                          <TableCell>
                            {participation.startTime 
                              ? formatDate(participation.startTime)
                              : "Not started"
                            }
                          </TableCell>
                          <TableCell>{getStatusBadge(participation.status)}</TableCell>
                          <TableCell>
                            {participation.mode === 'automatic' 
                              ? "Automatic" 
                              : participation.mode === 'manual'
                                ? "Manual"
                                : "Opt Out"
                            }
                          </TableCell>
                          <TableCell>{participation.committedCapacity} kW</TableCell>
                          <TableCell>
                            {participation.actualCapacity 
                              ? `${participation.actualCapacity} kW` 
                              : "N/A"
                            }
                          </TableCell>
                          <TableCell>
                            {participation.earnings 
                              ? `$${participation.earnings.toFixed(2)}` 
                              : "N/A"
                            }
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="py-8 text-center">
                    <BarChart3 className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">No participation history found</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default VPPPage;