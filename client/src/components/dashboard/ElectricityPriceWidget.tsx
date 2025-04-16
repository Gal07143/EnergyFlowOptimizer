import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { formatNumber, formatTime } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface ElectricityPriceWidgetProps {
  siteId: number;
  className?: string;
}

const ElectricityPriceWidget: React.FC<ElectricityPriceWidgetProps> = ({ siteId, className }) => {
  // Fetch electricity prices
  const { data: priceData, isLoading } = useQuery({
    queryKey: ['/api/sites', siteId, 'tariffs'],
    queryFn: async () => {
      const res = await fetch(`/api/sites/${siteId}/tariffs`);
      if (!res.ok) throw new Error('Failed to fetch electricity price data');
      return await res.json();
    },
    enabled: !!siteId,
    refetchInterval: 300000 // Refresh every 5 minutes
  });

  // Generate hourly data for the chart
  const generateHourlyData = () => {
    const now = new Date();
    const currentHour = now.getHours();
    const hours = Array.from({ length: 24 }, (_, i) => {
      const hour = (i + currentHour) % 24;
      return {
        hour,
        time: `${hour}:00`,
        price: 0,
        isNow: i === 0,
      };
    });

    // If we have price data, fill it in
    if (priceData && priceData.length > 0) {
      const currentTariff = priceData[0]; // Assuming first tariff is active
      
      // Simple logic to generate variable prices
      hours.forEach((hour, index) => {
        let basePrice = currentTariff.baseRate || 0.15;
        
        // Morning peak (7-9 AM)
        if (hour.hour >= 7 && hour.hour <= 9) {
          basePrice *= 1.4;
        }
        // Evening peak (18-21)
        else if (hour.hour >= 18 && hour.hour <= 21) {
          basePrice *= 1.5;
        }
        // Night discount (23-5)
        else if (hour.hour >= 23 || hour.hour <= 5) {
          basePrice *= 0.7;
        }
        
        // Add some randomness
        const randomFactor = 0.95 + Math.random() * 0.1;
        hours[index].price = basePrice * randomFactor;
      });
    }

    return hours;
  };

  const hourlyData = generateHourlyData();
  const currentPrice = hourlyData.find(h => h.isNow)?.price || 0;
  
  // Find min and max prices for scaling
  const minPrice = Math.min(...hourlyData.map(h => h.price));
  const maxPrice = Math.max(...hourlyData.map(h => h.price));
  const priceRange = maxPrice - minPrice;

  // Process for chart
  const processForChart = (data: typeof hourlyData) => {
    return data.map(hour => {
      // Calculate height percentage
      const heightPercent = priceRange > 0 
        ? ((hour.price - minPrice) / priceRange) * 70 + 10 // Range from 10% to 80% height
        : 40; // Default if no range
      
      return {
        ...hour,
        height: heightPercent,
      };
    });
  };

  const chartData = processForChart(hourlyData);

  // Find the current time marker position
  const nowIndex = hourlyData.findIndex(h => h.isNow);
  const nowPosition = nowIndex >= 0 ? (nowIndex / (hourlyData.length - 1)) * 100 : 50;

  if (isLoading) {
    return (
      <Card className={cn("w-full", className)}>
        <CardHeader>
          <CardTitle>
            <Skeleton className="h-6 w-48" />
          </CardTitle>
          <CardDescription>
            <Skeleton className="h-4 w-36" />
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-2">
        <CardTitle>Dynamic electricity price</CardTitle>
        <CardDescription className="flex items-center gap-1">
          <span>Current Price Period:</span>
          <span className="font-medium">Apr 4, 16:00-16:59</span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-6">
          <div className="text-3xl font-bold text-primary flex items-end gap-1">
            {formatNumber(currentPrice, 2)}
            <span className="text-base font-normal text-muted-foreground ml-1">ct/kWh</span>
          </div>
        </div>

        <div className="relative mt-8 h-40">
          {/* Chart */}
          <div className="absolute inset-0 flex items-end justify-between px-1">
            {chartData.map((hour, i) => (
              <div key={i} className="flex flex-col items-center gap-1 relative z-10" style={{ width: `${100 / chartData.length}%` }}>
                <div 
                  className={cn(
                    "w-[90%] rounded-sm transition-all",
                    hour.isNow ? "bg-primary" : "bg-primary/30"
                  )} 
                  style={{ height: `${hour.height}%` }}
                ></div>
                {i % 3 === 0 && (
                  <div className="text-xs text-muted-foreground">
                    {hour.hour}:00
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Average line */}
          <div 
            className="absolute border-t border-dashed border-gray-400 w-full z-0" 
            style={{ top: '50%' }}
          ></div>

          {/* Current time marker */}
          <div 
            className="absolute w-0.5 h-[85%] bg-primary top-0 z-0"
            style={{ left: `${nowPosition}%` }}
          ></div>
          
          {/* Time labels */}
          <div className="absolute bottom-0 left-0 w-full flex justify-between text-xs text-muted-foreground">
            <span>Today</span>
            <span>Tomorrow</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ElectricityPriceWidget;