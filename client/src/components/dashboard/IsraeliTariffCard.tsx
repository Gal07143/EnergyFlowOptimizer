import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Clock, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

interface TariffData {
  id: number;
  name: string;
  provider: string;
  importRate: number;
  exportRate: number;
  isTimeOfUse: boolean;
  scheduleData?: {
    summer: {
      peak: number;
      shoulder: number;
      offPeak: number;
    };
    winter: {
      peak: number;
      shoulder: number;
      offPeak: number;
    };
    spring: {
      peak: number;
      shoulder: number;
      offPeak: number;
    };
    autumn: {
      peak: number;
      shoulder: number;
      offPeak: number;
    };
  };
  currency: string;
}

interface CurrentRateData {
  rate: number;
  period: string;
  timestamp: string;
  isTimeOfUse: boolean;
  currency: string;
}

export default function IsraeliTariffCard({ siteId }: { siteId: number }) {
  const [activeTab, setActiveTab] = useState("current");

  const { data: tariff, isLoading: isTariffLoading } = useQuery<TariffData>({
    queryKey: [`/api/sites/${siteId}/tariff`],
    enabled: !!siteId,
  });

  const { data: currentRate, isLoading: isRateLoading } = useQuery<CurrentRateData>({
    queryKey: [`/api/sites/${siteId}/tariff/rate`],
    refetchInterval: 60000, // Refetch every minute for up-to-date rate
    enabled: !!siteId,
  });

  const isLoading = isTariffLoading || isRateLoading;
  const isIsraeliTariff = tariff?.name.includes('Israeli');

  // Determine current season
  const getCurrentSeason = (): "summer" | "winter" | "spring" | "autumn" => {
    const now = new Date();
    const month = now.getMonth() + 1; // JavaScript months are 0-indexed

    if (month >= 6 && month <= 9) {
      return "summer"; // June-September
    } else if (month >= 10 && month <= 11) {
      return "autumn"; // October-November
    } else if (month >= 3 && month <= 5) {
      return "spring"; // March-May
    } else {
      return "winter"; // December-February
    }
  };

  const currentSeason = getCurrentSeason();

  // Helper function to determine the period color
  const getPeriodColor = (period: string) => {
    if (period.toLowerCase().includes("peak")) return "bg-red-100 text-red-800 border-red-200";
    if (period.toLowerCase().includes("shoulder")) return "bg-orange-100 text-orange-800 border-orange-200";
    if (period.toLowerCase().includes("off-peak")) return "bg-green-100 text-green-800 border-green-200";
    return "bg-blue-100 text-blue-800 border-blue-200";
  };

  return (
    <Card className="shadow-md">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-lg font-semibold">
              {isLoading ? (
                <Skeleton className="h-6 w-40" />
              ) : (
                <div className="flex items-center space-x-2">
                  <span>{tariff?.name || "Electricity Tariff"}</span>
                  {isIsraeliTariff && (
                    <Badge className="ml-2 bg-blue-600 hover:bg-blue-700">
                      Israeli
                    </Badge>
                  )}
                </div>
              )}
            </CardTitle>
            <CardDescription>
              {isLoading ? (
                <Skeleton className="h-4 w-20 mt-1" />
              ) : (
                tariff?.provider || "Electricity Provider"
              )}
            </CardDescription>
          </div>
          {!isLoading && currentRate && (
            <Badge variant="outline" className={`${getPeriodColor(currentRate.period)} px-3 py-1 font-medium`}>
              {currentRate.period}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full grid grid-cols-2 mb-4">
            <TabsTrigger value="current">Current Rate</TabsTrigger>
            <TabsTrigger value="schedule">Rate Schedule</TabsTrigger>
          </TabsList>

          <TabsContent value="current" className="space-y-4">
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : (
              <>
                <div className="flex flex-col items-center justify-center p-4 rounded-lg bg-slate-50 dark:bg-slate-900">
                  <div className="flex items-baseline">
                    <span className="text-3xl font-bold text-blue-700">
                      {currentRate?.rate.toFixed(2)}
                    </span>
                    <span className="text-lg ml-1 text-slate-600">
                      {currentRate?.currency || tariff?.currency}/kWh
                    </span>
                  </div>
                  <div className="text-sm text-slate-500 mt-1 flex items-center">
                    <Clock className="h-3 w-3 mr-1" />
                    <span>
                      As of{" "}
                      {currentRate?.timestamp
                        ? format(new Date(currentRate.timestamp), "HH:mm")
                        : format(new Date(), "HH:mm")}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg border bg-white dark:bg-slate-800">
                    <div className="text-xs font-medium text-slate-500 mb-1">Import Rate</div>
                    <div className="font-semibold text-lg">
                      {tariff?.importRate.toFixed(2)} {tariff?.currency}/kWh
                    </div>
                  </div>
                  <div className="p-3 rounded-lg border bg-white dark:bg-slate-800">
                    <div className="text-xs font-medium text-slate-500 mb-1">Export Rate</div>
                    <div className="font-semibold text-lg">
                      {tariff?.exportRate.toFixed(2)} {tariff?.currency}/kWh
                    </div>
                  </div>
                </div>

                {tariff?.isTimeOfUse && (
                  <div className="mt-1 text-sm text-slate-500 flex items-center">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="flex items-center cursor-help">
                            <Info className="h-4 w-4 mr-1 text-blue-500" />
                            Time-of-Use tariff changes based on time and season
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">
                            This tariff applies different rates depending on the time of day and season.
                            Peak rates are applied during high-demand hours, typically evenings.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                )}

                {isIsraeliTariff && (
                  <div className="mt-3 flex items-center">
                    <AlertTriangle className="h-4 w-4 text-amber-600 mr-2" />
                    <span className="text-sm text-slate-600">
                      Israeli grid often experiences capacity constraints during peak hours (17:00-22:00)
                    </span>
                  </div>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="schedule">
            {isLoading || !tariff?.isTimeOfUse ? (
              <div className="space-y-3">
                <Skeleton className="h-52 w-full" />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-3">
                  <div className="mb-2 font-medium">Current Season: <span className="capitalize">{currentSeason}</span></div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center p-2 rounded bg-red-50 border border-red-100 dark:bg-red-900/20 dark:border-red-800">
                      <span>Peak (17:00-22:00)</span>
                      <span className="font-bold">
                        {tariff.scheduleData?.[currentSeason].peak.toFixed(2)} {tariff.currency}/kWh
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-2 rounded bg-amber-50 border border-amber-100 dark:bg-amber-900/20 dark:border-amber-800">
                      <span>Shoulder (7:00-17:00, 22:00-23:00)</span>
                      <span className="font-bold">
                        {tariff.scheduleData?.[currentSeason].shoulder.toFixed(2)} {tariff.currency}/kWh
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-2 rounded bg-green-50 border border-green-100 dark:bg-green-900/20 dark:border-green-800">
                      <span>Off-Peak (23:00-7:00)</span>
                      <span className="font-bold">
                        {tariff.scheduleData?.[currentSeason].offPeak.toFixed(2)} {tariff.currency}/kWh
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm">
                  <Tabs defaultValue="summer" className="w-full">
                    <TabsList className="w-full grid grid-cols-2">
                      <TabsTrigger value="summer">Summer</TabsTrigger>
                      <TabsTrigger value="winter">Winter</TabsTrigger>
                    </TabsList>
                    <TabsContent value="summer" className="pt-2">
                      <RateTable 
                        rates={tariff.scheduleData?.summer} 
                        currency={tariff.currency} 
                        isActive={currentSeason === 'summer'}
                      />
                    </TabsContent>
                    <TabsContent value="winter" className="pt-2">
                      <RateTable 
                        rates={tariff.scheduleData?.winter} 
                        currency={tariff.currency} 
                        isActive={currentSeason === 'winter'}
                      />
                    </TabsContent>
                  </Tabs>

                  <Tabs defaultValue="spring" className="w-full">
                    <TabsList className="w-full grid grid-cols-2">
                      <TabsTrigger value="spring">Spring</TabsTrigger>
                      <TabsTrigger value="autumn">Autumn</TabsTrigger>
                    </TabsList>
                    <TabsContent value="spring" className="pt-2">
                      <RateTable 
                        rates={tariff.scheduleData?.spring} 
                        currency={tariff.currency} 
                        isActive={currentSeason === 'spring'}
                      />
                    </TabsContent>
                    <TabsContent value="autumn" className="pt-2">
                      <RateTable 
                        rates={tariff.scheduleData?.autumn} 
                        currency={tariff.currency} 
                        isActive={currentSeason === 'autumn'}
                      />
                    </TabsContent>
                  </Tabs>
                </div>
              </div>
            )}

            {!tariff?.isTimeOfUse && !isLoading && (
              <div className="p-4 text-center">
                <p className="text-slate-500">This is a fixed-rate tariff without time-of-use pricing.</p>
                <p className="text-slate-600 font-medium mt-2">Rate: {tariff?.importRate.toFixed(2)} {tariff?.currency}/kWh</p>
                <Button variant="outline" size="sm" className="mt-4">
                  Switch to Time-of-Use Tariff
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function RateTable({ 
  rates, 
  currency,
  isActive
}: { 
  rates?: { peak: number; shoulder: number; offPeak: number }; 
  currency: string;
  isActive: boolean;
}) {
  if (!rates) return null;
  
  return (
    <div className={`text-xs space-y-1 ${isActive ? 'bg-blue-50 dark:bg-blue-900/20 p-2 rounded' : ''}`}>
      <div className="flex justify-between">
        <span>Peak:</span>
        <span className="font-medium">{rates.peak.toFixed(2)} {currency}</span>
      </div>
      <div className="flex justify-between">
        <span>Shoulder:</span>
        <span className="font-medium">{rates.shoulder.toFixed(2)} {currency}</span>
      </div>
      <div className="flex justify-between">
        <span>Off-Peak:</span>
        <span className="font-medium">{rates.offPeak.toFixed(2)} {currency}</span>
      </div>
      {isActive && (
        <div className="text-xs mt-1 text-blue-600 font-medium">Current Season</div>
      )}
    </div>
  );
}