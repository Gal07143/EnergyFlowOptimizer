import React from 'react';
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
      <div className="flex flex-col space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-2 md:space-y-0">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">Overview of your energy system's performance and status</p>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline">Today</Button>
            <Button variant="outline">Week</Button>
            <Button variant="outline">Month</Button>
            <Button variant="outline">Year</Button>
          </div>
        </div>
        
        {/* Key stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col items-center text-center space-y-2">
                <SunIcon className="h-8 w-8 text-yellow-500" />
                <p className="text-sm text-muted-foreground">Today's Generation</p>
                <p className="text-2xl font-bold">{energyStats.dailyGeneration} kWh</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col items-center text-center space-y-2">
                <Home className="h-8 w-8 text-purple-500" />
                <p className="text-sm text-muted-foreground">Today's Consumption</p>
                <p className="text-2xl font-bold">{energyStats.dailyConsumption} kWh</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col items-center text-center space-y-2">
                <Zap className="h-8 w-8 text-green-500" />
                <p className="text-sm text-muted-foreground">Self-Consumption</p>
                <p className="text-2xl font-bold">{energyStats.selfConsumptionRate}%</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col items-center text-center space-y-2">
                <Scale className="h-8 w-8 text-blue-500" />
                <p className="text-sm text-muted-foreground">Monthly Savings</p>
                <p className="text-2xl font-bold">${energyStats.monthlySavings}</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col items-center text-center space-y-2">
                <GanttChart className="h-8 w-8 text-orange-500" />
                <p className="text-sm text-muted-foreground">Peak Reduction</p>
                <p className="text-2xl font-bold">{energyStats.peakReduction}%</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col items-center text-center space-y-2">
                <CloudSun className="h-8 w-8 text-teal-500" />
                <p className="text-sm text-muted-foreground">Carbon Offset</p>
                <p className="text-2xl font-bold">{energyStats.carbonOffset} kg</p>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Main content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Energy consumption chart */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center">
                <Activity className="h-5 w-5 mr-2 text-primary" />
                Energy Overview
              </CardTitle>
              <CardDescription>
                7-day energy generation, consumption, and net import/export
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="energy">
                <TabsList className="w-full grid grid-cols-3">
                  <TabsTrigger value="energy">Energy</TabsTrigger>
                  <TabsTrigger value="cost">Cost</TabsTrigger>
                  <TabsTrigger value="emissions">Emissions</TabsTrigger>
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
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center">
                <CloudSun className="h-5 w-5 mr-2 text-primary" />
                Weather & Generation Forecast
              </CardTitle>
              <CardDescription>
                24-hour weather and solar generation forecast
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Current weather - first item in forecast */}
                <div className="bg-muted/50 rounded-lg p-4 flex items-center justify-between">
                  <div>
                    <div className="text-sm text-muted-foreground">Current Weather</div>
                    <div className="text-2xl font-semibold">{forecastData[0].temperature}°C</div>
                    <div className="text-sm capitalize">{forecastData[0].weather.replace('-', ' ')}</div>
                  </div>
                  <div className="text-4xl">
                    {forecastData[0].weather === 'sunny' && '☀️'}
                    {forecastData[0].weather === 'partly-cloudy' && '⛅'}
                    {forecastData[0].weather === 'cloudy' && '☁️'}
                    {forecastData[0].weather === 'rain' && '🌧️'}
                    {forecastData[0].weather === 'clear-night' && '🌙'}
                  </div>
                </div>
                
                {/* Hourly forecast */}
                <div className="grid grid-cols-3 gap-2">
                  {forecastData.slice(1, 7).map((forecast, i) => (
                    <div key={i} className="text-center bg-muted/30 rounded-md p-2">
                      <div className="text-xs font-medium">{forecast.time}</div>
                      <div className="text-xl my-1">
                        {forecast.weather === 'sunny' && '☀️'}
                        {forecast.weather === 'partly-cloudy' && '⛅'}
                        {forecast.weather === 'cloudy' && '☁️'}
                        {forecast.weather === 'rain' && '🌧️'}
                        {forecast.weather === 'clear-night' && '🌙'}
                      </div>
                      <div className="text-sm font-medium">{forecast.temperature}°C</div>
                    </div>
                  ))}
                </div>
                
                {/* Solar potential */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <div className="text-sm text-muted-foreground">Solar Potential</div>
                    <div className="text-sm font-medium">{forecastData[0].solarPotential}%</div>
                  </div>
                  <div className="w-full h-20">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={forecastData}
                        margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
                      >
                        <Area 
                          type="monotone" 
                          dataKey="solarPotential" 
                          stroke="#f59e0b" 
                          fill="#fcd34d" 
                        />
                        <XAxis 
                          dataKey="time"
                          tick={{ fontSize: 10 }}
                          interval={1}
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
        <RealTimeEnergyFlow />
        
        {/* Bottom row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Device status */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center">
                <Plug className="h-5 w-5 mr-2 text-primary" />
                Device Status
              </CardTitle>
              <CardDescription>
                Current status of your connected devices
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {deviceStatusData.map((device) => (
                  <div key={device.id} className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0">
                    <div className="flex items-center">
                      {getDeviceIcon(device.type)}
                      <div className="ml-3">
                        <div className="font-medium">{device.name}</div>
                        <div className="text-xs text-muted-foreground capitalize">{device.status}</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1">
                      <span className="font-medium">{device.value}</span>
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
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center">
                <Clock className="h-5 w-5 mr-2 text-primary" />
                Energy Events
              </CardTitle>
              <CardDescription>
                Upcoming and active energy events
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {energyEvents.map((event) => (
                  <div key={event.id} className="flex items-start space-x-3 border-b pb-3 last:border-0 last:pb-0">
                    <div className="pt-0.5">
                      {getEventIcon(event.type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div className="font-medium">{event.title}</div>
                        {getEventStatusBadge(event.status)}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Starts: {event.startTime} {event.duration && `• Duration: ${event.duration}`}
                      </div>
                      {event.message && (
                        <div className="text-sm mt-1">{event.message}</div>
                      )}
                      {event.reward && (
                        <div className="text-sm text-green-600 font-medium mt-1">Reward: {event.reward}</div>
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