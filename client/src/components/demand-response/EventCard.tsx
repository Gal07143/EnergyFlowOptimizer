import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CalendarDays, Clock, Zap, AlertTriangle, DollarSign, BarChart, Info } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { 
  DemandResponseEvent, 
  SiteEventParticipation,
  useOptInDemandResponseEvent,
  useOptOutDemandResponseEvent
} from '@/hooks/useDemandResponse';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';

interface EventCardProps {
  event: DemandResponseEvent;
  participation?: SiteEventParticipation;
  siteId: number;
  onParticipationChange?: () => void;
  className?: string;
}

export default function EventCard({ 
  event, 
  participation, 
  siteId,
  onParticipationChange,
  className 
}: EventCardProps) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const optInMutation = useOptInDemandResponseEvent();
  const optOutMutation = useOptOutDemandResponseEvent();

  // Function to get color for event status
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-500 hover:bg-blue-600';
      case 'pending': return 'bg-amber-500 hover:bg-amber-600';
      case 'active': return 'bg-green-500 hover:bg-green-600';
      case 'completed': return 'bg-gray-500 hover:bg-gray-600';
      case 'cancelled': return 'bg-red-500 hover:bg-red-600';
      default: return 'bg-gray-500 hover:bg-gray-600';
    }
  };

  // Function to get color for participation status
  const getParticipationStatusColor = (status: string) => {
    switch (status) {
      case 'opt_in': return 'bg-green-500 hover:bg-green-600';
      case 'opt_out': return 'bg-red-500 hover:bg-red-600';
      case 'automatic': return 'bg-blue-500 hover:bg-blue-600';
      default: return 'bg-gray-500 hover:bg-gray-600';
    }
  };

  // Handle opt-in
  const handleOptIn = async () => {
    try {
      if (participation?.id) {
        // Update existing participation
        await optInMutation.mutateAsync({ 
          siteId,
          eventId: event.id,
          participationId: participation.id
        });
      } else {
        // Create new participation
        await optInMutation.mutateAsync({ 
          siteId,
          eventId: event.id 
        });
      }
      
      toast({
        title: "Success",
        description: `You have opted in to the ${event.name} event.`,
      });
      
      if (onParticipationChange) {
        onParticipationChange();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to opt in to the event. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle opt-out
  const handleOptOut = async () => {
    try {
      await optOutMutation.mutateAsync({ 
        siteId,
        eventId: event.id,
        participationId: participation?.id,
        notes: "User opt-out via dashboard"
      });
      
      toast({
        title: "Success",
        description: `You have opted out of the ${event.name} event.`,
      });
      
      if (onParticipationChange) {
        onParticipationChange();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to opt out of the event. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle view details
  const handleViewDetails = () => {
    setLocation(`/demand-response/events/${event.id}`);
  };

  // Calculate duration in minutes
  const durationMinutes = Math.round(
    (new Date(event.endTime).getTime() - new Date(event.startTime).getTime()) / (1000 * 60)
  );

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-xl">{event.name}</CardTitle>
          <Badge className={cn(getStatusColor(event.status), "text-white")}>
            {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
          </Badge>
        </div>
        <CardDescription>
          {event.programName || 'Demand Response Program'}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="py-4">
        <div className="grid grid-cols-1 gap-3 mb-4">
          <div className="flex items-center">
            <CalendarDays className="mr-2 h-4 w-4 text-muted-foreground" />
            <span>
              {format(new Date(event.startTime), 'MMM d, yyyy')}
              {' '}{format(new Date(event.startTime), 'h:mm a')} - 
              {' '}{format(new Date(event.endTime), 'h:mm a')}
            </span>
          </div>
          <div className="flex items-center">
            <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
            <span>Duration: {durationMinutes} minutes</span>
          </div>
          <div className="flex items-center">
            <Zap className="mr-2 h-4 w-4 text-muted-foreground" />
            <span>Target Reduction: {event.targetReduction || 'N/A'} kW</span>
          </div>
          
          {event.incentiveModifier && event.incentiveModifier !== 1 && (
            <div className="flex items-center">
              <DollarSign className="mr-2 h-4 w-4 text-muted-foreground" />
              <span>Incentive Modifier: {event.incentiveModifier}x</span>
            </div>
          )}
          
          {event.isEmergency && (
            <div className="flex items-center text-red-500">
              <AlertTriangle className="mr-2 h-4 w-4" />
              <span>Emergency Event</span>
            </div>
          )}
        </div>
        
        {event.description && (
          <div className="mt-2 mb-4">
            <p className="text-sm text-muted-foreground">{event.description}</p>
          </div>
        )}
        
        {/* Participation status if any */}
        {participation && (
          <div className="mb-4 p-3 bg-muted/40 rounded-md">
            <div className="flex justify-between items-center mb-2">
              <span className="font-medium">Your Participation</span>
              <Badge 
                className={cn(
                  getParticipationStatusColor(participation.participationStatus), 
                  "text-white capitalize"
                )}
              >
                {participation.participationStatus.replace('_', ' ')}
              </Badge>
            </div>
            
            {event.status === 'completed' && (
              <div className="mt-2 space-y-1 text-sm">
                {participation.reductionAchieved !== null && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Reduction achieved:</span>
                    <span className="font-medium">{participation.reductionAchieved} kW</span>
                  </div>
                )}
                {participation.incentiveEarned !== null && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Incentive earned:</span>
                    <span className="font-medium">${participation.incentiveEarned.toFixed(2)}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
      
      <CardFooter className="flex justify-end space-x-2 pt-0">
        <Button 
          variant="outline" 
          size="sm"
          onClick={handleViewDetails}
        >
          <Info className="h-4 w-4 mr-1.5" />
          Details
        </Button>
        
        {['scheduled', 'pending'].includes(event.status) && (
          <>
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleOptOut}
              className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
              disabled={optOutMutation.isPending}
            >
              Opt Out
            </Button>
            <Button 
              size="sm"
              onClick={handleOptIn}
              className="bg-green-600 hover:bg-green-700"
              disabled={optInMutation.isPending}
            >
              Participate
            </Button>
          </>
        )}
        
        {event.status === 'active' && (
          <Button 
            size="sm" 
            onClick={handleViewDetails}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <BarChart className="h-4 w-4 mr-1.5" />
            View Live Status
          </Button>
        )}
        
        {event.status === 'completed' && (
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleViewDetails}
          >
            <BarChart className="h-4 w-4 mr-1.5" />
            View Report
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}