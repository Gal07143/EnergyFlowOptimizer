import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Card, 
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Clock, Zap, Calendar } from 'lucide-react';

interface TariffWidgetProps {
  siteId: number;
  className?: string;
}

const TariffWidget: React.FC<TariffWidgetProps> = ({ siteId, className }) => {
  const [activeTab, setActiveTab] = useState('current');
  
  // Fetch tariff data for site
  const { data: tariffData, isLoading: tariffLoading } = useQuery({
    queryKey: ['/api/sites', siteId, 'tariff'],
    queryFn: async () => {
      const res = await fetch(`/api/sites/${siteId}/tariff`);
      if (!res.ok) throw new Error('Failed to fetch tariff data');
      return await res.json();
    },
    enabled: !!siteId,
  });
  
  // Fetch current rate based on time of day
  const { data: currentRate, isLoading: rateLoading } = useQuery({
    queryKey: ['/api/sites', siteId, 'tariff/rate', new Date().toISOString()],
    queryFn: async () => {
      const res = await fetch(`/api/sites/${siteId}/tariff/rate`);
      if (!res.ok) throw new Error('Failed to fetch current rate');
      return await res.json();
    },
    enabled: !!siteId,
    refetchInterval: 60000, // Refresh every minute as rates can change
  });
  
  // For demo purposes, if no tariff data is available yet
  useEffect(() => {
    if (!tariffLoading && !tariffData) {
      // This would normally call the API to create a tariff
      console.log('No tariff data available for this site');
    }
  }, [tariffData, tariffLoading, siteId]);

  if (tariffLoading || rateLoading) {
    return (
      <Card className={cn("w-full", className)}>
        <CardHeader>
          <CardTitle><Skeleton className="h-6 w-32" /></CardTitle>
          <CardDescription><Skeleton className="h-4 w-48" /></CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-40 w-full" />
        </CardContent>
      </Card>
    );
  }
  
  // Determine color based on rate type (for Israeli TOU tariff)
  const getRateColor = (rateType: string) => {
    switch (rateType?.toLowerCase()) {
      case 'peak':
        return 'bg-red-500';
      case 'shoulder':
        return 'bg-amber-500';
      case 'off-peak':
        return 'bg-green-500';
      default:
        return 'bg-blue-500';
    }
  };
  
  const getSeasonIcon = (season?: string) => {
    if (!season) return null;
    
    switch (season.toLowerCase()) {
      case 'summer':
        return '☀️';
      case 'winter':
        return '❄️';
      case 'transition':
        return '🍂';
      default:
        return null;
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    // Use locale based on currency
    const locale = currency === 'ILS' ? 'he-IL' : 'en-US';
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      maximumFractionDigits: 2
    }).format(amount);
  };

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-amber-500" />
          Electricity Pricing
        </CardTitle>
        <CardDescription>
          {tariffData?.isTimeOfUse 
            ? 'Time-of-use tariff rates' 
            : 'Fixed rate electricity tariff'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="current" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="current">Current Rate</TabsTrigger>
            <TabsTrigger value="details">Tariff Details</TabsTrigger>
          </TabsList>
          
          <TabsContent value="current" className="mt-4">
            {currentRate && (
              <div className="flex flex-col space-y-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {format(new Date(), 'EEEE, h:mm a')}
                    </span>
                  </div>
                  
                  {currentRate.season && (
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground mr-1">
                        {currentRate.season}
                      </span>
                      <span>{getSeasonIcon(currentRate.season)}</span>
                    </div>
                  )}
                </div>
                
                <div className="flex flex-col items-center justify-center py-6">
                  <Badge 
                    className={cn(
                      "text-white px-3 py-1 mb-3", 
                      getRateColor(currentRate.rateType)
                    )}
                  >
                    {currentRate.rateType}
                  </Badge>
                  <div className="text-4xl font-bold">
                    {formatCurrency(currentRate.currentRate, currentRate.currency)}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    per kWh
                  </div>
                </div>
                
                {tariffData?.isTimeOfUse && currentRate.season && (
                  <div className="text-sm text-center text-muted-foreground">
                    {currentRate.season === 'Summer' && 'Higher rates during evening peak hours (5PM-10PM)'}
                    {currentRate.season === 'Winter' && 'Peak rates in evening hours (5PM-9PM)'}
                    {currentRate.season === 'Transition' && 'Moderate rates with evening peak (5PM-10PM)'}
                  </div>
                )}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="details" className="mt-4">
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-1">Tariff Information</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-muted-foreground">Provider:</div>
                  <div>{tariffData?.provider || 'Not available'}</div>
                  
                  <div className="text-muted-foreground">Type:</div>
                  <div>{tariffData?.isTimeOfUse ? 'Time of Use (TOU)' : 'Fixed Rate'}</div>
                  
                  {!tariffData?.isTimeOfUse && (
                    <>
                      <div className="text-muted-foreground">Import Rate:</div>
                      <div>{formatCurrency(tariffData?.importRate || 0, tariffData?.currency || 'USD')}/kWh</div>
                      
                      <div className="text-muted-foreground">Export Rate:</div>
                      <div>{formatCurrency(tariffData?.exportRate || 0, tariffData?.currency || 'USD')}/kWh</div>
                    </>
                  )}
                </div>
              </div>
              
              {tariffData?.isTimeOfUse && tariffData?.scheduleData && (
                <div>
                  <h4 className="font-medium mb-1">Seasonal Rates</h4>
                  <div className="space-y-3 text-sm">
                    {(tariffData.scheduleData as any).seasons?.map((season: any, index: number) => (
                      <div key={index} className="border rounded-md p-2">
                        <div className="flex items-center gap-1 font-medium mb-1">
                          {getSeasonIcon(season.name)} {season.name}
                          <span className="text-xs text-muted-foreground ml-1">
                            (Months: {season.months.join(', ')})
                          </span>
                        </div>
                        <div className="pl-2 space-y-1">
                          {season.rates.map((rate: any, rateIdx: number) => (
                            <div key={rateIdx} className="flex items-center gap-2">
                              <Badge 
                                className={cn(
                                  "text-white h-5 min-w-[60px] flex justify-center", 
                                  getRateColor(rate.name)
                                )}
                              >
                                {rate.name}
                              </Badge>
                              <span>
                                {formatCurrency(rate.rate, tariffData.currency)}/kWh
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default TariffWidget;