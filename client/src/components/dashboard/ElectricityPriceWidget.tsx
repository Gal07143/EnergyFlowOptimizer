import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { formatNumber } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface ElectricityPriceWidgetProps {
  siteId: number;
  className?: string;
}

interface HourData {
  hour: number;
  time: string;
  price: number;
  isNow: boolean;
  height?: number;
}

// Israeli Time-of-Use (TOU) tariffs (prices in ILS per kWh)
const israeliTouTariffs = {
  // Summer (June-August)
  summer: {
    peak: 0.5734, // Peak: Sunday-Thursday 17:00-22:00
    shoulder: 0.4140, // Shoulder: Sunday-Thursday 7:00-17:00, 22:00-23:00
    lowLoad: 0.2809, // Low: Sunday-Thursday 23:00-7:00, Friday-Saturday all day
  },
  // Winter (December-February)
  winter: {
    peak: 0.5734, // Peak: Sunday-Thursday 17:00-22:00
    shoulder: 0.3673, // Shoulder: Sunday-Thursday 7:00-17:00, 22:00-23:00
    lowLoad: 0.2809, // Low: Sunday-Thursday 23:00-7:00, Friday-Saturday all day
  },
  // Transition (March-May, September-November)
  transition: {
    peak: 0.4756, // Peak: Sunday-Thursday 17:00-22:00
    shoulder: 0.3673, // Shoulder: Sunday-Thursday 7:00-17:00, 22:00-23:00
    lowLoad: 0.2809, // Low: Sunday-Thursday 23:00-7:00, Friday-Saturday all day
  }
};

type Season = 'summer' | 'winter' | 'transition';

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

  // Generate hourly data for the chart with Israeli TOU tariffs
  const generateHourlyData = (): HourData[] => {
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

    // Determine current season (month-based)
    const currentMonth = now.getMonth() + 1; // 1-12
    let season: Season;
    if (currentMonth >= 6 && currentMonth <= 8) {
      season = 'summer';
    } else if (currentMonth === 12 || currentMonth <= 2) {
      season = 'winter';
    } else {
      season = 'transition';
    }

    // Determine day of week (0 = Sunday, 6 = Saturday)
    const dayOfWeek = now.getDay();
    const isWeekend = dayOfWeek === 5 || dayOfWeek === 6; // Friday or Saturday

    // Apply tariffs based on season, day and hour
    hours.forEach((hourData, index) => {
      let price;
      const h = hourData.hour;

      if (isWeekend) {
        // Weekend - always low load
        price = israeliTouTariffs[season].lowLoad;
      } else {
        // Weekday
        if (h >= 17 && h < 22) {
          // Peak: 17:00-22:00
          price = israeliTouTariffs[season].peak;
        } else if ((h >= 7 && h < 17) || (h >= 22 && h < 23)) {
          // Shoulder: 7:00-17:00, 22:00-23:00
          price = israeliTouTariffs[season].shoulder;
        } else {
          // Low: 23:00-7:00
          price = israeliTouTariffs[season].lowLoad;
        }
      }

      hours[index].price = price;
    });

    return hours;
  };

  const hourlyData = generateHourlyData();
  const currentPrice = hourlyData.find(h => h.isNow)?.price || 0;
  
  // Find min and max prices for scaling
  const minPrice = Math.min(...hourlyData.map(h => h.price));
  const maxPrice = Math.max(...hourlyData.map(h => h.price));
  const priceRange = maxPrice - minPrice;

  // Process for chart
  const processForChart = (data: HourData[]): HourData[] => {
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

  // Format the current date and time for display
  const formatCurrentPeriod = () => {
    const now = new Date();
    const month = now.toLocaleString('en-US', { month: 'short' });
    const day = now.getDate();
    const hour = now.getHours();
    return `${month} ${day}, ${hour}:00-${hour}:59`;
  };

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
        <CardTitle>Israeli Electricity Tariff</CardTitle>
        <CardDescription className="flex items-center gap-1">
          <span>Current Price Period:</span>
          <span className="font-medium">{formatCurrentPeriod()}</span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-6">
          <div className="text-3xl font-bold text-primary flex items-end gap-1">
            {formatNumber(currentPrice, 2)}
            <span className="text-base font-normal text-muted-foreground ml-1">ILS/kWh</span>
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

export default ElectricityPriceWidget;