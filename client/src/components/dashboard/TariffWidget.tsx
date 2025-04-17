import { useState } from 'react';
import { useSiteTariff, useCurrentTariffRate, useCreateIsraeliTariff, useDeleteTariff, IsraeliTariffType } from '@/hooks/useTariff';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { CalendarDays, DollarSign, Clock, Trash2, AlertTriangle, ZapIcon, Zap } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TariffWidgetProps {
  siteId: number;
  className?: string;
}

export default function TariffWidget({ siteId, className }: TariffWidgetProps) {
  const [showTouDetails, setShowTouDetails] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const { toast } = useToast();
  
  const { 
    data: tariff, 
    isLoading: isTariffLoading, 
    error: tariffError 
  } = useSiteTariff(siteId);
  
  const { 
    data: currentRate, 
    isLoading: isRateLoading, 
    error: rateError 
  } = useCurrentTariffRate(siteId);

  const createIsraeliTariffMutation = useCreateIsraeliTariff(siteId);
  const deleteTariffMutation = useDeleteTariff();
  
  const handleCreateIsraeliTariff = async () => {
    try {
      await createIsraeliTariffMutation.mutateAsync('tou');
      toast({
        title: "Success",
        description: "Israeli tariff created successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create Israeli tariff",
        variant: "destructive"
      });
    }
  };
  
  const handleDeleteTariff = async () => {
    if (!tariff || !tariff.id) return;
    
    try {
      await deleteTariffMutation.mutateAsync({ tariffId: tariff.id, siteId });
      toast({
        title: "Success",
        description: "Tariff deleted successfully",
      });
      setIsDeleteConfirmOpen(false);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete tariff",
        variant: "destructive"
      });
    }
  };

  // State for selected tariff type
  const [selectedTariffType, setSelectedTariffType] = useState<IsraeliTariffType>('tou');
  
  // Handle creating Israeli tariff with selected type
  const handleCreateIsraeliTariffWithType = async () => {
    try {
      await createIsraeliTariffMutation.mutateAsync(selectedTariffType);
      toast({
        title: "Success",
        description: `Israeli ${selectedTariffType.toUpperCase()} tariff created successfully`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : `Failed to create Israeli ${selectedTariffType.toUpperCase()} tariff`,
        variant: "destructive"
      });
    }
  };

  // If no tariff data exists yet, show creation options
  if (!tariff && !isTariffLoading && !tariffError) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Israeli Electricity Tariff</CardTitle>
          <p className="text-sm text-muted-foreground">Select the tariff type to create</p>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-4">
          <div className="grid w-full gap-4">
            <div className="flex flex-col space-y-1.5">
              <label htmlFor="tariff-type" className="text-sm font-medium">Tariff Type</label>
              <Select 
                value={selectedTariffType}
                onValueChange={(value) => setSelectedTariffType(value as IsraeliTariffType)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select tariff type" />
                </SelectTrigger>
                <SelectContent position="popper">
                  <SelectItem value="tou">
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-2" />
                      <span>Time of Use (TOU)</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="lv">
                    <div className="flex items-center">
                      <Zap className="h-4 w-4 mr-2" />
                      <span>Low Voltage (LV)</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="hv">
                    <div className="flex items-center">
                      <Zap className="h-4 w-4 mr-2" />
                      <span>High Voltage (HV)</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="border rounded-md p-3 bg-muted/50">
              {selectedTariffType === 'tou' && (
                <div className="space-y-2">
                  <h3 className="font-semibold">Time of Use Tariff</h3>
                  <p className="text-sm text-muted-foreground">
                    Varies by time of day and season. Higher rates during peak hours (17:00-22:00), 
                    medium rates during shoulder hours, and lower rates at night.
                  </p>
                  <p className="text-sm">Currency: ILS (₪)</p>
                </div>
              )}
              
              {selectedTariffType === 'lv' && (
                <div className="space-y-2">
                  <h3 className="font-semibold">Low Voltage Tariff</h3>
                  <p className="text-sm text-muted-foreground">
                    Static rate for standard residential and small commercial consumers connected to 
                    the low voltage network (230V/400V).
                  </p>
                  <p className="text-sm">Rate: 0.48 ILS/kWh</p>
                </div>
              )}
              
              {selectedTariffType === 'hv' && (
                <div className="space-y-2">
                  <h3 className="font-semibold">High Voltage Tariff</h3>
                  <p className="text-sm text-muted-foreground">
                    Lower static rate for industrial consumers and large facilities connected 
                    directly to the high voltage network.
                  </p>
                  <p className="text-sm">Rate: 0.43 ILS/kWh</p>
                </div>
              )}
            </div>
          </div>
          
          <Button 
            className="mt-6 w-full"
            onClick={handleCreateIsraeliTariffWithType}
            disabled={createIsraeliTariffMutation.isPending}
          >
            {createIsraeliTariffMutation.isPending 
              ? 'Creating...' 
              : `Create ${selectedTariffType.toUpperCase()} Tariff`}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Loading state
  if (isTariffLoading || isRateLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-6 w-[200px] mb-2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-8 w-[70%]" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (tariffError || rateError) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Error Loading Tariff</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-destructive">
            {tariffError instanceof Error ? tariffError.message : 'Failed to load tariff data'}
          </p>
        </CardContent>
      </Card>
    );
  }

  // Determine the rate type and display the appropriate badge
  const rateType = tariff?.isTimeOfUse ? 'Time of Use' : 'Fixed Rate';
  const rateColor = tariff?.isTimeOfUse ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle>{tariff?.name || 'Electricity Tariff'}</CardTitle>
          <div className="flex items-center space-x-2">
            <Badge className={rateColor}>{rateType}</Badge>
            <Button 
              variant="ghost" 
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive/90 hover:bg-destructive/10"
              onClick={() => setIsDeleteConfirmOpen(true)}
              disabled={deleteTariffMutation.isPending}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">{tariff?.provider}</p>
      </CardHeader>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Tariff</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this tariff? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteTariff}
              disabled={deleteTariffMutation.isPending}
            >
              {deleteTariffMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <CardContent>
        {currentRate && (
          <div className="mb-4">
            <div className="text-sm text-muted-foreground mb-1 flex items-center">
              <Clock className="h-4 w-4 mr-1" /> Current Rate
            </div>
            <div className="text-3xl font-bold flex items-center">
              <DollarSign className="h-6 w-6 mr-1 text-primary" />
              {typeof currentRate.rate === 'number' 
                ? currentRate.rate.toFixed(2) 
                : currentRate.rate || '0.00'} 
              <span className="text-sm text-muted-foreground ml-1">
                {tariff?.currency || 'USD'}/kWh
              </span>
            </div>
            {currentRate.period && (
              <p className="text-sm text-muted-foreground mt-1">
                {currentRate.period}
              </p>
            )}
            {currentRate.timestamp && (
              <p className="text-xs text-muted-foreground mt-2">
                <CalendarDays className="h-3 w-3 inline mr-1" />
                {format(new Date(currentRate.timestamp), 'PPpp')}
              </p>
            )}
          </div>
        )}
        
        {tariff?.isTimeOfUse && (
          <div className="mt-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Rates Overview</span>
              <Button 
                variant="link" 
                className="p-0 h-auto text-xs" 
                onClick={() => setShowTouDetails(!showTouDetails)}
              >
                {showTouDetails ? 'Hide Details' : 'Show Details'}
              </Button>
            </div>
            
            {showTouDetails && tariff.scheduleData && (
              <div className="mt-3 space-y-3 text-sm">
                {Object.entries(tariff.scheduleData as Record<string, Record<string, number>>).map(([period, rates]) => (
                  <div key={period} className="border rounded-md p-2">
                    <div className="font-medium mb-1">{period}</div>
                    <ul className="space-y-1 pl-2">
                      {typeof rates === 'object' && Object.entries(rates).map(([time, rate]) => (
                        <li key={time} className="flex justify-between">
                          <span>{time}</span>
                          <span className="font-medium">{Number(rate).toFixed(2)} {tariff.currency}/kWh</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
            
            {!showTouDetails && (
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div className="border rounded-md p-2">
                  <div className="text-xs text-muted-foreground">Import Rate</div>
                  <div className="font-medium">{typeof tariff.importRate === 'number' ? tariff.importRate.toFixed(2) : '0.00'} {tariff.currency}/kWh</div>
                </div>
                <div className="border rounded-md p-2">
                  <div className="text-xs text-muted-foreground">Export Rate</div>
                  <div className="font-medium">{typeof tariff.exportRate === 'number' ? tariff.exportRate.toFixed(2) : '0.00'} {tariff.currency}/kWh</div>
                </div>
              </div>
            )}
          </div>
        )}
        
        {!tariff?.isTimeOfUse && (
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="border rounded-md p-3">
              <div className="text-sm text-muted-foreground">Import Rate</div>
              <div className="text-xl font-medium mt-1">{typeof tariff?.importRate === 'number' ? tariff.importRate.toFixed(2) : '0.00'} {tariff?.currency}/kWh</div>
            </div>
            <div className="border rounded-md p-3">
              <div className="text-sm text-muted-foreground">Export Rate</div>
              <div className="text-xl font-medium mt-1">{typeof tariff?.exportRate === 'number' ? tariff.exportRate.toFixed(2) : '0.00'} {tariff?.currency}/kWh</div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}