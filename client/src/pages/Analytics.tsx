import { useState } from 'react';
import { useEnergyReadingsByTimeRange } from '@/hooks/useEnergyData';
import { useSiteSelector } from '@/hooks/useSiteData';
import PageHeader from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format, subDays, subMonths } from 'date-fns';
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { CalendarIcon, DownloadIcon } from 'lucide-react';
import { generateForecastData } from '@/lib/utils/energy-utils';
import ConsumptionPatterns from '@/components/analytics/ConsumptionPatterns';

export default function AnalyticsPage() {
  const { currentSiteId } = useSiteSelector();
  const [timeRange, setTimeRange] = useState('week');
  const [chartType, setChartType] = useState('consumption');
  const [view, setView] = useState<'energy' | 'patterns'>('energy');
  const [dateRange, setDateRange] = useState<{
    from: Date;
    to: Date;
  }>({
    from: subDays(new Date(), 7),
    to: new Date(),
  });

  // This would normally fetch real data from the API
  // For demo purposes, we'll use the utility function to generate realistic data
  const forecastData = generateForecastData(7);

  // Calculate key metrics
  const totalConsumption = forecastData.reduce((sum, item) => sum + item.consumption, 0);
  const totalSolarProduction = forecastData.reduce((sum, item) => sum + item.solar, 0);
  const totalGridImport = forecastData.reduce((sum, item) => {
    return sum + (item.grid > 0 ? item.grid : 0);
  }, 0);
  const totalGridExport = forecastData.reduce((sum, item) => {
    return sum + (item.grid < 0 ? Math.abs(item.grid) : 0);
  }, 0);
  
  // Calculate self-sufficiency
  const selfSufficiency = Math.min(100, Math.round((totalSolarProduction / totalConsumption) * 100));
  
  // Define interfaces for chart data
  interface DailyData {
    date: string;
    solar: number;
    consumption: number;
    grid: number;
    battery: number;
  }

  interface HourlyData {
    time: string;
    solar: number;
    consumption: number;
    grid: number;
    battery: number;
  }

  // Format data for different chart views
  const getDailyData = (): DailyData[] => {
    const dailyData: DailyData[] = [];
    const dayMap = new Map<string, DailyData>();
    
    forecastData.forEach(item => {
      const day = format(item.timestamp, 'yyyy-MM-dd');
      if (!dayMap.has(day)) {
        dayMap.set(day, {
          date: day,
          solar: 0,
          consumption: 0,
          grid: 0,
          battery: 0
        });
      }
      
      const dayData = dayMap.get(day);
      if (dayData) {
        dayData.solar += item.solar;
        dayData.consumption += item.consumption;
        dayData.grid += item.grid;
        dayData.battery += item.battery;
      }
    });
    
    dayMap.forEach(value => {
      dailyData.push({
        ...value,
        date: format(new Date(value.date), 'MMM dd'),
        solar: parseFloat(value.solar.toFixed(2)),
        consumption: parseFloat(value.consumption.toFixed(2)),
        grid: parseFloat(value.grid.toFixed(2)),
        battery: parseFloat(value.battery.toFixed(2)),
      });
    });
    
    return dailyData;
  };
  
  // Create hourly data view
  const getHourlyData = (): HourlyData[] => {
    return forecastData.map(item => ({
      time: format(item.timestamp, 'HH:mm'),
      solar: item.solar,
      consumption: item.consumption,
      grid: item.grid,
      battery: item.battery,
    }));
  };
  
  // Handle date range changes
  const handleDateRangeChange = (range: { from?: Date; to?: Date }) => {
    if (range.from && range.to) {
      setDateRange({ from: range.from, to: range.to });
      
      // This would normally trigger a data refetch with the new range
    }
  };
  
  // Generate component by chart type
  const renderChart = () => {
    const data = timeRange === 'day' ? getHourlyData() : getDailyData();
    
    switch (chartType) {
      case 'consumption': 
        return (
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
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
                dataKey={timeRange === 'day' ? 'time' : 'date'} 
                tick={{ fontSize: 12 }} 
                className="text-gray-600 dark:text-gray-400"
              />
              <YAxis 
                unit=" kWh" 
                tick={{ fontSize: 12 }} 
                className="text-gray-600 dark:text-gray-400"
              />
              <Tooltip />
              <Legend />
              <Area 
                type="monotone" 
                dataKey="solar" 
                name="Solar" 
                stroke="#FCD34D" 
                fill="url(#colorSolar)" 
              />
              <Area 
                type="monotone" 
                dataKey="consumption" 
                name="Consumption" 
                stroke="#F97316" 
                fill="url(#colorConsumption)" 
              />
              <Area 
                type="monotone" 
                dataKey="grid" 
                name="Grid" 
                stroke="#6B7280" 
                fill="url(#colorGrid)" 
              />
              <Area 
                type="monotone" 
                dataKey="battery" 
                name="Battery" 
                stroke="#60A5FA" 
                fill="url(#colorBattery)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        );
        
      case 'production':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-800" />
              <XAxis 
                dataKey={timeRange === 'day' ? 'time' : 'date'} 
                tick={{ fontSize: 12 }} 
                className="text-gray-600 dark:text-gray-400"
              />
              <YAxis 
                unit=" kWh" 
                tick={{ fontSize: 12 }} 
                className="text-gray-600 dark:text-gray-400"
              />
              <Tooltip />
              <Legend />
              <Bar dataKey="solar" name="Solar" fill="#FCD34D" />
              <Bar dataKey="battery" name="Battery" fill="#60A5FA" />
            </BarChart>
          </ResponsiveContainer>
        );
        
      case 'grid':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-800" />
              <XAxis 
                dataKey={timeRange === 'day' ? 'time' : 'date'} 
                tick={{ fontSize: 12 }} 
                className="text-gray-600 dark:text-gray-400"
              />
              <YAxis 
                unit=" kWh" 
                tick={{ fontSize: 12 }} 
                className="text-gray-600 dark:text-gray-400"
              />
              <Tooltip />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="grid" 
                name="Grid" 
                stroke="#6B7280" 
                strokeWidth={2} 
                dot={{ r: 3 }} 
              />
              <Line 
                type="monotone" 
                dataKey="consumption" 
                name="Consumption" 
                stroke="#F97316" 
                strokeWidth={2} 
                dot={{ r: 3 }} 
              />
            </LineChart>
          </ResponsiveContainer>
        );
    }
  };

  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8">
      <PageHeader title="Analytics" subtitle="Visualize and analyze your energy data">
        <div className="flex space-x-2">
          <Tabs value={view} onValueChange={(v) => setView(v as 'energy' | 'patterns')} className="mr-4">
            <TabsList>
              <TabsTrigger value="energy">Energy Data</TabsTrigger>
              <TabsTrigger value="patterns">Consumption Patterns</TabsTrigger>
            </TabsList>
          </Tabs>
          
          {view === 'energy' && (
            <>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4" />
                    <span>
                      {format(dateRange.from, 'MMM dd')} - {format(dateRange.to, 'MMM dd')}
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    mode="range"
                    selected={dateRange}
                    onSelect={(range) => handleDateRangeChange(range || { from: dateRange.from, to: dateRange.to })}
                    disabled={(date) => date > new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              
              <Button variant="outline">
                <DownloadIcon className="mr-2 h-4 w-4" />
                Export
              </Button>
            </>
          )}
        </div>
      </PageHeader>

      {view === 'energy' ? (
        <>
          {/* Key Metrics */}
          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Total Consumption
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalConsumption.toFixed(1)} kWh</div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  For selected period
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Solar Production
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalSolarProduction.toFixed(1)} kWh</div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  For selected period
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Self-Sufficiency
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{selfSufficiency}%</div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Energy independence
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Grid Exchange
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between">
                  <div>
                    <div className="text-sm font-medium">Import</div>
                    <div className="text-lg font-bold">{totalGridImport.toFixed(1)} kWh</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium">Export</div>
                    <div className="text-lg font-bold">{totalGridExport.toFixed(1)} kWh</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Chart Controls */}
          <div className="mt-6 flex flex-col sm:flex-row justify-between gap-4">
            <Tabs value={chartType} onValueChange={setChartType}>
              <TabsList>
                <TabsTrigger value="consumption">Consumption</TabsTrigger>
                <TabsTrigger value="production">Production</TabsTrigger>
                <TabsTrigger value="grid">Grid Exchange</TabsTrigger>
              </TabsList>
            </Tabs>
            
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select time range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Day</SelectItem>
                <SelectItem value="week">Week</SelectItem>
                <SelectItem value="month">Month</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Chart */}
          <Card className="mt-4">
            <CardContent className="pt-6">
              {renderChart()}
            </CardContent>
          </Card>
        </>
      ) : (
        <div className="mt-6">
          <ConsumptionPatterns />
        </div>
      )}
    </div>
  );
}
