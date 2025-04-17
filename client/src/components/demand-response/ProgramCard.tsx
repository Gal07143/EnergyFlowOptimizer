import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CalendarDays, DollarSign, Clock, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { 
  DemandResponseProgram,
  SiteDemandResponseSettings,
  useUpdateDemandResponseSettings
} from '@/hooks/useDemandResponse';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';
import { cn } from '@/lib/utils';

interface ProgramCardProps {
  program: DemandResponseProgram;
  settings?: SiteDemandResponseSettings;
  siteId: number;
  onEnrollmentChange?: () => void;
  className?: string;
}

export default function ProgramCard({ 
  program, 
  settings, 
  siteId,
  onEnrollmentChange,
  className 
}: ProgramCardProps) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const updateSettingsMutation = useUpdateDemandResponseSettings();
  
  const isEnrolled = settings?.isEnrolled || false;
  
  // Handle enrollment toggle
  const handleEnrollmentToggle = async () => {
    try {
      if (settings) {
        // Update existing settings
        await updateSettingsMutation.mutateAsync({
          siteId,
          settingsData: {
            isEnrolled: !settings.isEnrolled
          }
        });
      } else {
        // Create new settings with enrollment
        await updateSettingsMutation.mutateAsync({
          siteId,
          settingsData: {
            siteId,
            isEnrolled: true,
            defaultParticipation: 'opt_in',
            autoResponseEnabled: true,
            notificationPush: true
          }
        });
      }
      
      toast({
        title: "Success",
        description: isEnrolled 
          ? `You have unenrolled from the ${program.name} program.`
          : `You have enrolled in the ${program.name} program.`,
      });
      
      if (onEnrollmentChange) {
        onEnrollmentChange();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: isEnrolled
          ? "Failed to unenroll from the program. Please try again."
          : "Failed to enroll in the program. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  // Handle view details
  const handleViewDetails = () => {
    setLocation(`/demand-response/programs/${program.id}`);
  };

  return (
    <Card className={cn("overflow-hidden", className)}>
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
            <span className="text-sm text-muted-foreground">Program Type</span>
            <span className="font-medium capitalize">{program.programType.replace(/_/g, ' ')}</span>
          </div>
          
          <div className="flex flex-col">
            <span className="text-sm text-muted-foreground">Incentive Rate</span>
            <span className="font-medium flex items-center">
              <DollarSign className="h-3.5 w-3.5 text-green-500 mr-0.5" />
              {program.incentiveRate?.toFixed(2) || '0.00'}/kW
            </span>
          </div>
          
          <div className="flex flex-col">
            <span className="text-sm text-muted-foreground">Duration</span>
            <span className="font-medium flex items-center">
              <CalendarDays className="h-3.5 w-3.5 text-muted-foreground mr-0.5" />
              {program.startDate && program.endDate
                ? `${format(new Date(program.startDate), 'MMM d, yyyy')} - ${format(new Date(program.endDate), 'MMM d, yyyy')}`
                : 'Ongoing'}
            </span>
          </div>
          
          <div className="flex flex-col">
            <span className="text-sm text-muted-foreground">Notification Lead Time</span>
            <span className="font-medium flex items-center">
              <Clock className="h-3.5 w-3.5 text-muted-foreground mr-0.5" />
              {program.notificationLeadTime || 0} minutes
            </span>
          </div>
        </div>
        
        {program.description && (
          <p className="text-sm text-muted-foreground mb-4">{program.description}</p>
        )}
        
        {program.maxEventDuration && (
          <div className="flex items-center p-2 bg-amber-50 rounded mb-4 text-sm">
            <AlertCircle className="h-4 w-4 text-amber-500 mr-2" />
            <span>Maximum event duration: {program.maxEventDuration} minutes</span>
          </div>
        )}
        
        <div className="flex justify-between items-center">
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleViewDetails}
          >
            View Details
          </Button>
          
          <Button
            onClick={handleEnrollmentToggle}
            disabled={updateSettingsMutation.isPending}
            variant={isEnrolled ? "outline" : "default"}
            className={isEnrolled ? "border-red-200 text-red-600 hover:bg-red-50" : ""}
          >
            {updateSettingsMutation.isPending 
              ? 'Processing...' 
              : isEnrolled 
                ? 'Unenroll' 
                : 'Enroll Now'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}