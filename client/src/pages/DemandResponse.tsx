import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, Clock, Zap, Info, Bell, Settings, History, AlertTriangle } from 'lucide-react';
import { useSiteContext } from '@/hooks/use-site-context';
import { format } from 'date-fns';

export default function DemandResponse() {
  const { currentSiteId } = useSiteContext();
  const [activeTab, setActiveTab] = useState('programs');

  // Fetch demand response programs
  const { data: programs = [], isLoading: programsLoading } = useQuery({
    queryKey: [`/api/sites/${currentSiteId}/demand-response/programs`],
    enabled: !!currentSiteId,
  });

  // Fetch demand response events
  const { data: events = [], isLoading: eventsLoading } = useQuery({
    queryKey: [`/api/sites/${currentSiteId}/demand-response/events`],
    enabled: !!currentSiteId,
  });

  // Fetch site demand response settings
  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: [`/api/sites/${currentSiteId}/demand-response/settings`],
    enabled: !!currentSiteId,
  });

  // Fetch site event participations
  const { data: participations = [], isLoading: participationsLoading } = useQuery({
    queryKey: [`/api/sites/${currentSiteId}/demand-response/participations`],
    enabled: !!currentSiteId,
  });

  const isLoading = programsLoading || eventsLoading || settingsLoading || participationsLoading;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-500';
      case 'pending': return 'bg-yellow-500';
      case 'active': return 'bg-green-500';
      case 'completed': return 'bg-gray-500';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getParticipationStatusColor = (status: string) => {
    switch (status) {
      case 'opt_in': return 'bg-green-500';
      case 'opt_out': return 'bg-red-500';
      case 'automatic': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Demand Response Management</h1>
        <Button>
          <Bell className="mr-2 h-4 w-4" />
          Notify Me
        </Button>
      </div>

      <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="programs">Programs</TabsTrigger>
          <TabsTrigger value="events">Events</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="programs" className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {isLoading ? (
              <p>Loading programs...</p>
            ) : programs.length > 0 ? (
              programs.map((program: any) => (
                <Card key={program.id} className="overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
                    <div className="flex justify-between items-center">
                      <CardTitle>{program.name}</CardTitle>
                      <Badge className={program.isActive ? "bg-green-500" : "bg-gray-500"}>
                        {program.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <CardDescription className="text-gray-100">
                      Provider: {program.provider}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="flex flex-col">
                        <span className="text-sm text-gray-500">Program Type</span>
                        <span className="font-medium">{program.programType.replace(/_/g, ' ')}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm text-gray-500">Incentive Rate</span>
                        <span className="font-medium">${program.incentiveRate}/kW</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm text-gray-500">Duration</span>
                        <span className="font-medium">
                          {program.startDate && program.endDate
                            ? `${format(new Date(program.startDate), 'MMM d, yyyy')} - ${format(new Date(program.endDate), 'MMM d, yyyy')}`
                            : 'Ongoing'}
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm text-gray-500">Notification Lead Time</span>
                        <span className="font-medium">{program.notificationLeadTime} minutes</span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mb-4">{program.description}</p>
                    <div className="flex justify-between items-center">
                      <Button variant="outline" size="sm">
                        View Details
                      </Button>
                      <Button>
                        {settings?.isEnrolled ? 'Manage Enrollment' : 'Enroll Now'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>No Programs Available</CardTitle>
                  <CardDescription>
                    There are currently no demand response programs available for your site.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 mb-4">Check back later for new program opportunities.</p>
                  <Button variant="outline">Notify Me of New Programs</Button>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="events" className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {isLoading ? (
              <p>Loading events...</p>
            ) : events.length > 0 ? (
              events.map((event: any) => (
                <Card key={event.id}>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <CardTitle>{event.name}</CardTitle>
                      <Badge className={getStatusColor(event.status)}>
                        {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                      </Badge>
                    </div>
                    <CardDescription>
                      Program: {event.programName}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 gap-3 mb-4">
                      <div className="flex items-center">
                        <CalendarDays className="mr-2 h-4 w-4 text-gray-500" />
                        <span>
                          {format(new Date(event.startTime), 'MMM d, yyyy')}
                          {' '}{format(new Date(event.startTime), 'h:mm a')} - 
                          {' '}{format(new Date(event.endTime), 'h:mm a')}
                        </span>
                      </div>
                      <div className="flex items-center">
                        <Clock className="mr-2 h-4 w-4 text-gray-500" />
                        <span>Duration: {
                          Math.round((new Date(event.endTime).getTime() - new Date(event.startTime).getTime()) / (1000 * 60))
                        } minutes</span>
                      </div>
                      <div className="flex items-center">
                        <Zap className="mr-2 h-4 w-4 text-gray-500" />
                        <span>Target Reduction: {event.targetReduction} kW</span>
                      </div>
                      {event.isEmergency && (
                        <div className="flex items-center text-red-500">
                          <AlertTriangle className="mr-2 h-4 w-4" />
                          <span>Emergency Event</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Participation status if found */}
                    {participations.find((p: any) => p.eventId === event.id) && (
                      <div className="mb-4 p-3 bg-gray-50 rounded-md">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-medium">Your Participation</span>
                          <Badge className={getParticipationStatusColor(
                            participations.find((p: any) => p.eventId === event.id)?.participationStatus
                          )}>
                            {participations.find((p: any) => p.eventId === event.id)?.participationStatus.replace('_', ' ')}
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-600">
                          {event.status === 'completed' && (
                            <div>
                              <div className="flex justify-between mb-1">
                                <span>Reduction achieved:</span>
                                <span className="font-medium">{
                                  participations.find((p: any) => p.eventId === event.id)?.reductionAchieved
                                } kW</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Incentive earned:</span>
                                <span className="font-medium">${
                                  participations.find((p: any) => p.eventId === event.id)?.incentiveEarned?.toFixed(2)
                                }</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    
                    <div className="flex space-x-2 justify-end">
                      {['scheduled', 'pending'].includes(event.status) && (
                        <>
                          <Button variant="outline" size="sm">Opt Out</Button>
                          <Button size="sm">Participate</Button>
                        </>
                      )}
                      {event.status === 'active' && (
                        <Button size="sm">View Live Status</Button>
                      )}
                      {event.status === 'completed' && (
                        <Button variant="outline" size="sm">View Report</Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>No Upcoming Events</CardTitle>
                  <CardDescription>
                    There are currently no demand response events scheduled.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">You'll be notified when new events are announced.</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="settings" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Demand Response Settings</CardTitle>
              <CardDescription>
                Configure how your site participates in demand response programs
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p>Loading settings...</p>
              ) : settings ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <h3 className="font-medium flex items-center">
                        <Settings className="h-4 w-4 mr-2" /> Enrollment Status
                      </h3>
                      <div className="flex items-center space-x-2">
                        <Badge className={settings.isEnrolled ? "bg-green-500" : "bg-gray-500"}>
                          {settings.isEnrolled ? "Enrolled" : "Not Enrolled"}
                        </Badge>
                        <Button variant="outline" size="sm">
                          {settings.isEnrolled ? "Update Enrollment" : "Enroll Now"}
                        </Button>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <h3 className="font-medium flex items-center">
                        <Zap className="h-4 w-4 mr-2" /> Reduction Capacity
                      </h3>
                      <p>{settings.maxReductionCapacity || 0} kW</p>
                    </div>
                    
                    <div className="space-y-2">
                      <h3 className="font-medium flex items-center">
                        <Bell className="h-4 w-4 mr-2" /> Notifications
                      </h3>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span>Email</span>
                          <span>{settings.notificationEmail || 'Not set'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>SMS</span>
                          <span>{settings.notificationSms || 'Not set'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Push Notifications</span>
                          <Badge className={settings.notificationPush ? "bg-green-500" : "bg-gray-500"}>
                            {settings.notificationPush ? "Enabled" : "Disabled"}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <h3 className="font-medium flex items-center">
                        <Info className="h-4 w-4 mr-2" /> Default Participation
                      </h3>
                      <Badge className={getParticipationStatusColor(settings.defaultParticipation)}>
                        {settings.defaultParticipation.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t">
                    <h3 className="font-medium mb-3">Device Participation Priority</h3>
                    {settings.devicePriorities ? (
                      <div className="space-y-2">
                        {Object.entries(settings.devicePriorities).map(([deviceId, priority]: [string, any]) => (
                          <div key={deviceId} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                            <span>Device {deviceId}</span>
                            <span>Priority: {priority}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500">No device priorities configured</p>
                    )}
                  </div>
                  
                  <div className="flex justify-end space-x-2 pt-4">
                    <Button variant="outline">Cancel</Button>
                    <Button>Save Settings</Button>
                  </div>
                </div>
              ) : (
                <div className="text-center p-6">
                  <p className="mb-4">No demand response settings found for this site.</p>
                  <Button>Create Settings</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Participation History</CardTitle>
              <CardDescription>
                Review your past participation in demand response events
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p>Loading history...</p>
              ) : participations.length > 0 ? (
                <div className="space-y-4">
                  {participations
                    .filter((p: any) => p.eventStatus === 'completed')
                    .map((participation: any) => (
                      <div key={participation.id} className="border rounded-md p-4">
                        <div className="flex justify-between items-center mb-2">
                          <h3 className="font-medium">{participation.eventName}</h3>
                          <Badge className={getParticipationStatusColor(participation.participationStatus)}>
                            {participation.participationStatus.replace('_', ' ')}
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-500 mb-2">
                          {format(new Date(participation.eventDate), 'MMMM d, yyyy')}
                        </div>
                        <div className="grid grid-cols-2 gap-2 mb-2">
                          <div>
                            <span className="text-xs text-gray-500">Baseline</span>
                            <p>{participation.baselineConsumption} kW</p>
                          </div>
                          <div>
                            <span className="text-xs text-gray-500">Actual</span>
                            <p>{participation.actualConsumption} kW</p>
                          </div>
                          <div>
                            <span className="text-xs text-gray-500">Reduction</span>
                            <p>{participation.reductionAchieved} kW</p>
                          </div>
                          <div>
                            <span className="text-xs text-gray-500">Incentive</span>
                            <p>${participation.incentiveEarned?.toFixed(2) || '0.00'}</p>
                          </div>
                        </div>
                        <div className="flex justify-end">
                          <Button variant="outline" size="sm">View Details</Button>
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="text-center p-6">
                  <p>No participation history found.</p>
                  <p className="text-sm text-gray-500 mt-2">
                    Once you participate in demand response events, your history will appear here.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}