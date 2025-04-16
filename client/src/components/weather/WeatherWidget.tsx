import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { ToastAction } from '@/components/ui/toast';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import {
  Cloud,
  CloudRain,
  CloudSnow,
  CloudSun,
  Sun,
  Wind,
  Droplets,
  Thermometer,
  Sunrise,
  Sunset,
  CloudFog,
  CloudLightning,
  AlertTriangle,
  Settings,
  RefreshCw
} from 'lucide-react';

interface WeatherWidgetProps {
  siteId: number;
}

type WeatherView = 'current' | 'forecast';

export default function WeatherWidget({ siteId }: WeatherWidgetProps) {
  const [view, setView] = useState<WeatherView>('current');
  const [apiKey, setApiKey] = useState('');
  const [showApiKeyForm, setShowApiKeyForm] = useState(false);
  const { toast } = useToast();

  // Check if API key is set
  const { data: apiKeyStatus, isLoading: isLoadingApiKeyStatus, refetch: refetchApiKeyStatus } = useQuery({
    queryKey: ['/api/weather/api-key/status'],
    queryFn: async () => {
      const response = await fetch('/api/weather/api-key/status');
      if (!response.ok) {
        throw new Error('Failed to check API key status');
      }
      return await response.json();
    }
  });

  // Fetch current weather
  const { 
    data: currentWeather, 
    isLoading: isLoadingCurrent,
    error: currentError,
    refetch: refetchCurrent
  } = useQuery({
    queryKey: ['/api/sites', siteId, 'weather/current'],
    queryFn: async () => {
      const response = await fetch(`/api/sites/${siteId}/weather/current`);
      if (!response.ok) {
        throw new Error('Failed to fetch current weather');
      }
      return await response.json();
    },
    enabled: !!siteId
  });

  // Fetch weather forecast
  const { 
    data: forecastWeather, 
    isLoading: isLoadingForecast,
    error: forecastError,
    refetch: refetchForecast
  } = useQuery({
    queryKey: ['/api/sites', siteId, 'weather/forecast'],
    queryFn: async () => {
      const response = await fetch(`/api/sites/${siteId}/weather/forecast?days=3`);
      if (!response.ok) {
        throw new Error('Failed to fetch weather forecast');
      }
      return await response.json();
    },
    enabled: !!siteId
  });

  // Handle setting API key
  const handleSetApiKey = async () => {
    try {
      const response = await apiRequest('POST', '/api/weather/api-key', { apiKey });
      
      if (response.ok) {
        toast({
          title: "API Key Set Successfully",
          description: "Weather data will now use real-time information.",
          action: <ToastAction altText="Okay">Okay</ToastAction>,
        });
        setApiKey('');
        setShowApiKeyForm(false);
        
        // Refetch weather data and status
        refetchApiKeyStatus();
        refetchCurrent();
        refetchForecast();
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to set API key');
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Failed to set API key",
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        action: <ToastAction altText="Try Again">Try Again</ToastAction>,
      });
    }
  };

  // Get weather icon based on condition
  const getWeatherIcon = (condition: string, size: number = 24) => {
    const props = { size, className: "mr-2" };
    
    switch (condition) {
      case 'clear':
        return <Sun {...props} className="mr-2 text-yellow-500" />;
      case 'clouds':
        return <Cloud {...props} className="mr-2 text-gray-500" />;
      case 'rain':
      case 'drizzle':
        return <CloudRain {...props} className="mr-2 text-blue-500" />;
      case 'snow':
        return <CloudSnow {...props} className="mr-2 text-blue-200" />;
      case 'thunderstorm':
        return <CloudLightning {...props} className="mr-2 text-purple-500" />;
      case 'mist':
      case 'fog':
      case 'haze':
        return <CloudFog {...props} className="mr-2 text-gray-400" />;
      default:
        return <CloudSun {...props} className="mr-2 text-yellow-400" />;
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric'
    }).format(date);
  };

  // Render loading state
  if (isLoadingCurrent || isLoadingForecast) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Skeleton className="h-8 w-8 rounded-full mr-2" />
            <Skeleton className="h-6 w-40" />
          </CardTitle>
          <CardDescription>
            <Skeleton className="h-4 w-32" />
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Render error state
  if (currentError || forecastError) {
    return (
      <Card className="w-full border-red-200">
        <CardHeader>
          <CardTitle className="flex items-center text-red-500">
            <AlertTriangle className="mr-2" />
            Weather Data Error
          </CardTitle>
          <CardDescription>
            Unable to load weather information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            {currentError instanceof Error ? currentError.message : 'An unknown error occurred while loading weather data.'}
          </p>
          <Button 
            variant="outline" 
            size="sm" 
            className="mt-4"
            onClick={() => {
              refetchCurrent();
              refetchForecast();
            }}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Format temperature
  const formatTemp = (temp: number | null) => {
    if (temp === null) return 'N/A';
    return `${Math.round(temp)}°C`;
  };

  // Map API source to display name
  const getSourceDisplay = (source: string) => {
    if (source === 'openweathermap') return 'OpenWeather API';
    if (source === 'fallback') return 'Estimated Data';
    return source;
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg">Weather Information</CardTitle>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setShowApiKeyForm(!showApiKeyForm)}
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
        <CardDescription>
          {currentWeather?.locationName || 'Local Weather'}
          {!apiKeyStatus?.hasApiKey && (
            <Badge variant="outline" className="ml-2 bg-amber-100 text-amber-800">
              Using Estimated Data
            </Badge>
          )}
        </CardDescription>
      </CardHeader>
      
      {showApiKeyForm && (
        <CardContent className="pb-2 border-b">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Enter your OpenWeatherMap API key to get real-time weather data
            </p>
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="API Key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
              <Button onClick={handleSetApiKey} disabled={!apiKey}>Save</Button>
            </div>
            {apiKeyStatus?.hasApiKey && (
              <p className="text-xs text-green-600">
                API key is configured and active
              </p>
            )}
          </div>
        </CardContent>
      )}
      
      <Tabs defaultValue="current" className="w-full">
        <CardContent className="pt-4 pb-2">
          <TabsList className="w-full">
            <TabsTrigger value="current" className="flex-1" onClick={() => setView('current')}>
              Current
            </TabsTrigger>
            <TabsTrigger value="forecast" className="flex-1" onClick={() => setView('forecast')}>
              Forecast
            </TabsTrigger>
          </TabsList>
        </CardContent>
        
        <TabsContent value="current" className="pt-0">
          <CardContent>
            {currentWeather && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    {getWeatherIcon(currentWeather.condition as string, 48)}
                    <div>
                      <h3 className="text-2xl font-bold">{formatTemp(currentWeather.temperature)}</h3>
                      <p className="text-muted-foreground capitalize">{currentWeather.condition}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">
                      {formatDate(currentWeather.timestamp)}
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center">
                    <Droplets className="mr-2 h-4 w-4 text-blue-500" />
                    <span className="text-sm">Humidity: {currentWeather.humidity?.toFixed(0)}%</span>
                  </div>
                  <div className="flex items-center">
                    <Wind className="mr-2 h-4 w-4 text-blue-400" />
                    <span className="text-sm">Wind: {currentWeather.windSpeed?.toFixed(1)} m/s</span>
                  </div>
                  <div className="flex items-center">
                    <Sunrise className="mr-2 h-4 w-4 text-yellow-500" />
                    <span className="text-sm">
                      Sunrise: {currentWeather.sunriseTime ? new Date(currentWeather.sunriseTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'N/A'}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <Sunset className="mr-2 h-4 w-4 text-orange-500" />
                    <span className="text-sm">
                      Sunset: {currentWeather.sunsetTime ? new Date(currentWeather.sunsetTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </TabsContent>
        
        <TabsContent value="forecast" className="pt-0">
          <CardContent>
            {forecastWeather && forecastWeather.length > 0 ? (
              <div className="space-y-3">
                {forecastWeather.slice(0, 3).map((forecast: any, index: number) => (
                  <div key={index} className="flex items-center justify-between border-b pb-3 last:border-0">
                    <div className="flex items-center">
                      {getWeatherIcon(forecast.condition as string)}
                      <div>
                        <p className="text-sm font-medium">
                          {forecast.forecastTime ? formatDate(forecast.forecastTime) : 'N/A'}
                        </p>
                        <p className="text-xs text-muted-foreground capitalize">{forecast.condition}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-base font-medium">{formatTemp(forecast.temperature)}</p>
                      <p className="text-xs text-muted-foreground">
                        Wind: {forecast.windSpeed?.toFixed(1)} m/s
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-4">
                No forecast data available
              </p>
            )}
          </CardContent>
        </TabsContent>
      </Tabs>
      
      <CardFooter className="pt-0">
        <p className="text-xs text-muted-foreground w-full text-center">
          Source: {currentWeather ? getSourceDisplay(currentWeather.source) : 'Unknown'}
          {' · '}
          <Button 
            variant="link" 
            size="sm" 
            className="p-0 h-auto text-xs" 
            onClick={() => {
              refetchCurrent();
              refetchForecast();
            }}
          >
            Refresh
          </Button>
        </p>
      </CardFooter>
    </Card>
  );
}