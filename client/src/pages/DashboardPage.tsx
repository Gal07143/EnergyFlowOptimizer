import React from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import { 
  Battery, 
  Zap, 
  SunIcon, 
  Home, 
  ChevronDown, 
  ChevronUp, 
  CloudSun, 
  Plug, 
  PlugZap, 
  BarChart2, 
  ArrowRight, 
  ChevronRight, 
  Clock, 
  Package2, 
  AlertCircle,
  Activity,
  ExternalLink,
  GanttChart,
  Scale
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { format, subDays } from 'date-fns';
import { useSiteContext } from '@/hooks/use-site-context';
import RealTimeEnergyFlow from '@/components/dashboard/RealTimeEnergyFlow';

// Sample energy consumption data for the chart
const generateEnergyConsumptionData = () => {
  const data = [];
  const now = new Date();
  
  for (let i = 6; i >= 0; i--) {
    const date = subDays(now, i);
    
    // Generate random but somewhat realistic values
    // Weekend vs weekday patterns
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    
    data.push({
      date: format(date, 'MM/dd'),
      consumption: isWeekend ? 12 + Math.random() * 5 : 15 + Math.random() * 8,
      generation: isWeekend ? 10 + Math.random() * 6 : 9 + Math.random() * 7,
      net: isWeekend ? -2 + Math.random() * 4 : 6 + Math.random() * 3,
    });
  }
  
  return data;
};

// Sample forecast data
const generateForecastData = () => {
  const data = [];
  const now = new Date();
  
  for (let i = 0; i < 24; i += 3) {
    const time = new Date(now.getTime() + i * 3600000);
    const hour = time.getHours();
    
    // Weather conditions based on time of day
    let weather = 'sunny';
    let temp = 0;
    
    if (hour >= 6 && hour < 12) {
      // Morning - likely sunny
      weather = Math.random() > 0.7 ? 'partly-cloudy' : 'sunny';
      temp = 15 + Math.random() * 5;
    } else if (hour >= 12 && hour < 18) {
      // Afternoon - could be anything
      const rand = Math.random();
      if (rand < 0.5) weather = 'sunny';
      else if (rand < 0.8) weather = 'partly-cloudy';
      else weather = 'cloudy';
      temp = 18 + Math.random() * 8;
    } else if (hour >= 18 && hour < 22) {
      // Evening - cooling down
      weather = Math.random() > 0.6 ? 'cloudy' : 'partly-cloudy';
      temp = 14 + Math.random() * 4;
    } else {
      // Night - cooler
      weather = 'clear-night';
      temp = 10 + Math.random() * 4;
    }
    
    data.push({
      time: format(time, 'HH:mm'),
      hour: hour,
      weather: weather,
      temperature: Math.round(temp),
      solarPotential: hour >= 7 && hour <= 19 ? Math.round((1 - Math.abs(hour - 13) / 10) * 100) : 0
    });
  }
  
  return data;
};

// Sample device status data
const deviceStatusData = [
  { id: 1, name: 'Solar PV System', type: 'solar', status: 'online', value: '4.2 kW', trend: 'up' },
  { id: 2, name: 'Home Battery', type: 'battery', status: 'charging', value: '78%', trend: 'up' },
  { id: 3, name: 'EV Charger', type: 'ev', status: 'standby', value: '0 kW', trend: 'neutral' },
  { id: 4, name: 'Smart Meter', type: 'meter', status: 'online', value: '2.1 kW', trend: 'down' },
  { id: 5, name: 'Heat Pump', type: 'heat', status: 'online', value: '1.2 kW', trend: 'up' }
];

// Energy event data
const energyEvents = [
  { 
    id: 1, 
    title: 'Peak Demand Response Event', 
    type: 'vpp',
    status: 'upcoming',
    startTime: format(new Date(new Date().getTime() + 2 * 60 * 60 * 1000), 'HH:mm'),
    duration: '3 hours',
    reward: '$12.50'
  },
  { 
    id: 2, 
    title: 'High Solar Generation Alert', 
    type: 'alert',
    status: 'active',
    startTime: 'Now',
    message: 'Excess solar power available. Consider running appliances.'
  },
  { 
    id: 3, 
    title: 'Scheduled EV Charging', 
    type: 'scheduled',
    status: 'upcoming',
    startTime: '23:00',
    duration: '4 hours',
    details: 'Charge to 80%'
  },
  { 
    id: 4, 
    title: 'Tariff Change', 
    type: 'info',
    status: 'upcoming',
    startTime: '00:00',
    message: 'Switching to off-peak rate ($0.08/kWh)'
  }
];

// Energy stats
const energyStats = {
  dailyGeneration: 24.5,
  dailyConsumption: 18.7,
  monthlySavings: 127.80,
  selfConsumptionRate: 72,
  carbonOffset: 8.4,
  peakReduction: 35
};

export default function DashboardPage() {
  const { currentSiteId } = useSiteContext();
  const [, navigate] = useLocation();
  const energyConsumptionData = generateEnergyConsumptionData();
  const forecastData = generateForecastData();
  
  // Get device icon based on type
  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'solar':
        return <SunIcon className="h-5 w-5 text-yellow-500" />;
      case 'battery':
        return <Battery className="h-5 w-5 text-green-500" />;
      case 'ev':
        return <PlugZap className="h-5 w-5 text-blue-500" />;
      case 'meter':
        return <Activity className="h-5 w-5 text-purple-500" />;
      case 'heat':
        return <Zap className="h-5 w-5 text-red-500" />;
      default:
        return <Package2 className="h-5 w-5 text-gray-500" />;
    }
  };
  
  // Get trend icon based on direction
  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <ChevronUp className="h-4 w-4 text-green-500" />;
      case 'down':
        return <ChevronDown className="h-4 w-4 text-red-500" />;
      default:
        return <div className="h-4 w-4" />; // Empty placeholder for neutral
    }
  };
  
  // Get event icon based on type
  const getEventIcon = (type: string) => {
    switch (type) {
      case 'vpp':
        return <Zap className="h-5 w-5 text-blue-500" />;
      case 'alert':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case 'scheduled':
        return <Clock className="h-5 w-5 text-green-500" />;
      default:
        return <Activity className="h-5 w-5 text-gray-500" />;
    }
  };
  
  // Get status badge for event
  const getEventStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default">Active</Badge>;
      case 'upcoming':
        return <Badge variant="outline">Upcoming</Badge>;
      default:
        return <Badge variant="secondary">Completed</Badge>;
    }
  };
  
  return (
    <div className="container py-6 px-4">
      <div className="flex flex-col space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-3 md:space-y-0 pb-2 border-b">
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
              Dashboard
            </h1>
            <p className="text-muted-foreground mt-1">Real-time overview of your energy system's performance and status</p>
          </div>
          <div className="flex items-center space-x-2">
            <Button 
              variant="outline" 
              className="rounded-full font-medium" 
              size="sm"
            >
              Today
            </Button>
            <Button 
              variant="outline" 
              className="rounded-full font-medium" 
              size="sm"
            >
              Week
            </Button>
            <Button 
              variant="default" 
              className="rounded-full font-medium bg-primary/90 hover:bg-primary shadow-sm" 
              size="sm"
            >
              Month
            </Button>
            <Button 
              variant="outline" 
              className="rounded-full font-medium" 
              size="sm"
            >
              Year
            </Button>
          </div>
        </div>
        
        {/* Key stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-5">
          <Card className="overflow-hidden border-none shadow-md shadow-yellow-100 dark:shadow-yellow-900/10">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-400 to-yellow-500"></div>
            <CardContent className="p-4 pt-6">
              <div className="flex flex-col items-center text-center space-y-3">
                <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-full p-2.5">
                  <SunIcon className="h-6 w-6 text-yellow-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Today's Generation</p>
                  <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{energyStats.dailyGeneration} kWh</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="overflow-hidden border-none shadow-md shadow-purple-100 dark:shadow-purple-900/10">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-400 to-purple-500"></div>
            <CardContent className="p-4 pt-6">
              <div className="flex flex-col items-center text-center space-y-3">
                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-full p-2.5">
                  <Home className="h-6 w-6 text-purple-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Today's Consumption</p>
                  <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{energyStats.dailyConsumption} kWh</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="overflow-hidden border-none shadow-md shadow-green-100 dark:shadow-green-900/10">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-400 to-green-500"></div>
            <CardContent className="p-4 pt-6">
              <div className="flex flex-col items-center text-center space-y-3">
                <div className="bg-green-50 dark:bg-green-900/20 rounded-full p-2.5">
                  <Zap className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Self-Consumption</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">{energyStats.selfConsumptionRate}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="overflow-hidden border-none shadow-md shadow-blue-100 dark:shadow-blue-900/10">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-blue-500"></div>
            <CardContent className="p-4 pt-6">
              <div className="flex flex-col items-center text-center space-y-3">
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-full p-2.5">
                  <Scale className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Monthly Savings</p>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">${energyStats.monthlySavings}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="overflow-hidden border-none shadow-md shadow-orange-100 dark:shadow-orange-900/10">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-400 to-orange-500"></div>
            <CardContent className="p-4 pt-6">
              <div className="flex flex-col items-center text-center space-y-3">
                <div className="bg-orange-50 dark:bg-orange-900/20 rounded-full p-2.5">
                  <GanttChart className="h-6 w-6 text-orange-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Peak Reduction</p>
                  <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{energyStats.peakReduction}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="overflow-hidden border-none shadow-md shadow-teal-100 dark:shadow-teal-900/10">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-teal-400 to-teal-500"></div>
            <CardContent className="p-4 pt-6">
              <div className="flex flex-col items-center text-center space-y-3">
                <div className="bg-teal-50 dark:bg-teal-900/20 rounded-full p-2.5">
                  <CloudSun className="h-6 w-6 text-teal-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Carbon Offset</p>
                  <p className="text-2xl font-bold text-teal-600 dark:text-teal-400">{energyStats.carbonOffset} kg</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Main content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Energy consumption chart */}
          <Card className="lg:col-span-2 overflow-hidden border-none shadow-lg">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/80 to-primary"></div>
            <CardHeader className="pb-2 pt-6">
              <CardTitle className="text-xl flex items-center font-bold">
                <Activity className="h-5 w-5 mr-2 text-primary" />
                <span className="bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                  Energy Overview
                </span>
              </CardTitle>
              <CardDescription className="text-sm">
                7-day energy generation, consumption, and net import/export
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="energy">
                <TabsList className="w-full grid grid-cols-3 rounded-full p-1 bg-muted/50">
                  <TabsTrigger value="energy" className="rounded-full data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary/90 data-[state=active]:to-primary data-[state=active]:text-white">Energy</TabsTrigger>
                  <TabsTrigger value="cost" className="rounded-full data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary/90 data-[state=active]:to-primary data-[state=active]:text-white">Cost</TabsTrigger>
                  <TabsTrigger value="emissions" className="rounded-full data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary/90 data-[state=active]:to-primary data-[state=active]:text-white">Emissions</TabsTrigger>
                </TabsList>
                
                <TabsContent value="energy" className="pt-4">
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={energyConsumptionData}
                        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis 
                          dataKey="date"
                          tick={{ fontSize: 12 }}
                        />
                        <YAxis 
                          tick={{ fontSize: 12 }}
                          label={{ value: 'Energy (kWh)', angle: -90, position: 'insideLeft', dx: -10 }}
                        />
                        <Tooltip 
                          formatter={(value, name) => [
                            `${value} kWh`,
                            name === 'consumption' ? 'Consumption' : 
                            name === 'generation' ? 'Generation' : 'Net Grid'
                          ]}
                          labelFormatter={(label) => `Date: ${label}`}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="consumption" 
                          stackId="1"
                          stroke="#8b5cf6" 
                          fill="#c4b5fd" 
                          name="Consumption"
                        />
                        <Area 
                          type="monotone" 
                          dataKey="generation" 
                          stroke="#22c55e" 
                          fill="#bbf7d0" 
                          name="Generation"
                        />
                        <Area 
                          type="monotone" 
                          dataKey="net" 
                          stroke="#3b82f6" 
                          fill="#bfdbfe" 
                          fillOpacity={0.5}
                          name="Net Grid"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 pt-4">
                    <div className="bg-muted/50 p-3 rounded-lg">
                      <div className="text-xs text-muted-foreground">Daily Generation</div>
                      <div className="flex items-center justify-between">
                        <div className="text-2xl font-semibold">{energyStats.dailyGeneration} kWh</div>
                        <SunIcon className="h-8 w-8 text-yellow-500" />
                      </div>
                    </div>
                    <div className="bg-muted/50 p-3 rounded-lg">
                      <div className="text-xs text-muted-foreground">Daily Consumption</div>
                      <div className="flex items-center justify-between">
                        <div className="text-2xl font-semibold">{energyStats.dailyConsumption} kWh</div>
                        <Home className="h-8 w-8 text-purple-500" />
                      </div>
                    </div>
                    <div className="bg-muted/50 p-3 rounded-lg">
                      <div className="text-xs text-muted-foreground">Self-Consumption</div>
                      <div className="flex items-center justify-between">
                        <div className="text-2xl font-semibold">{energyStats.selfConsumptionRate}%</div>
                        <Zap className="h-8 w-8 text-green-500" />
                      </div>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="cost" className="pt-4">
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={energyConsumptionData.map(d => ({
                          ...d,
                          importCost: Math.max(0, d.net) * 0.15,
                          exportSavings: Math.max(0, -d.net) * 0.08,
                          totalCost: Math.max(0, d.net) * 0.15 - Math.max(0, -d.net) * 0.08
                        }))}
                        margin={{ top: 5, right: 5, left: 0, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis 
                          dataKey="date"
                          tick={{ fontSize: 12 }}
                        />
                        <YAxis 
                          tick={{ fontSize: 12 }}
                          label={{ value: 'Cost ($)', angle: -90, position: 'insideLeft', dx: -10 }}
                        />
                        <Tooltip 
                          formatter={(value) => [`$${typeof value === 'number' ? value.toFixed(2) : value}`, '']}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="importCost" 
                          stackId="1"
                          stroke="#ef4444" 
                          fill="#fca5a5" 
                          name="Grid Import Cost"
                        />
                        <Area 
                          type="monotone" 
                          dataKey="exportSavings" 
                          stackId="2"
                          stroke="#22c55e" 
                          fill="#86efac" 
                          name="Grid Export Savings"
                        />
                        <Line 
                          type="monotone" 
                          dataKey="totalCost" 
                          stroke="#3b82f6" 
                          strokeWidth={2}
                          name="Net Cost"
                          dot={{ strokeWidth: 2, r: 4 }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </TabsContent>
                
                <TabsContent value="emissions" className="pt-4">
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={energyConsumptionData.map(d => ({
                          ...d,
                          emissions: Math.max(0, d.net) * 0.4, // 0.4 kg CO2/kWh
                          avoided: Math.max(0, d.generation) * 0.4,
                        }))}
                        margin={{ top: 5, right: 5, left: 0, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis 
                          dataKey="date"
                          tick={{ fontSize: 12 }}
                        />
                        <YAxis 
                          tick={{ fontSize: 12 }}
                          label={{ value: 'CO2 (kg)', angle: -90, position: 'insideLeft', dx: -10 }}
                        />
                        <Tooltip 
                          formatter={(value) => [`${typeof value === 'number' ? value.toFixed(2) : value} kg`, '']}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="emissions" 
                          stroke="#ef4444" 
                          fill="#fca5a5" 
                          name="CO2 Emissions"
                        />
                        <Area 
                          type="monotone" 
                          dataKey="avoided" 
                          stroke="#22c55e" 
                          fill="#86efac" 
                          name="CO2 Avoided"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
          
          {/* Weather forecast */}
          <Card className="overflow-hidden border-none shadow-lg">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-sky-500"></div>
            <CardHeader className="pb-2 pt-6">
              <CardTitle className="text-xl flex items-center font-bold">
                <CloudSun className="h-5 w-5 mr-2 text-sky-500" />
                <span className="bg-gradient-to-r from-blue-500 to-sky-500 bg-clip-text text-transparent">
                  Weather & Generation
                </span>
              </CardTitle>
              <CardDescription className="text-sm">
                24-hour weather and solar generation forecast
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-5">
                {/* Current weather - first item in forecast */}
                <div className="bg-gradient-to-br from-sky-100 to-blue-50 dark:from-sky-900/20 dark:to-blue-900/10 rounded-xl p-5 flex items-center justify-between shadow-sm">
                  <div>
                    <div className="text-sm font-medium text-sky-700 dark:text-sky-300">Current Weather</div>
                    <div className="text-3xl font-bold text-slate-800 dark:text-white">{forecastData[0].temperature}°C</div>
                    <div className="text-sm font-medium text-slate-600 dark:text-slate-300 capitalize mt-1">{forecastData[0].weather.replace('-', ' ')}</div>
                  </div>
                  <div className="text-5xl">
                    {forecastData[0].weather === 'sunny' && '☀️'}
                    {forecastData[0].weather === 'partly-cloudy' && '⛅'}
                    {forecastData[0].weather === 'cloudy' && '☁️'}
                    {forecastData[0].weather === 'rain' && '🌧️'}
                    {forecastData[0].weather === 'clear-night' && '🌙'}
                  </div>
                </div>
                
                {/* Hourly forecast */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Hourly Forecast</h3>
                  <div className="grid grid-cols-3 gap-2">
                    {forecastData.slice(1, 7).map((forecast, i) => (
                      <div 
                        key={i} 
                        className="text-center bg-gradient-to-b from-white to-sky-50 dark:from-slate-800 dark:to-slate-800/70 rounded-lg p-3 shadow-sm border border-slate-100 dark:border-slate-700"
                      >
                        <div className="text-xs font-medium text-slate-500 dark:text-slate-400">{forecast.time}</div>
                        <div className="text-xl my-2">
                          {forecast.weather === 'sunny' && '☀️'}
                          {forecast.weather === 'partly-cloudy' && '⛅'}
                          {forecast.weather === 'cloudy' && '☁️'}
                          {forecast.weather === 'rain' && '🌧️'}
                          {forecast.weather === 'clear-night' && '🌙'}
                        </div>
                        <div className="text-sm font-bold text-slate-700 dark:text-white">{forecast.temperature}°C</div>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Solar potential */}
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Solar Generation Potential</h3>
                    <div className="text-sm font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded-full">
                      {forecastData[0].solarPotential}% Today
                    </div>
                  </div>
                  <div className="w-full h-28 bg-gradient-to-b from-amber-50/50 to-transparent dark:from-amber-900/10 dark:to-transparent rounded-lg p-3">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={forecastData}
                        margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient id="solarGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.1}/>
                          </linearGradient>
                        </defs>
                        <Area 
                          type="monotone" 
                          dataKey="solarPotential" 
                          stroke="#f59e0b" 
                          strokeWidth={2}
                          fill="url(#solarGradient)" 
                        />
                        <XAxis 
                          dataKey="time"
                          tick={{ fontSize: 10 }}
                          interval={1}
                          tickLine={false}
                          axisLine={false}
                        />
                        <Tooltip 
                          formatter={(value) => [`${value}%`, 'Solar Potential']}
                          contentStyle={{
                            borderRadius: '8px',
                            border: 'none',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                          }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                
                <Button variant="outline" className="w-full">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Full Forecast
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Real-time energy flow visualization */}
        <div className="w-full lg:px-2">
          <div className="flex flex-col gap-2">
            <RealTimeEnergyFlow />
            <div className="flex justify-end">
              <Button 
                variant="outline" 
                size="sm" 
                className="text-xs"
                onClick={() => navigate('/energy-flow-heatmap')}
              >
                <Activity className="h-4 w-4 mr-1" />
                View Interactive Energy Flow Heatmap
              </Button>
            </div>
          </div>
        </div>
        
        {/* Bottom row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Device status */}
          <Card className="overflow-hidden border-none shadow-lg">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-violet-400 to-purple-500"></div>
            <CardHeader className="pb-2 pt-6">
              <CardTitle className="text-xl flex items-center font-bold">
                <Plug className="h-5 w-5 mr-2 text-violet-500" />
                <span className="bg-gradient-to-r from-violet-500 to-purple-500 bg-clip-text text-transparent">
                  Device Status
                </span>
              </CardTitle>
              <CardDescription className="text-sm">
                Current status of your connected devices
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {deviceStatusData.map((device) => (
                  <div 
                    key={device.id} 
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border-b last:border-0 last:pb-0"
                  >
                    <div className="flex items-center">
                      <div className="flex items-center justify-center h-9 w-9 rounded-full bg-violet-50 dark:bg-violet-900/20">
                        {getDeviceIcon(device.type)}
                      </div>
                      <div className="ml-3">
                        <div className="font-medium">{device.name}</div>
                        <div className="text-xs text-muted-foreground capitalize flex items-center mt-0.5">
                          <div className={cn(
                            "h-1.5 w-1.5 rounded-full mr-1",
                            device.status === 'online' ? "bg-green-500" : 
                            device.status === 'offline' ? "bg-red-500" : 
                            device.status === 'standby' ? "bg-amber-500" : "bg-slate-400"
                          )}></div>
                          {device.status}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-800 rounded-full px-3 py-1">
                      <span className="font-semibold text-sm">{device.value}</span>
                      {getTrendIcon(device.trend)}
                    </div>
                  </div>
                ))}
                
                <Button variant="outline" className="w-full">
                  <ArrowRight className="h-4 w-4 mr-2" />
                  View All Devices
                </Button>
              </div>
            </CardContent>
          </Card>
          
          {/* Energy events */}
          <Card className="overflow-hidden border-none shadow-lg">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-400 to-rose-500"></div>
            <CardHeader className="pb-2 pt-6">
              <CardTitle className="text-xl flex items-center font-bold">
                <Clock className="h-5 w-5 mr-2 text-orange-500" />
                <span className="bg-gradient-to-r from-orange-500 to-rose-500 bg-clip-text text-transparent">
                  Energy Events
                </span>
              </CardTitle>
              <CardDescription className="text-sm">
                Upcoming and active energy events
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-5">
                {energyEvents.map((event) => (
                  <div 
                    key={event.id} 
                    className="flex items-start space-x-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border-b last:border-0 last:pb-0"
                  >
                    <div className="flex-shrink-0">
                      <div className={cn(
                        "flex items-center justify-center h-10 w-10 rounded-full",
                        event.type === 'demand_response' ? "bg-orange-50 dark:bg-orange-900/20" :
                        event.type === 'peak_shaving' ? "bg-red-50 dark:bg-red-900/20" :
                        event.type === 'grid_support' ? "bg-blue-50 dark:bg-blue-900/20" :
                        "bg-slate-50 dark:bg-slate-800"
                      )}>
                        {getEventIcon(event.type)}
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <div className="font-semibold">{event.title}</div>
                        <div className="flex-shrink-0">
                          {getEventStatusBadge(event.status)}
                        </div>
                      </div>
                      <div className="flex items-center text-xs text-slate-500 dark:text-slate-400 mt-1">
                        <Clock className="h-3 w-3 mr-1" />
                        Starts: {event.startTime} {event.duration && `• Duration: ${event.duration}`}
                      </div>
                      {event.message && (
                        <div className="text-sm mt-2 text-slate-700 dark:text-slate-300">{event.message}</div>
                      )}
                      {event.reward && (
                        <div className="text-sm bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 font-medium mt-2 px-2 py-1 rounded-md inline-block">
                          <span className="flex items-center">
                            <DollarSign className="h-3.5 w-3.5 mr-1" />
                            Reward: {event.reward}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                
                <Button variant="outline" className="w-full">
                  <ArrowRight className="h-4 w-4 mr-2" />
                  View All Events
                </Button>
              </div>
            </CardContent>
          </Card>
          
          {/* Optimization recommendations */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center">
                <Zap className="h-5 w-5 mr-2 text-primary" />
                Optimization Insights
              </CardTitle>
              <CardDescription>
                AI-powered energy optimization recommendations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="rounded-lg bg-muted/50 p-4">
                  <div className="flex items-start space-x-3">
                    <div className="mt-0.5">
                      <Battery className="h-5 w-5 text-green-500" />
                    </div>
                    <div>
                      <div className="font-medium">Battery Charging Optimization</div>
                      <div className="text-sm mt-1">
                        Charge your battery during off-peak hours (12AM-5AM) to save $2.50/day.
                      </div>
                      <Button size="sm" className="mt-2">Apply</Button>
                    </div>
                  </div>
                </div>
                
                <div className="rounded-lg bg-muted/50 p-4">
                  <div className="flex items-start space-x-3">
                    <div className="mt-0.5">
                      <PlugZap className="h-5 w-5 text-blue-500" />
                    </div>
                    <div>
                      <div className="font-medium">EV Charging Schedule</div>
                      <div className="text-sm mt-1">
                        Schedule EV charging from 1AM-5AM to utilize excess solar stored in battery.
                      </div>
                      <Button size="sm" className="mt-2">Apply</Button>
                    </div>
                  </div>
                </div>
                
                <div className="rounded-lg bg-muted/50 p-4">
                  <div className="flex items-start space-x-3">
                    <div className="mt-0.5">
                      <SunIcon className="h-5 w-5 text-yellow-500" />
                    </div>
                    <div>
                      <div className="font-medium">Solar Export Limit</div>
                      <div className="text-sm mt-1">
                        Adjust solar export limit to 3.5kW to optimize grid feed-in tariff.
                      </div>
                      <Button size="sm" className="mt-2">Apply</Button>
                    </div>
                  </div>
                </div>
                
                <Button variant="outline" className="w-full">
                  <ArrowRight className="h-4 w-4 mr-2" />
                  View All Insights
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}