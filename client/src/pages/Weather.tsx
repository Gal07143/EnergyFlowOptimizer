import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Layout from '@/components/Layout';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import WeatherWidget from '@/components/weather/WeatherWidget';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface Site {
  id: number;
  name: string;
  address: string;
}

export default function Weather() {
  const [selectedSiteId, setSelectedSiteId] = useState<number | null>(null);

  // Fetch sites
  const { data: sites, isLoading, error, refetch } = useQuery<Site[]>({
    queryKey: ['/api/sites'],
    queryFn: async () => {
      const response = await fetch('/api/sites');
      if (!response.ok) {
        throw new Error('Failed to fetch sites');
      }
      return await response.json();
    }
  });

  // Auto-select the first site if none is selected yet
  React.useEffect(() => {
    if (!selectedSiteId && sites && sites.length > 0) {
      setSelectedSiteId(sites[0].id);
    }
  }, [sites, selectedSiteId]);
  
  // Request OpenWeatherMap API key if user wants to use it
  const handleRequestApiKey = async () => {
    // Here we would show information about OpenWeather API
    window.open('https://openweathermap.org/api', '_blank');
  };

  // Loading state
  if (isLoading) {
    return (
      <Layout>
        <div className="container py-6">
          <div className="mb-6">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64 mt-2" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Skeleton className="h-80 w-full" />
          </div>
        </div>
      </Layout>
    );
  }

  // Error state
  if (error) {
    return (
      <Layout>
        <div className="container py-6">
          <Card className="w-full border-red-200 mb-6">
            <CardHeader>
              <CardTitle className="flex items-center text-red-500">
                <AlertTriangle className="mr-2" />
                Error Loading Data
              </CardTitle>
              <CardDescription>
                Unable to load site information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                {error instanceof Error ? error.message : 'An unknown error occurred.'}
              </p>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-4"
                onClick={() => refetch()}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Retry
              </Button>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Weather Information</h1>
          <p className="text-muted-foreground">
            Real-time weather data and forecasts to optimize energy usage
          </p>
        </div>

        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Site:</span>
            <Select
              value={selectedSiteId?.toString() || ''}
              onValueChange={(value) => setSelectedSiteId(Number(value))}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select a site" />
              </SelectTrigger>
              <SelectContent>
                {sites?.map((site: Site) => (
                  <SelectItem key={site.id} value={site.id.toString()}>
                    {site.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <Button 
            variant="outline"
            onClick={handleRequestApiKey}
          >
            Get OpenWeather API Key
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {selectedSiteId && (
            <WeatherWidget siteId={selectedSiteId} />
          )}

          <Card>
            <CardHeader>
              <CardTitle>Weather Impact</CardTitle>
              <CardDescription>How weather affects your energy production and consumption</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium mb-1">Solar Production</h3>
                  <p className="text-sm text-muted-foreground">
                    Clear, sunny days maximize solar panel efficiency. Cloud cover can reduce production by 10-70%
                    depending on thickness and coverage.
                  </p>
                </div>

                <div>
                  <h3 className="font-medium mb-1">Energy Consumption</h3>
                  <p className="text-sm text-muted-foreground">
                    Temperature extremes increase HVAC usage. Every 1°C increase in summer temperatures can raise
                    cooling energy consumption by 5-7%.
                  </p>
                </div>

                <div>
                  <h3 className="font-medium mb-1">Battery Performance</h3>
                  <p className="text-sm text-muted-foreground">
                    Battery efficiency decreases in cold weather. Performance can drop by 10-20% when temperatures
                    fall below 0°C.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}