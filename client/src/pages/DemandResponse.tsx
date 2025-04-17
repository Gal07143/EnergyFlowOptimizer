import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, History, AlertTriangle, Sparkles, RefreshCw, DownloadIcon } from 'lucide-react';
import { useSiteContext } from '@/hooks/use-site-context';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

// Import the demand response hooks and components
import { 
  useDemandResponsePrograms, 
  useDemandResponseEvents, 
  useDemandResponseSettings,
  useSiteEventParticipations
} from '@/hooks/useDemandResponse';
import ProgramCard from '@/components/demand-response/ProgramCard';
import EventCard from '@/components/demand-response/EventCard';
import SettingsForm from '@/components/demand-response/SettingsForm';
import NotificationDropdown from '@/components/demand-response/NotificationDropdown';
import { DemandResponseNotificationProvider } from '@/hooks/useDemandResponseNotifications';

export default function DemandResponse() {
  const { currentSiteId } = useSiteContext();
  const [activeTab, setActiveTab] = useState('programs');
  const { toast } = useToast();

  // Fetch demand response data using our custom hooks
  const { 
    data: programs = [], 
    isLoading: programsLoading,
    refetch: refetchPrograms
  } = useDemandResponsePrograms(currentSiteId || undefined);

  const { 
    data: events = [], 
    isLoading: eventsLoading,
    refetch: refetchEvents
  } = useDemandResponseEvents(currentSiteId || undefined);

  const { 
    data: settings, 
    isLoading: settingsLoading,
    refetch: refetchSettings
  } = useDemandResponseSettings(currentSiteId || undefined);

  const { 
    data: participations = [], 
    isLoading: participationsLoading,
    refetch: refetchParticipations
  } = useSiteEventParticipations(currentSiteId || undefined);

  const isLoading = programsLoading || eventsLoading || settingsLoading || participationsLoading;

  // Filter events by status for different sections
  const upcomingEvents = events.filter((event: any) => 
    ['scheduled', 'pending'].includes(event.status)
  );
  
  const activeEvents = events.filter((event: any) => 
    event.status === 'active'
  );
  
  const pastEvents = events
    .filter((event: any) => ['completed', 'cancelled'].includes(event.status))
    .sort((a: any, b: any) => new Date(b.endTime).getTime() - new Date(a.endTime).getTime());

  // Function to refresh all data
  const refreshData = () => {
    refetchPrograms();
    refetchEvents();
    refetchSettings();
    refetchParticipations();
    
    toast({
      title: "Data Refreshed",
      description: "The latest demand response data has been loaded.",
    });
  };

  // Get total earnings from past participations
  const totalEarnings = participations
    .filter((p: any) => p.incentiveEarned && p.endTime && new Date(p.endTime) < new Date())
    .reduce((sum: number, p: any) => sum + (p.incentiveEarned || 0), 0);

  // Handle program enrollment change
  const handleProgramEnrollmentChange = () => {
    refetchSettings();
    refetchPrograms();
  };

  // Handle event participation change
  const handleEventParticipationChange = () => {
    refetchParticipations();
    refetchEvents();
  };

  // Handle settings update
  const handleSettingsUpdate = () => {
    refetchSettings();
  };

  return (
    <DemandResponseNotificationProvider>
      <div className="container mx-auto py-6 px-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Demand Response Management</h1>
          <div className="flex items-center space-x-2">
            <Button 
              variant="outline" 
              size="icon"
              onClick={refreshData}
              title="Refresh data"
            >
              <RefreshCw className="h-5 w-5" />
            </Button>
            <NotificationDropdown />
          </div>
        </div>

        <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="programs">Programs</TabsTrigger>
            <TabsTrigger value="events">Events</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          {/* Programs Tab */}
          <TabsContent value="programs" className="pt-4">
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[1, 2].map((i) => (
                  <Card key={i} className="overflow-hidden">
                    <CardHeader>
                      <Skeleton className="h-8 w-64 mb-2" />
                      <Skeleton className="h-4 w-48" />
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <Skeleton className="h-20 w-full" />
                          <Skeleton className="h-20 w-full" />
                          <Skeleton className="h-20 w-full" />
                          <Skeleton className="h-20 w-full" />
                        </div>
                        <Skeleton className="h-20 w-full" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : programs.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {programs.map((program: any) => (
                  <ProgramCard
                    key={program.id}
                    program={program}
                    settings={settings}
                    siteId={currentSiteId!}
                    onEnrollmentChange={handleProgramEnrollmentChange}
                  />
                ))}
              </div>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>No Programs Available</CardTitle>
                  <CardDescription>
                    There are currently no demand response programs available for your site.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">
                    Check back later for new program opportunities or contact your energy provider for information.
                  </p>
                  <Button variant="outline">Request Program Information</Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Events Tab */}
          <TabsContent value="events" className="pt-4">
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[1, 2].map((i) => (
                  <Card key={i}>
                    <CardHeader>
                      <Skeleton className="h-8 w-64 mb-2" />
                      <Skeleton className="h-4 w-48" />
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-4 w-2/3" />
                        <Skeleton className="h-12 w-full" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : events.length > 0 ? (
              <div className="space-y-8">
                {/* Active Events Section */}
                {activeEvents.length > 0 && (
                  <div>
                    <div className="flex items-center mb-4">
                      <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
                      <h2 className="text-xl font-semibold">Active Events</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {activeEvents.map((event: any) => {
                        const participation = participations.find(
                          (p: any) => p.eventId === event.id
                        );
                        return (
                          <EventCard
                            key={event.id}
                            event={event}
                            participation={participation}
                            siteId={currentSiteId!}
                            onParticipationChange={handleEventParticipationChange}
                            className="border-green-200 shadow-md"
                          />
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Upcoming Events Section */}
                {upcomingEvents.length > 0 && (
                  <div>
                    <div className="flex items-center mb-4">
                      <div className="w-3 h-3 rounded-full bg-blue-500 mr-2"></div>
                      <h2 className="text-xl font-semibold">Upcoming Events</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {upcomingEvents.map((event: any) => {
                        const participation = participations.find(
                          (p: any) => p.eventId === event.id
                        );
                        return (
                          <EventCard
                            key={event.id}
                            event={event}
                            participation={participation}
                            siteId={currentSiteId!}
                            onParticipationChange={handleEventParticipationChange}
                          />
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Past Events Section (Limited to 4) */}
                {pastEvents.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center">
                        <div className="w-3 h-3 rounded-full bg-gray-400 mr-2"></div>
                        <h2 className="text-xl font-semibold">Past Events</h2>
                      </div>
                      {pastEvents.length > 4 && (
                        <Button 
                          variant="link"
                          onClick={() => setActiveTab('history')}
                        >
                          View All Past Events
                        </Button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {pastEvents.slice(0, 4).map((event: any) => {
                        const participation = participations.find(
                          (p: any) => p.eventId === event.id
                        );
                        return (
                          <EventCard
                            key={event.id}
                            event={event}
                            participation={participation}
                            siteId={currentSiteId!}
                            onParticipationChange={handleEventParticipationChange}
                            className="opacity-80"
                          />
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>No Events Scheduled</CardTitle>
                  <CardDescription>
                    There are currently no demand response events scheduled for your site.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center text-center py-8">
                  <CalendarDays className="h-16 w-16 text-muted-foreground/30 mb-4" />
                  <p className="text-muted-foreground max-w-md">
                    You'll be notified when new events are announced based on your notification preferences.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="pt-4">
            {isLoading ? (
              <Card>
                <CardHeader>
                  <Skeleton className="h-8 w-64 mb-2" />
                  <Skeleton className="h-4 w-full" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-20 w-full" />
                  </div>
                </CardContent>
              </Card>
            ) : (
              <SettingsForm
                settings={settings}
                siteId={currentSiteId!}
                onSettingsUpdate={handleSettingsUpdate}
              />
            )}
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="pt-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Participation History</CardTitle>
                    <CardDescription>
                      Review your historical demand response participation and earnings
                    </CardDescription>
                  </div>
                  <Button 
                    variant="outline"
                    size="sm"
                    disabled={pastEvents.length === 0}
                  >
                    <DownloadIcon className="h-4 w-4 mr-1.5" />
                    Export Report
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-4">
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ) : pastEvents.length > 0 ? (
                  <div className="space-y-4">
                    <div className="rounded-md border">
                      {/* Table header */}
                      <div className="flex items-center p-3 bg-muted/50 font-medium border-b">
                        <div className="w-1/3">Event</div>
                        <div className="w-1/4">Date</div>
                        <div className="w-1/6">Status</div>
                        <div className="w-1/6 text-right">Reduction</div>
                        <div className="w-1/6 text-right">Earnings</div>
                      </div>
                      
                      {/* Table body */}
                      {pastEvents.map((event: any) => {
                        const participation = participations.find(
                          (p: any) => p.eventId === event.id
                        );
                        
                        return (
                          <div key={event.id} className="flex items-center p-3 border-b last:border-b-0 hover:bg-muted/20">
                            <div className="w-1/3 font-medium">{event.name}</div>
                            <div className="w-1/4">{format(new Date(event.startTime), 'MMM d, yyyy')}</div>
                            <div className="w-1/6">
                              <Badge 
                                variant="outline"
                                className={
                                  participation?.participationStatus === 'opt_in' 
                                    ? "border-green-200 text-green-700 bg-green-50" 
                                    : participation?.participationStatus === 'opt_out'
                                      ? "border-red-200 text-red-700 bg-red-50"
                                      : "border-blue-200 text-blue-700 bg-blue-50"
                                }
                              >
                                {participation?.participationStatus === 'opt_in' 
                                  ? 'Participated' 
                                  : participation?.participationStatus === 'opt_out' 
                                    ? 'Opted Out' 
                                    : 'Auto'}
                              </Badge>
                            </div>
                            <div className="w-1/6 text-right">
                              {participation?.reductionAchieved 
                                ? `${participation.reductionAchieved} kW` 
                                : '--'}
                            </div>
                            <div className="w-1/6 text-right font-medium">
                              ${participation?.incentiveEarned?.toFixed(2) || '0.00'}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    
                    {/* Total earnings summary */}
                    <div className="flex justify-between items-center p-4 bg-muted/50 rounded-md">
                      <span className="font-medium">Total Earnings</span>
                      <span className="text-xl font-bold text-green-600">
                        ${totalEarnings.toFixed(2)}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <History className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No Historical Data</h3>
                    <p className="text-muted-foreground max-w-md mx-auto">
                      You haven't participated in any demand response events yet. 
                      Your participation history will appear here once you've completed events.
                    </p>
                    
                    {programs.length > 0 && (
                      <Button 
                        variant="outline" 
                        className="mt-4"
                        onClick={() => setActiveTab('programs')}
                      >
                        <Sparkles className="h-4 w-4 mr-1.5" />
                        View Available Programs
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DemandResponseNotificationProvider>
  );
}