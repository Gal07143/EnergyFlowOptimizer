import { useState, useEffect } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { parseISO, format, subDays, subHours, subWeeks, subMonths, addHours } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';

interface PowerChartProps {
  mode: 'day' | 'week' | 'month';
}

interface DataPoint {
  time: string;
  solar: number;
  grid: number;
  battery: number;
  consumption: number;
}

export default function PowerChart({ mode }: PowerChartProps) {
  const [data, setData] = useState<DataPoint[]>([]);

  // Generate data based on the selected time mode
  useEffect(() => {
    const generateData = () => {
      const now = new Date();
      const dataPoints: DataPoint[] = [];
      
      let startDate: Date;
      let interval: number;
      let format_string: string;
      let points: number;
      
      switch (mode) {
        case 'day':
          startDate = subHours(now, 24);
          interval = 1; // 1 hour intervals
          format_string = 'HH:mm';
          points = 25;
          break;
        case 'week':
          startDate = subDays(now, 7);
          interval = 4; // 4 hour intervals
          format_string = 'EEE HH:mm';
          points = 42;
          break;
        case 'month':
          startDate = subMonths(now, 1);
          interval = 24; // 1 day intervals
          format_string = 'MMM dd';
          points = 31;
          break;
      }
      
      for (let i = 0; i < points; i++) {
        const time = addHours(startDate, i * interval);
        const formattedTime = format(time, format_string);
        
        // Generate some realistic-looking fluctuating energy values
        // These would come from actual API data in a real implementation
        const baseHour = time.getHours();
        const isDaytime = baseHour >= 7 && baseHour <= 19;
        
        // Solar production peaks during midday
        const solarFactor = isDaytime 
          ? Math.sin((baseHour - 7) * Math.PI / 12) * 0.8 + 0.2 
          : 0;
        
        // Generate a realistic solar curve
        const solar = isDaytime
          ? (5 + Math.random() * 2) * solarFactor
          : 0;
        
        // Consumption typically has morning and evening peaks
        const consumptionBase = 1.2;
        const morningPeak = baseHour >= 6 && baseHour <= 9 
          ? 1.5 + Math.random() * 0.5 
          : 1;
        const eveningPeak = baseHour >= 17 && baseHour <= 22 
          ? 2 + Math.random() * 1 
          : 1;
        const consumption = consumptionBase * morningPeak * eveningPeak + Math.random() * 0.5;
        
        // Battery charges during solar peak and discharges in evening
        let battery = 0;
        if (solar > consumption) {
          // Charging with excess solar
          battery = (solar - consumption) * 0.8;
        } else if (baseHour >= 18 && baseHour <= 23) {
          // Discharging in evening
          battery = -Math.min(1.5, Math.random() + 0.8);
        }
        
        // Grid = consumption - solar - battery discharge (or + battery charging)
        const grid = consumption - solar - battery;
        
        dataPoints.push({
          time: formattedTime,
          solar: parseFloat(solar.toFixed(1)),
          grid: parseFloat(grid.toFixed(1)),
          battery: parseFloat(battery.toFixed(1)),
          consumption: parseFloat(consumption.toFixed(1)),
        });
      }
      
      return dataPoints;
    };
    
    setData(generateData());
  }, [mode]);

  // Custom tooltip showing all values
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <Card className="p-2 border shadow-sm bg-background">
          <p className="text-xs font-semibold mb-1">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={`item-${index}`} className="text-xs" style={{ color: entry.color }}>
              {entry.name}: {entry.value} kW
            </p>
          ))}
        </Card>
      );
    }
    return null;
  };

  return (
    <div className="h-full w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 10, right: 30, left: 0, bottom: 5 }}
        >
          <defs>
            <linearGradient id="colorSolar" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#FCD34D" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#FCD34D" stopOpacity={0.2} />
            </linearGradient>
            <linearGradient id="colorGrid" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6B7280" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#6B7280" stopOpacity={0.2} />
            </linearGradient>
            <linearGradient id="colorBattery" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#60A5FA" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#60A5FA" stopOpacity={0.2} />
            </linearGradient>
            <linearGradient id="colorConsumption" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#F97316" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#F97316" stopOpacity={0.2} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-800" />
          <XAxis 
            dataKey="time" 
            tick={{ fontSize: 10 }} 
            tickMargin={10}
            className="text-gray-600 dark:text-gray-400"
          />
          <YAxis 
            unit=" kW" 
            tick={{ fontSize: 10 }} 
            tickMargin={10}
            className="text-gray-600 dark:text-gray-400"
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            verticalAlign="top" 
            height={36} 
            wrapperStyle={{ paddingTop: '10px' }} 
          />
          <Area 
            type="monotone" 
            dataKey="solar" 
            name="Solar" 
            stackId="1" 
            stroke="#FCD34D" 
            fill="url(#colorSolar)" 
          />
          <Area 
            type="monotone" 
            dataKey="battery" 
            name="Battery" 
            stackId="2" 
            stroke="#60A5FA" 
            fill="url(#colorBattery)" 
          />
          <Area 
            type="monotone" 
            dataKey="grid" 
            name="Grid" 
            stackId="3" 
            stroke="#6B7280" 
            fill="url(#colorGrid)" 
          />
          <Area 
            type="monotone" 
            dataKey="consumption" 
            name="Consumption" 
            stroke="#F97316" 
            fill="url(#colorConsumption)" 
            strokeDasharray="3 3"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
