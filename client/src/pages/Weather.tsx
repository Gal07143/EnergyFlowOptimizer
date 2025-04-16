import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSiteSelector } from '@/hooks/useSiteData';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, Cloud, CloudRain, CloudSnow, Sun, Wind, Thermometer, Droplets, Calendar } from 'lucide-react';
import { formatDate, formatTime } from '@/lib/utils';

export default function Weather() {
  const { currentSiteId, sites, selectSite } = useSiteSelector();
  const [activeTab, setActiveTab] = useState('current');
  
  // Fetch sites if not already loaded
  const { data: sitesData } = useQuery({
    queryKey: ['/api/sites'],
    queryFn: async () => {
      const res = await fetch('/api/sites');
      if (!res.ok) throw new Error('Failed to fetch sites');
      return await res.json();
    },
    enabled: sites?.length === 0
  });
  
  // Fetch weather data for the current site
  const { data: weatherData, isLoading, error } = useQuery({
    queryKey: ['/api/sites', currentSiteId, 'weather'],
    queryFn: async () => {
      const res = await fetch(`/api/sites/${currentSiteId}/weather`);
      if (!res.ok) throw new Error('Failed to fetch weather data');
      return await res.json();
    },
    enabled: !!currentSiteId
  });
  
  // Fetch weather forecast for the current site
  const { data: forecastData, isLoading: isLoadingForecast } = useQuery({
    queryKey: ['/api/sites', currentSiteId, 'weather/forecast'],
    queryFn: async () => {
      const res = await fetch(`/api/sites/${currentSiteId}/weather/forecast`);
      if (!res.ok) throw new Error('Failed to fetch weather forecast');
      return await res.json();
    },
    enabled: !!currentSiteId
  });

  const handleSiteChange = (siteId: string) => {
    selectSite(Number(siteId));
  };

  // Function to get appropriate weather icon
  const getWeatherIcon = (condition: string) => {
    switch (condition?.toLowerCase()) {
      case 'clear':
      case 'sunny':
        return <Sun className="h-12 w-12 text-yellow-500" />;
      case 'clouds':
      case 'cloudy':
      case 'partly cloudy':
        return <Cloud className="h-12 w-12 text-blue-400" />;
      case 'rain':
      case 'drizzle':
      case 'showers':
        return <CloudRain className="h-12 w-12 text-blue-600" />;
      case 'snow':
        return <CloudSnow className="h-12 w-12 text-blue-200" />;
      default:
        return <Cloud className="h-12 w-12 text-blue-400" />;
    }
  };

  if (isLoading) {
    return (
      <div className="py-6 px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="pb-5 border-b border-gray-200 dark:border-gray-800">
          <Skeleton className="h-8 w-64" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-6 px-4 sm:px-6 lg:px-8">
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {error instanceof Error ? error.message : 'Failed to load weather data'}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="py-6 px-4 sm:px-6 lg:px-8">
      <div className="pb-5 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Weather</h1>
        
        <div className="flex items-center">
          <span className="mr-2 text-sm text-gray-500 dark:text-gray-400">Select site:</span>
          <Select value={currentSiteId?.toString()} onValueChange={handleSiteChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select site" />
            </SelectTrigger>
            <SelectContent>
              {(sites || sitesData || []).map((site: any) => (
                <SelectItem key={site.id} value={site.id.toString()}>
                  {site.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="current">Current Weather</TabsTrigger>
            <TabsTrigger value="forecast">Forecast</TabsTrigger>
            <TabsTrigger value="historical">Historical Data</TabsTrigger>
          </TabsList>

          <TabsContent value="current">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Current weather overview */}
              <Card>
                <CardHeader>
                  <CardTitle>Current Weather</CardTitle>
                  <CardDescription>
                    {weatherData?.locationName || 'Location data unavailable'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center">
                    <div className="flex flex-col">
                      <span className="text-sm text-gray-500">Last updated:</span>
                      <span className="text-sm">{weatherData?.timestamp ? formatDate(weatherData.timestamp) : 'Unknown'}</span>
                      <span className="text-sm">{weatherData?.timestamp ? formatTime(weatherData.timestamp) : ''}</span>
                      
                      <div className="mt-4">
                        <span className="text-4xl font-bold">{weatherData?.temperature ? `${weatherData.temperature}°C` : 'N/A'}</span>
                        <div className="mt-1 text-lg">{weatherData?.condition || 'Unknown'}</div>
                      </div>
                    </div>
                    
                    <div>
                      {getWeatherIcon(weatherData?.condition || 'unknown')}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mt-6">
                    <div className="border p-3 rounded-md">
                      <div className="flex items-center gap-2 mb-1">
                        <Wind className="h-4 w-4 text-blue-500" />
                        <span className="text-sm text-gray-600 dark:text-gray-400">Wind</span>
                      </div>
                      <div>
                        <span className="text-base font-medium">{weatherData?.windSpeed ? `${weatherData.windSpeed} m/s` : 'N/A'}</span>
                      </div>
                    </div>
                    
                    <div className="border p-3 rounded-md">
                      <div className="flex items-center gap-2 mb-1">
                        <Droplets className="h-4 w-4 text-blue-500" />
                        <span className="text-sm text-gray-600 dark:text-gray-400">Humidity</span>
                      </div>
                      <div>
                        <span className="text-base font-medium">{weatherData?.humidity ? `${weatherData.humidity}%` : 'N/A'}</span>
                      </div>
                    </div>
                    
                    <div className="border p-3 rounded-md">
                      <div className="flex items-center gap-2 mb-1">
                        <Cloud className="h-4 w-4 text-blue-500" />
                        <span className="text-sm text-gray-600 dark:text-gray-400">Cloud Cover</span>
                      </div>
                      <div>
                        <span className="text-base font-medium">{weatherData?.cloudCover ? `${weatherData.cloudCover}%` : 'N/A'}</span>
                      </div>
                    </div>
                    
                    <div className="border p-3 rounded-md">
                      <div className="flex items-center gap-2 mb-1">
                        <CloudRain className="h-4 w-4 text-blue-500" />
                        <span className="text-sm text-gray-600 dark:text-gray-400">Precipitation</span>
                      </div>
                      <div>
                        <span className="text-base font-medium">{weatherData?.precipitation ? `${weatherData.precipitation} mm` : 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Solar impact */}
              <Card>
                <CardHeader>
                  <CardTitle>Solar Impact</CardTitle>
                  <CardDescription>
                    How current weather affects your solar production
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="border p-4 rounded-md">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center">
                          <Sun className="h-5 w-5 text-yellow-500 mr-2" />
                          <span className="font-medium">Solar Efficiency</span>
                        </div>
                        <span className="text-lg font-bold">{weatherData?.cloudCover ? `${100 - weatherData.cloudCover}%` : 'N/A'}</span>
                      </div>
                      <div className="h-2 bg-gray-200 rounded-full">
                        <div 
                          className="h-2 bg-yellow-400 rounded-full" 
                          style={{ width: weatherData?.cloudCover ? `${100 - weatherData.cloudCover}%` : '50%' }}
                        ></div>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                        {weatherData?.cloudCover && weatherData.cloudCover < 30
                          ? 'Excellent solar production conditions'
                          : weatherData?.cloudCover && weatherData.cloudCover < 70
                          ? 'Moderate solar production conditions'
                          : 'Poor solar production conditions'}
                      </p>
                    </div>
                    
                    <div className="border p-4 rounded-md">
                      <h3 className="text-base font-medium mb-2">Production Estimate</h3>
                      <div className="space-y-4">
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-sm">Current Hour</span>
                            <span className="text-sm font-medium">
                              {weatherData?.solarEstimate ? `${weatherData.solarEstimate.toFixed(1)} kWh` : '3.2 kWh'}
                            </span>
                          </div>
                          <div className="h-2 bg-gray-200 rounded-full">
                            <div 
                              className="h-2 bg-green-500 rounded-full" 
                              style={{ width: '80%' }}
                            ></div>
                          </div>
                        </div>
                        
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-sm">Today</span>
                            <span className="text-sm font-medium">
                              {weatherData?.dailySolarEstimate ? `${weatherData.dailySolarEstimate.toFixed(1)} kWh` : '18.5 kWh'}
                            </span>
                          </div>
                          <div className="h-2 bg-gray-200 rounded-full">
                            <div 
                              className="h-2 bg-green-500 rounded-full" 
                              style={{ width: '65%' }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="forecast">
            <Card>
              <CardHeader>
                <CardTitle>Weather Forecast</CardTitle>
                <CardDescription>
                  5-day weather forecast for {weatherData?.locationName || 'your location'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingForecast ? (
                  <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-16" />
                    ))}
                  </div>
                ) : forecastData?.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    {(forecastData || []).slice(0, 5).map((day: any, index: number) => (
                      <div key={index} className="border rounded-md p-3 text-center">
                        <div className="text-sm font-medium mb-2">
                          {day.date ? formatDate(day.date) : `Day ${index + 1}`}
                        </div>
                        <div className="flex justify-center mb-2">
                          {getWeatherIcon(day.condition || 'unknown')}
                        </div>
                        <div className="text-lg font-bold">{day.temperature ? `${day.temperature}°C` : 'N/A'}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">{day.condition || 'Unknown'}</div>
                        <div className="flex justify-center items-center mt-2 text-xs text-gray-600 dark:text-gray-400">
                          <Wind className="h-3 w-3 mr-1" />
                          <span>{day.windSpeed ? `${day.windSpeed} m/s` : 'N/A'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600 dark:text-gray-400">
                      Forecast data is not available at the moment.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="historical">
            <Card>
              <CardHeader>
                <CardTitle>Historical Weather Data</CardTitle>
                <CardDescription>
                  Weather history for the past week
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center py-8">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 dark:text-gray-400">
                  Historical weather data will be available soon.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}