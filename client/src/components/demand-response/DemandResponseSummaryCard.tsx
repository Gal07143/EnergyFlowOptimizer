import React from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, BarChart2, Zap, ExternalLink, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useDemandResponseEvents, useDemandResponsePrograms } from '@/hooks/useDemandResponse';
import { useSiteContext } from '@/hooks/use-site-context';

export default function DemandResponseSummaryCard({ className }: { className?: string }) {
  const { currentSiteId } = useSiteContext();
  const [, navigate] = useLocation();
  
  // Fetch data using hooks
  const { 
    data: programs = [],
    isLoading: programsLoading 
  } = useDemandResponsePrograms(currentSiteId || undefined);
  
  const { 
    data: events = [],
    isLoading: eventsLoading 
  } = useDemandResponseEvents(currentSiteId || undefined);
  
  const isLoading = programsLoading || eventsLoading;
  
  // Filter active events
  const activeEvents = events.filter((event: any) => event.status === 'active');
  
  // Filter upcoming events and sort by start time
  const upcomingEvents = events
    .filter((event: any) => ['scheduled', 'pending'].includes(event.status))
    .sort((a: any, b: any) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  // Get the next upcoming event
  const nextEvent = upcomingEvents.length > 0 ? upcomingEvents[0] : null;
  
  // Count active programs
  const activePrograms = programs.filter((program: any) => program.isActive).length;
  
  // Navigate to demand response page
  const handleViewAll = () => {
    navigate('/demand-response');
  };

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
        <CardTitle className="flex items-center text-lg">
          <BarChart2 className="h-5 w-5 mr-2" />
          Demand Response Programs
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        {isLoading ? (
          <div className="space-y-2 py-2">
            <div className="h-5 w-3/4 bg-gray-200 dark:bg-gray-700 animate-pulse rounded"></div>
            <div className="h-5 w-1/2 bg-gray-200 dark:bg-gray-700 animate-pulse rounded"></div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">Enrolled Programs</div>
              <Badge variant="outline" className="bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                {activePrograms} Active
              </Badge>
            </div>
            
            {activeEvents.length > 0 ? (
              <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-3 border border-red-200 dark:border-red-800/30">
                <div className="flex items-start">
                  <div className="flex-shrink-0 mr-2 mt-0.5">
                    <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <div className="font-medium text-red-700 dark:text-red-400">Active Event</div>
                    <div className="text-sm text-red-600 dark:text-red-300">{activeEvents[0].name}</div>
                    <div className="mt-1 flex items-center text-xs">
                      <Clock className="h-3 w-3 mr-1 text-red-500 dark:text-red-400" />
                      <span className="text-red-600 dark:text-red-300">
                        Ends at {format(new Date(activeEvents[0].endTime), 'h:mm a')}
                      </span>
                    </div>
                    <Button 
                      size="sm" 
                      variant="destructive" 
                      className="mt-2 rounded-full h-7"
                      onClick={handleViewAll}
                    >
                      View Details
                    </Button>
                  </div>
                </div>
              </div>
            ) : nextEvent ? (
              <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 p-3 border border-blue-200 dark:border-blue-800/30">
                <div className="flex items-start">
                  <div className="flex-shrink-0 mr-2 mt-0.5">
                    <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <div className="font-medium text-blue-700 dark:text-blue-400">Upcoming Event</div>
                    <div className="text-sm text-blue-600 dark:text-blue-300">{nextEvent.name}</div>
                    <div className="mt-1 flex items-center text-xs">
                      <Zap className="h-3 w-3 mr-1 text-blue-500 dark:text-blue-400" />
                      <span className="text-blue-600 dark:text-blue-300">
                        {format(new Date(nextEvent.startTime), 'MMM d, h:mm a')}
                      </span>
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="mt-2 rounded-full h-7 bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200 hover:text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800/30 dark:hover:bg-blue-900/50"
                      onClick={handleViewAll}
                    >
                      Prepare Response
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-sm text-gray-600 dark:text-gray-400 py-2">
                No active or upcoming events at this time.
              </div>
            )}
            
            <Button 
              variant="link" 
              size="sm" 
              className="pl-0 flex items-center text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300"
              onClick={handleViewAll}
            >
              View all programs and events
              <ExternalLink className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}