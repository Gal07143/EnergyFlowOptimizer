import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Loader2, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { format } from 'date-fns';

// Register required Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface EnergyForecastProps {
  siteId: number;
}

type ForecastInterval = '1h' | '6h' | '24h' | '7d' | '30d';

export default function EnergyForecast({ siteId }: EnergyForecastProps) {
  const [interval, setInterval] = useState<ForecastInterval>('24h');

  // Get the latest forecast
  const { data: forecast, isLoading, error } = useQuery({
    queryKey: ['/api/sites', siteId, 'forecasts', 'latest', interval],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/sites/${siteId}/forecasts/latest?interval=${interval}`);
      return await res.json();
    },
    refetchOnWindowFocus: false,
  });

  // Generate a new forecast
  const generateForecastMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', `/api/sites/${siteId}/forecasts/generate?interval=${interval}`);
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['/api/sites', siteId, 'forecasts', 'latest', interval], data);
    },
  });

  // Prepare chart data if forecast is available
  const chartData = React.useMemo(() => {
    if (!forecast || !forecast.metadata || !forecast.metadata.data) {
      return null;
    }

    const data = forecast.metadata.data;
    
    // Format dates for x-axis
    const labels = data.timestamps.map((timestamp: number) => 
      format(new Date(timestamp), 'MMM d, h aaa')
    );

    return {
      labels,
      datasets: [
        {
          label: 'Production',
          data: data.production,
          borderColor: 'rgba(46, 204, 113, 1.0)',
          backgroundColor: 'rgba(46, 204, 113, 0.2)',
          fill: true,
          tension: 0.4,
        },
        {
          label: 'Consumption',
          data: data.consumption,
          borderColor: 'rgba(231, 76, 60, 1.0)',
          backgroundColor: 'rgba(231, 76, 60, 0.2)',
          fill: true,
          tension: 0.4,
        },
        {
          label: 'Grid Import',
          data: data.gridImport,
          borderColor: 'rgba(52, 152, 219, 1.0)',
          backgroundColor: 'rgba(52, 152, 219, 0.0)',
          borderDash: [5, 5],
          fill: false,
          tension: 0.4,
        },
        {
          label: 'Grid Export',
          data: data.gridExport,
          borderColor: 'rgba(155, 89, 182, 1.0)',
          backgroundColor: 'rgba(155, 89, 182, 0.0)',
          borderDash: [5, 5],
          fill: false,
          tension: 0.4,
        },
      ],
    };
  }, [forecast]);

  // Chart options
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Energy (kWh)',
        },
      },
      x: {
        title: {
          display: true,
          text: 'Time',
        },
      },
    },
    plugins: {
      legend: {
        position: 'top' as const,
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
      },
    },
  };

  // Format forecast date
  const getForecastTimeframe = () => {
    if (!forecast || !forecast.forecastDate) return 'Not available';
    
    const forecastDate = new Date(forecast.forecastDate);
    const intervalMap: Record<ForecastInterval, string> = {
      '1h': 'Hour',
      '6h': '6 Hours',
      '24h': 'Day',
      '7d': 'Week',
      '30d': 'Month'
    };
    
    return `${intervalMap[interval]} ending ${format(forecastDate, 'MMM d, yyyy h:mm a')}`;
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Energy Forecast</CardTitle>
          <CardDescription>Predicted energy flow</CardDescription>
        </div>
        <div className="flex space-x-2">
          <Select
            value={interval}
            onValueChange={(value) => setInterval(value as ForecastInterval)}
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Interval" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1h">1 Hour</SelectItem>
              <SelectItem value="6h">6 Hours</SelectItem>
              <SelectItem value="24h">24 Hours</SelectItem>
              <SelectItem value="7d">7 Days</SelectItem>
              <SelectItem value="30d">30 Days</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => generateForecastMutation.mutate()}
            disabled={generateForecastMutation.isPending}
          >
            {generateForecastMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading || generateForecastMutation.isPending ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <Alert variant="destructive">
            <AlertTitle>Error loading forecast</AlertTitle>
            <AlertDescription>
              {error instanceof Error ? error.message : 'Failed to load forecast data'}
            </AlertDescription>
          </Alert>
        ) : forecast ? (
          <div>
            <div className="mb-4 text-sm text-muted-foreground">
              <span className="font-semibold">Forecast:</span> {getForecastTimeframe()}
              {forecast.confidence && 
                <span className="ml-4 font-semibold">Confidence: {Math.round(Number(forecast.confidence) * 100)}%</span>
              }
              {forecast.algorithm && 
                <span className="ml-4 font-semibold">Method: {forecast.algorithm}</span>
              }
            </div>
            
            <div className="h-64">
              {chartData ? (
                <Line data={chartData} options={options} />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-muted-foreground">No forecast data available</p>
                </div>
              )}
            </div>
            
            {forecast.metadata && forecast.metadata.factors && (
              <div className="mt-4 text-sm">
                <p className="font-semibold">Factors considered:</p>
                <ul className="list-disc list-inside text-muted-foreground">
                  {forecast.metadata.factors.map((factor: string, i: number) => (
                    <li key={i}>{factor}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">No forecast data available</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}