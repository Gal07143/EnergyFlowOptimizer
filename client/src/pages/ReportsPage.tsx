import React, { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSiteContext } from '@/hooks/use-site-context';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DatePicker } from "@/components/ui/date-picker";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { FileText, FileSpreadsheetIcon, Calendar, BarChart3, Save, Download, RotateCw, 
         Activity, DownloadCloud, AreaChart, LineChart, PieChart } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  BarElement,
  ArcElement,
  Title, 
  Tooltip, 
  Legend, 
  Filler,
  TimeScale
} from 'chart.js';
import { Line, Bar, Pie, Doughnut } from 'react-chartjs-2';
import 'chartjs-adapter-date-fns';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  TimeScale
);

// Report types from the API
interface ReportType {
  id: string;
  name: string;
  description: string;
}

// Report formats from the API
interface ReportFormat {
  id: string;
  name: string;
  description: string;
}

// Report time periods from the API
interface TimePeriod {
  id: string;
  name: string;
  description: string;
}

// Analytics types from the API
interface AnalyticsType {
  id: string;
  name: string;
  description: string;
}

// Analytics time granularities from the API
interface TimeGranularity {
  id: string;
  name: string;
  description: string;
}

// Report templates from the API
interface ReportTemplate {
  id: string;
  name: string;
  description: string;
}

const ReportsPage: React.FC = () => {
  const { toast } = useToast();
  const { currentSiteId } = useSiteContext();
  const [activeTab, setActiveTab] = useState('reports');
  const [reportTabView, setReportTabView] = useState<'custom' | 'templates'>('custom');
  
  // Reports state
  const [selectedReportType, setSelectedReportType] = useState<string>('');
  const [selectedFormat, setSelectedFormat] = useState<string>('pdf');
  const [selectedTimePeriod, setSelectedTimePeriod] = useState<string>('month');
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  
  // Analytics state
  const [selectedAnalyticsType, setSelectedAnalyticsType] = useState<string>('');
  const [selectedGranularity, setSelectedGranularity] = useState<string>('daily');
  const [analyticsStartDate, setAnalyticsStartDate] = useState<Date | undefined>(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)); // 30 days ago
  const [analyticsEndDate, setAnalyticsEndDate] = useState<Date | undefined>(new Date());
  const [isRunningAnalytics, setIsRunningAnalytics] = useState(false);
  const [analyticsResult, setAnalyticsResult] = useState<any>(null);

  // Fetch report types
  const { data: reportTypes, isLoading: isLoadingReportTypes } = useQuery({
    queryKey: ['/api/reports/types'],
    queryFn: async () => {
      const res = await fetch('/api/reports/types');
      if (!res.ok) throw new Error('Failed to fetch report types');
      return res.json() as Promise<ReportType[]>;
    }
  });

  // Fetch report formats
  const { data: reportFormats, isLoading: isLoadingReportFormats } = useQuery({
    queryKey: ['/api/reports/formats'],
    queryFn: async () => {
      const res = await fetch('/api/reports/formats');
      if (!res.ok) throw new Error('Failed to fetch report formats');
      return res.json() as Promise<ReportFormat[]>;
    }
  });

  // Fetch time periods
  const { data: timePeriods, isLoading: isLoadingTimePeriods } = useQuery({
    queryKey: ['/api/reports/time-periods'],
    queryFn: async () => {
      const res = await fetch('/api/reports/time-periods');
      if (!res.ok) throw new Error('Failed to fetch time periods');
      return res.json() as Promise<TimePeriod[]>;
    }
  });
  
  // Fetch report templates
  const { data: reportTemplates, isLoading: isLoadingReportTemplates } = useQuery({
    queryKey: ['/api/reports/templates'],
    queryFn: async () => {
      const res = await fetch('/api/reports/templates');
      if (!res.ok) throw new Error('Failed to fetch report templates');
      return res.json() as Promise<ReportTemplate[]>;
    }
  });

  // Fetch analytics types
  const { data: analyticsTypes, isLoading: isLoadingAnalyticsTypes } = useQuery({
    queryKey: ['/api/analytics/types'],
    queryFn: async () => {
      const res = await fetch('/api/analytics/types');
      if (!res.ok) throw new Error('Failed to fetch analytics types');
      return res.json() as Promise<AnalyticsType[]>;
    }
  });

  // Fetch time granularities
  const { data: timeGranularities, isLoading: isLoadingTimeGranularities } = useQuery({
    queryKey: ['/api/analytics/granularities'],
    queryFn: async () => {
      const res = await fetch('/api/analytics/granularities');
      if (!res.ok) throw new Error('Failed to fetch time granularities');
      return res.json() as Promise<TimeGranularity[]>;
    }
  });

  // Handle generating report from template
  const handleGenerateFromTemplate = async () => {
    if (!currentSiteId) {
      toast({
        title: 'Site Not Selected',
        description: 'Please select a site before generating a report.',
        variant: 'destructive',
      });
      return;
    }

    if (!selectedTemplate) {
      toast({
        title: 'Template Not Selected',
        description: 'Please select a report template.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsGeneratingReport(true);

      // Create form data for the request
      const formData = {
        siteId: currentSiteId,
        templateId: selectedTemplate,
      };

      // Use fetch with blob response to get the file
      const response = await fetch('/api/reports/generate-from-template', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error(`Error generating report: ${response.statusText}`);
      }

      // Get the blob from the response
      const blob = await response.blob();

      // Create a URL for the blob
      const url = window.URL.createObjectURL(blob);

      // Create a link element and click it to trigger download
      const a = document.createElement('a');
      a.href = url;
      
      // Get the filename from Content-Disposition header or create a default one
      let filename = 'report';
      const contentDisposition = response.headers.get('Content-Disposition');
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename=([^;]+)/);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1].replace(/"/g, '');
        }
      }
      
      if (!filename.includes('.')) {
        filename += '.pdf'; // Default to PDF for templates
      }
      
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: 'Template Report Generated',
        description: 'Your report has been generated and downloaded successfully.',
      });
    } catch (error) {
      console.error('Error generating template report:', error);
      toast({
        title: 'Template Report Generation Failed',
        description: error instanceof Error ? error.message : 'Failed to generate template report',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingReport(false);
    }
  };

  // Handle report generation
  const handleGenerateReport = async () => {
    if (!currentSiteId) {
      toast({
        title: 'Site Not Selected',
        description: 'Please select a site before generating a report.',
        variant: 'destructive',
      });
      return;
    }

    if (!selectedReportType) {
      toast({
        title: 'Report Type Not Selected',
        description: 'Please select a report type.',
        variant: 'destructive',
      });
      return;
    }

    // Validate dates for custom time period
    if (selectedTimePeriod === 'custom') {
      if (!startDate || !endDate) {
        toast({
          title: 'Date Range Required',
          description: 'Please select both start and end dates for custom time period.',
          variant: 'destructive',
        });
        return;
      }

      if (endDate < startDate) {
        toast({
          title: 'Invalid Date Range',
          description: 'End date must be after start date.',
          variant: 'destructive',
        });
        return;
      }
    }

    try {
      setIsGeneratingReport(true);

      // Create form data for the request
      const formData = {
        siteId: currentSiteId,
        reportType: selectedReportType,
        format: selectedFormat,
        timePeriod: selectedTimePeriod,
        startDate: startDate?.toISOString(),
        endDate: endDate?.toISOString(),
      };

      // Use fetch with blob response to get the file
      const response = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error(`Error generating report: ${response.statusText}`);
      }

      // Get the blob from the response
      const blob = await response.blob();

      // Create a URL for the blob
      const url = window.URL.createObjectURL(blob);

      // Create a link element and click it to trigger download
      const a = document.createElement('a');
      a.href = url;
      
      // Get the filename from Content-Disposition header or create a default one
      let filename = 'report';
      const contentDisposition = response.headers.get('Content-Disposition');
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename=([^;]+)/);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1].replace(/"/g, '');
        }
      }
      
      if (!filename.includes('.')) {
        filename += selectedFormat === 'pdf' ? '.pdf' : '.xlsx';
      }
      
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: 'Report Generated',
        description: 'Your report has been generated and downloaded successfully.',
      });
    } catch (error) {
      console.error('Error generating report:', error);
      toast({
        title: 'Report Generation Failed',
        description: error instanceof Error ? error.message : 'Failed to generate report',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingReport(false);
    }
  };

  // Handle running analytics
  const handleRunAnalytics = async () => {
    if (!currentSiteId) {
      toast({
        title: 'Site Not Selected',
        description: 'Please select a site before running analytics.',
        variant: 'destructive',
      });
      return;
    }

    if (!selectedAnalyticsType) {
      toast({
        title: 'Analytics Type Not Selected',
        description: 'Please select an analytics type.',
        variant: 'destructive',
      });
      return;
    }

    // Validate dates
    if (!analyticsStartDate || !analyticsEndDate) {
      toast({
        title: 'Date Range Required',
        description: 'Please select both start and end dates for analytics.',
        variant: 'destructive',
      });
      return;
    }

    if (analyticsEndDate < analyticsStartDate) {
      toast({
        title: 'Invalid Date Range',
        description: 'End date must be after start date.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsRunningAnalytics(true);
      setAnalyticsResult(null);

      // Create request data
      const requestData = {
        siteId: currentSiteId,
        analyticsType: selectedAnalyticsType,
        granularity: selectedGranularity,
        startDate: analyticsStartDate.toISOString(),
        endDate: analyticsEndDate.toISOString(),
      };

      // Send the request
      const response = await fetch('/api/analytics/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        throw new Error(`Error running analytics: ${response.statusText}`);
      }

      // Get the result
      const result = await response.json();
      setAnalyticsResult(result);

      toast({
        title: 'Analytics Completed',
        description: 'Analytics processed successfully.',
      });
    } catch (error) {
      console.error('Error running analytics:', error);
      toast({
        title: 'Analytics Failed',
        description: error instanceof Error ? error.message : 'Failed to run analytics',
        variant: 'destructive',
      });
    } finally {
      setIsRunningAnalytics(false);
    }
  };

  // Interface for energy data visualization
  interface EnergyData {
    timestamp: string;
    consumption: number;
    production: number;
    gridImport: number;
    gridExport: number;
    batterySoc?: number;
  }

  // Interface for tariff data visualization
  interface TariffData {
    timestamp: string;
    rate: number;
    periodType: string;
  }

  // Interface for carbon intensity data visualization
  interface CarbonData {
    timestamp: string;
    carbonIntensity: number;
    renewablePercentage: number;
  }

  // Interface for device consumption data
  interface DeviceConsumption {
    deviceId: string;
    deviceName: string;
    deviceType: string;
    consumption: number;
    percentage: number;
  }

  // Enhanced analytics result interface
  interface EnhancedAnalyticsResult {
    insights: any[];
    summary?: string;
    findings?: string[];
    recommendations?: string[];
    energyData?: EnergyData[];
    tariffData?: TariffData[];
    carbonData?: CarbonData[];
    deviceConsumption?: DeviceConsumption[];
    chartType?: string;
    savingsAmount?: number;
    optimizationPotential?: number;
    peakDemand?: number;
    averageDemand?: number;
    selfConsumptionRate?: number;
    selfSufficiencyRate?: number;
    totalConsumption?: number;
    totalProduction?: number;
    totalCost?: number;
  }

  // Render chart based on analytics type and data
  const renderChart = () => {
    if (!analyticsResult) return null;
    
    // Default chart options with responsive design
    const chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top' as const,
        },
        tooltip: {
          mode: 'index' as const,
          intersect: false,
        },
      },
      scales: {
        x: {
          grid: {
            display: false,
          },
        },
        y: {
          beginAtZero: true,
          grid: {
            color: 'rgba(200, 200, 200, 0.1)',
          }
        }
      }
    };

    // Energy consumption/production chart
    if (analyticsResult.energyData && analyticsResult.energyData.length > 0) {
      const labels = analyticsResult.energyData.map(d => new Date(d.timestamp).toLocaleString());
      
      // Energy data visualization (consumption vs production)
      const energyChartData = {
        labels,
        datasets: [
          {
            label: 'Consumption (kWh)',
            data: analyticsResult.energyData.map(d => d.consumption),
            borderColor: 'rgb(255, 99, 132)',
            backgroundColor: 'rgba(255, 99, 132, 0.5)',
            borderWidth: 2,
            tension: 0.3,
          },
          {
            label: 'Production (kWh)',
            data: analyticsResult.energyData.map(d => d.production),
            borderColor: 'rgb(75, 192, 192)',
            backgroundColor: 'rgba(75, 192, 192, 0.5)',
            borderWidth: 2,
            tension: 0.3,
          },
          {
            label: 'Grid Import (kWh)',
            data: analyticsResult.energyData.map(d => d.gridImport),
            borderColor: 'rgb(54, 162, 235)',
            backgroundColor: 'rgba(54, 162, 235, 0.5)',
            borderWidth: 2,
            tension: 0.3,
          },
          {
            label: 'Grid Export (kWh)',
            data: analyticsResult.energyData.map(d => d.gridExport),
            borderColor: 'rgb(153, 102, 255)',
            backgroundColor: 'rgba(153, 102, 255, 0.5)',
            borderWidth: 2,
            tension: 0.3,
          }
        ]
      };

      // Battery SOC chart if available
      if (analyticsResult.energyData.some(d => d.batterySoc !== undefined)) {
        const batteryChartData = {
          labels,
          datasets: [
            {
              label: 'Battery SOC (%)',
              data: analyticsResult.energyData.map(d => d.batterySoc || 0),
              borderColor: 'rgb(255, 159, 64)',
              backgroundColor: 'rgba(255, 159, 64, 0.5)',
              fill: true,
              borderWidth: 2,
              tension: 0.4,
            }
          ]
        };

        return (
          <div className="space-y-6">
            <div className="h-[300px]">
              <Line data={energyChartData} options={chartOptions} />
            </div>
            <div className="h-[200px]">
              <Line data={batteryChartData} options={chartOptions} />
            </div>
          </div>
        );
      }

      return (
        <div className="h-[350px]">
          <Line data={energyChartData} options={chartOptions} />
        </div>
      );
    }

    // Tariff data visualization
    if (analyticsResult.tariffData && analyticsResult.tariffData.length > 0) {
      const labels = analyticsResult.tariffData.map(d => new Date(d.timestamp).toLocaleString());
      
      // Map period types to colors
      const periodColors: {[key: string]: string} = {
        'peak': 'rgba(255, 99, 132, 0.5)',
        'shoulder': 'rgba(255, 159, 64, 0.5)',
        'off-peak': 'rgba(75, 192, 192, 0.5)',
        'default': 'rgba(153, 102, 255, 0.5)'
      };
      
      // Colorize background based on period type
      const backgroundColor = analyticsResult.tariffData.map(d => {
        const periodType = d.periodType?.toLowerCase() || 'default';
        return periodColors[periodType] || periodColors.default;
      });
      
      const tariffChartData = {
        labels,
        datasets: [
          {
            label: 'Electricity Rate ($/kWh)',
            data: analyticsResult.tariffData.map(d => d.rate),
            backgroundColor,
            borderWidth: 1,
          }
        ]
      };
      
      return (
        <div className="h-[350px]">
          <Bar data={tariffChartData} options={chartOptions} />
        </div>
      );
    }

    // Carbon intensity visualization
    if (analyticsResult.carbonData && analyticsResult.carbonData.length > 0) {
      const labels = analyticsResult.carbonData.map(d => new Date(d.timestamp).toLocaleString());
      
      const carbonChartData = {
        labels,
        datasets: [
          {
            label: 'Carbon Intensity (gCO₂/kWh)',
            data: analyticsResult.carbonData.map(d => d.carbonIntensity),
            borderColor: 'rgb(75, 192, 192)',
            backgroundColor: 'rgba(75, 192, 192, 0.5)',
            borderWidth: 2,
            tension: 0.3,
            yAxisID: 'y',
          },
          {
            label: 'Renewable Percentage (%)',
            data: analyticsResult.carbonData.map(d => d.renewablePercentage),
            borderColor: 'rgb(153, 102, 255)',
            backgroundColor: 'rgba(153, 102, 255, 0.5)',
            borderWidth: 2,
            tension: 0.3,
            yAxisID: 'y1',
          }
        ]
      };
      
      const carbonChartOptions = {
        ...chartOptions,
        scales: {
          ...chartOptions.scales,
          y: {
            type: 'linear' as const,
            display: true,
            position: 'left' as const,
            title: {
              display: true,
              text: 'Carbon Intensity (gCO₂/kWh)'
            }
          },
          y1: {
            type: 'linear' as const,
            display: true,
            position: 'right' as const,
            grid: {
              drawOnChartArea: false,
            },
            title: {
              display: true,
              text: 'Renewable Percentage (%)'
            },
            min: 0,
            max: 100
          }
        }
      };
      
      return (
        <div className="h-[350px]">
          <Line data={carbonChartData} options={carbonChartOptions} />
        </div>
      );
    }
    
    // Device consumption breakdown
    if (analyticsResult.deviceConsumption && analyticsResult.deviceConsumption.length > 0) {
      const labels = analyticsResult.deviceConsumption.map(d => d.deviceName || d.deviceType);
      
      const colors = [
        'rgba(255, 99, 132, 0.7)',
        'rgba(54, 162, 235, 0.7)',
        'rgba(255, 206, 86, 0.7)',
        'rgba(75, 192, 192, 0.7)',
        'rgba(153, 102, 255, 0.7)',
        'rgba(255, 159, 64, 0.7)',
        'rgba(199, 199, 199, 0.7)',
      ];
      
      const deviceChartData = {
        labels,
        datasets: [
          {
            label: 'Device Consumption (%)',
            data: analyticsResult.deviceConsumption.map(d => d.percentage),
            backgroundColor: labels.map((_, i) => colors[i % colors.length]),
            borderColor: labels.map((_, i) => colors[i % colors.length].replace('0.7', '1')),
            borderWidth: 1,
          }
        ]
      };
      
      return (
        <div className="h-[350px]">
          <div className="flex justify-center items-center h-full">
            <div className="w-[300px] h-[300px]">
              <Pie data={deviceChartData} options={chartOptions} />
            </div>
          </div>
        </div>
      );
    }
    
    // Summary metrics chart for general analytics
    if (analyticsResult.savingsAmount !== undefined || 
        analyticsResult.optimizationPotential !== undefined || 
        analyticsResult.selfConsumptionRate !== undefined || 
        analyticsResult.selfSufficiencyRate !== undefined) {
      
      const labels = ['Current Performance', 'Optimization Potential'];
      
      const summaryChartData = {
        labels,
        datasets: [
          {
            label: 'Self-Consumption Rate (%)',
            data: [
              analyticsResult.selfConsumptionRate || 0, 
              (analyticsResult.selfConsumptionRate || 0) + (analyticsResult.optimizationPotential || 0)
            ],
            backgroundColor: 'rgba(75, 192, 192, 0.5)',
          },
          {
            label: 'Self-Sufficiency Rate (%)',
            data: [
              analyticsResult.selfSufficiencyRate || 0, 
              (analyticsResult.selfSufficiencyRate || 0) + (analyticsResult.optimizationPotential || 0)
            ],
            backgroundColor: 'rgba(153, 102, 255, 0.5)',
          }
        ]
      };
      
      return (
        <div className="h-[350px]">
          <Bar data={summaryChartData} options={chartOptions} />
        </div>
      );
    }
    
    // Simplified pie chart for general distribution
    if (analyticsResult.chartType === 'pie' && analyticsResult.totalConsumption && analyticsResult.totalProduction) {
      const pieChartData = {
        labels: ['Consumption', 'Production', 'Grid Import', 'Grid Export'],
        datasets: [
          {
            data: [
              analyticsResult.totalConsumption || 0,
              analyticsResult.totalProduction || 0,
              analyticsResult.totalConsumption - (analyticsResult.totalProduction || 0) > 0 ? 
                analyticsResult.totalConsumption - (analyticsResult.totalProduction || 0) : 0,
              analyticsResult.totalProduction - (analyticsResult.totalConsumption || 0) > 0 ? 
                analyticsResult.totalProduction - (analyticsResult.totalConsumption || 0) : 0
            ],
            backgroundColor: [
              'rgba(255, 99, 132, 0.6)',
              'rgba(75, 192, 192, 0.6)',
              'rgba(54, 162, 235, 0.6)',
              'rgba(153, 102, 255, 0.6)'
            ],
            borderColor: [
              'rgb(255, 99, 132)',
              'rgb(75, 192, 192)',
              'rgb(54, 162, 235)',
              'rgb(153, 102, 255)'
            ],
            borderWidth: 1,
          }
        ]
      };
      
      return (
        <div className="h-[350px]">
          <div className="h-full w-full flex justify-center">
            <div style={{ width: '80%', maxWidth: '350px' }}>
              <Doughnut data={pieChartData} options={chartOptions} />
            </div>
          </div>
        </div>
      );
    }
    
    // Default visualization when no specific chart data is available
    return null;
  };

  // Display insights from analytics results
  const renderInsights = () => {
    if (!analyticsResult) {
      return (
        <Alert>
          <AlertTitle>No data available</AlertTitle>
          <AlertDescription>
            No analytics results available. Try running an analysis first.
          </AlertDescription>
        </Alert>
      );
    }

    // Get the enhanced result with appropriate type safety
    const enhancedResult = analyticsResult as EnhancedAnalyticsResult;

    // Render the chart if data is available
    const chart = renderChart();

    return (
      <div className="space-y-6">
        {/* Render chart visualization if available */}
        {chart && (
          <Card>
            <CardHeader>
              <CardTitle>Energy Data Visualization</CardTitle>
              <CardDescription>Visual representation of your energy analytics</CardDescription>
            </CardHeader>
            <CardContent>{chart}</CardContent>
          </Card>
        )}

        {/* Key metrics display */}
        {(enhancedResult.totalConsumption !== undefined || 
          enhancedResult.totalProduction !== undefined || 
          enhancedResult.totalCost !== undefined ||
          enhancedResult.peakDemand !== undefined) && (
          <Card>
            <CardHeader>
              <CardTitle>Key Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {enhancedResult.totalConsumption !== undefined && (
                  <div className="text-center p-2 border rounded-md">
                    <p className="text-xs text-muted-foreground">Total Consumption</p>
                    <p className="text-2xl font-semibold">{enhancedResult.totalConsumption} kWh</p>
                  </div>
                )}
                
                {enhancedResult.totalProduction !== undefined && (
                  <div className="text-center p-2 border rounded-md">
                    <p className="text-xs text-muted-foreground">Total Production</p>
                    <p className="text-2xl font-semibold">{enhancedResult.totalProduction} kWh</p>
                  </div>
                )}
                
                {enhancedResult.totalCost !== undefined && (
                  <div className="text-center p-2 border rounded-md">
                    <p className="text-xs text-muted-foreground">Total Cost</p>
                    <p className="text-2xl font-semibold">${enhancedResult.totalCost.toFixed(2)}</p>
                  </div>
                )}
                
                {enhancedResult.peakDemand !== undefined && (
                  <div className="text-center p-2 border rounded-md">
                    <p className="text-xs text-muted-foreground">Peak Demand</p>
                    <p className="text-2xl font-semibold">{enhancedResult.peakDemand} kW</p>
                  </div>
                )}
                
                {enhancedResult.selfConsumptionRate !== undefined && (
                  <div className="text-center p-2 border rounded-md">
                    <p className="text-xs text-muted-foreground">Self-Consumption</p>
                    <p className="text-2xl font-semibold">{enhancedResult.selfConsumptionRate}%</p>
                  </div>
                )}
                
                {enhancedResult.savingsAmount !== undefined && (
                  <div className="text-center p-2 border rounded-md">
                    <p className="text-xs text-muted-foreground">Potential Savings</p>
                    <p className="text-2xl font-semibold">${enhancedResult.savingsAmount.toFixed(2)}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Detailed insights section */}
        {enhancedResult.insights && enhancedResult.insights.length > 0 ? (
          <div className="space-y-4">
            {enhancedResult.insights.map((insight: any, index: number) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle className="text-lg">{insight.description}</CardTitle>
                </CardHeader>
                <CardContent>
                  {insight.type === 'device_peak_contribution' && (
                    <div className="space-y-2">
                      {insight.deviceContributions && (
                        <div>
                          <h4 className="font-semibold mb-2">Device Contributions:</h4>
                          {insight.deviceContributions.map((device: any, i: number) => (
                            <div key={i} className="flex justify-between py-1 border-b">
                              <span>{device.deviceType}</span>
                              <span className="font-medium">{device.percentage.toFixed(1)}%</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {insight.type === 'optimization_recommendations' && (
                    <div className="space-y-2">
                      {insight.recommendations && (
                        <div>
                          <h4 className="font-semibold mb-2">Recommendations:</h4>
                          {insight.recommendations.map((rec: any, i: number) => (
                            <div key={i} className="p-2 mb-2 bg-muted rounded-md">
                              <div className="font-medium">{rec.description}</div>
                              <div className="text-sm text-muted-foreground">{rec.details}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Default renderer for other insight types */}
                  {!['device_peak_contribution', 'optimization_recommendations'].includes(insight.type) && (
                    <pre className="bg-muted p-2 rounded-md overflow-auto text-xs">
                      {JSON.stringify(insight, null, 2)}
                    </pre>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Alert>
            <AlertTitle>Analysis Summary</AlertTitle>
            <AlertDescription>
              {enhancedResult.summary || 'No detailed insights could be derived from the current data.'}
            </AlertDescription>
          </Alert>
        )}
        
        {/* Findings and recommendations */}
        {(enhancedResult.findings || enhancedResult.recommendations) && (
          <Card>
            <CardHeader>
              <CardTitle>Analysis Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {enhancedResult.findings && enhancedResult.findings.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Key Findings:</h3>
                  <ul className="space-y-2 pl-5 list-disc">
                    {enhancedResult.findings.map((finding, index) => (
                      <li key={index}>{finding}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {enhancedResult.recommendations && enhancedResult.recommendations.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Recommendations:</h3>
                  <ul className="space-y-2 pl-5 list-disc">
                    {enhancedResult.recommendations.map((recommendation, index) => (
                      <li key={index}>{recommendation}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports & Analytics</h1>
          <p className="text-muted-foreground">
            Generate detailed reports and run analytics on your energy data
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="reports" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Report Generator
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics Tool
          </TabsTrigger>
        </TabsList>

        {/* Reports Tab */}
        <TabsContent value="reports" className="space-y-6 pt-4">
          <div className="flex space-x-4 mb-4">
            <Button 
              variant={reportTabView === 'custom' ? 'default' : 'outline'} 
              onClick={() => setReportTabView('custom')}
              className="flex items-center gap-2"
            >
              <FileText className="h-4 w-4" />
              Custom Report
            </Button>
            <Button 
              variant={reportTabView === 'templates' ? 'default' : 'outline'} 
              onClick={() => setReportTabView('templates')}
              className="flex items-center gap-2"
            >
              <FileText className="h-4 w-4" />
              Report Templates
            </Button>
          </div>
          
          {reportTabView === 'templates' ? (
            <div className="grid gap-6 md:grid-cols-2">
              {/* Template Selection */}
              <Card>
                <CardHeader>
                  <CardTitle>Report Templates</CardTitle>
                  <CardDescription>Choose a predefined report template</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isLoadingReportTemplates ? (
                    <Skeleton className="h-[400px] w-full" />
                  ) : (
                    <div className="space-y-4">
                      {reportTemplates?.length === 0 ? (
                        <Alert>
                          <AlertTitle>No templates available</AlertTitle>
                          <AlertDescription>
                            No report templates are currently available. Try creating a custom report instead.
                          </AlertDescription>
                        </Alert>
                      ) : (
                        <div className="grid gap-4">
                          {reportTemplates?.map((template) => (
                            <div 
                              key={template.id} 
                              className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                                selectedTemplate === template.id 
                                  ? 'border-primary bg-primary/5' 
                                  : 'border-border hover:border-primary/50'
                              }`}
                              onClick={() => setSelectedTemplate(template.id)}
                            >
                              <div className="font-medium">{template.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {template.description}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      <Button 
                        className="w-full mt-4" 
                        onClick={handleGenerateFromTemplate} 
                        disabled={isGeneratingReport || !selectedTemplate}
                      >
                        {isGeneratingReport ? (
                          <>
                            <RotateCw className="mr-2 h-4 w-4 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <Download className="mr-2 h-4 w-4" />
                            Generate Report
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
              
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Template Information</CardTitle>
                    <CardDescription>About the selected template</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {selectedTemplate && reportTemplates ? (
                      <div className="space-y-4">
                        <div>
                          <h3 className="font-medium">Description</h3>
                          <p className="text-muted-foreground">
                            {reportTemplates.find(t => t.id === selectedTemplate)?.description || 'No description available'}
                          </p>
                        </div>
                        <div>
                          <h3 className="font-medium">Usage</h3>
                          <p className="text-muted-foreground">
                            Select the template and click "Generate Report" to download a pre-configured report.
                            Templates use default settings for format and time periods.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <FileText className="mx-auto h-12 w-12 mb-4 opacity-20" />
                        <p>Select a template to see details</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {/* Report Options */}
              <Card>
                <CardHeader>
                  <CardTitle>Report Options</CardTitle>
                  <CardDescription>Configure your report parameters</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Report Type */}
                  <div className="space-y-2">
                    <Label htmlFor="reportType">Report Type</Label>
                    {isLoadingReportTypes ? (
                      <Skeleton className="h-10 w-full" />
                    ) : (
                      <Select value={selectedReportType} onValueChange={setSelectedReportType}>
                        <SelectTrigger id="reportType">
                          <SelectValue placeholder="Select report type" />
                        </SelectTrigger>
                        <SelectContent>
                          {reportTypes?.map((type) => (
                            <SelectItem key={type.id} value={type.id}>
                              {type.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    {selectedReportType && reportTypes && (
                      <p className="text-xs text-muted-foreground">
                        {reportTypes.find(t => t.id === selectedReportType)?.description}
                      </p>
                    )}
                  </div>

                  {/* Report Format */}
                  <div className="space-y-2">
                    <Label>Report Format</Label>
                    {isLoadingReportFormats ? (
                      <Skeleton className="h-20 w-full" />
                    ) : (
                      <RadioGroup value={selectedFormat} onValueChange={setSelectedFormat} className="flex gap-4">
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="pdf" id="pdf" />
                          <Label htmlFor="pdf" className="flex items-center gap-2 cursor-pointer">
                            <FileText className="h-5 w-5 text-red-500" />
                            PDF
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="excel" id="excel" />
                          <Label htmlFor="excel" className="flex items-center gap-2 cursor-pointer">
                            <FileSpreadsheetIcon className="h-5 w-5 text-green-600" />
                            Excel
                          </Label>
                        </div>
                      </RadioGroup>
                    )}
                  </div>

                  {/* Time Period */}
                  <div className="space-y-2">
                    <Label htmlFor="timePeriod">Time Period</Label>
                    {isLoadingTimePeriods ? (
                      <Skeleton className="h-10 w-full" />
                    ) : (
                      <Select value={selectedTimePeriod} onValueChange={setSelectedTimePeriod}>
                        <SelectTrigger id="timePeriod">
                          <SelectValue placeholder="Select time period" />
                        </SelectTrigger>
                        <SelectContent>
                          {timePeriods?.map((period) => (
                            <SelectItem key={period.id} value={period.id}>
                              {period.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  {/* Custom Date Range */}
                  {selectedTimePeriod === 'custom' && (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="startDate">Start Date</Label>
                        <DatePicker 
                          date={startDate} 
                          setDate={setStartDate} 
                          className="w-full"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="endDate">End Date</Label>
                        <DatePicker 
                          date={endDate} 
                          setDate={setEndDate} 
                          className="w-full"
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Report Preview */}
              <Card>
                <CardHeader>
                  <CardTitle>Report Preview</CardTitle>
                  <CardDescription>Review and generate your report</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="rounded-md border p-4 bg-muted/30">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Report Type:</span>
                        <span className="font-medium">
                          {selectedReportType 
                            ? reportTypes?.find(t => t.id === selectedReportType)?.name || selectedReportType
                            : 'Not selected'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Format:</span>
                        <span className="font-medium flex items-center gap-1">
                          {selectedFormat === 'pdf' ? (
                            <>
                              <FileText className="h-4 w-4 text-red-500" /> PDF
                            </>
                          ) : (
                            <>
                              <FileSpreadsheetIcon className="h-4 w-4 text-green-600" /> Excel
                            </>
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Time Period:</span>
                        <span className="font-medium flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {timePeriods?.find(p => p.id === selectedTimePeriod)?.name || selectedTimePeriod}
                        </span>
                      </div>
                      {selectedTimePeriod === 'custom' && startDate && endDate && (
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Date Range:</span>
                          <span className="font-medium">
                            {startDate.toLocaleDateString()} - {endDate.toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Button 
                      className="w-full" 
                      onClick={handleGenerateReport} 
                      disabled={isGeneratingReport || !selectedReportType}
                    >
                      {isGeneratingReport ? (
                        <>
                          <RotateCw className="mr-2 h-4 w-4 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Download className="mr-2 h-4 w-4" />
                          Generate Report
                        </>
                      )}
                    </Button>
                    <p className="text-xs text-center text-muted-foreground">
                      Report will be downloaded to your device
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6 pt-4">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Analytics Options */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle>Analytics Options</CardTitle>
                <CardDescription>Configure your analytics parameters</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Analytics Type */}
                <div className="space-y-2">
                  <Label htmlFor="analyticsType">Analytics Type</Label>
                  {isLoadingAnalyticsTypes ? (
                    <Skeleton className="h-10 w-full" />
                  ) : (
                    <Select value={selectedAnalyticsType} onValueChange={setSelectedAnalyticsType}>
                      <SelectTrigger id="analyticsType">
                        <SelectValue placeholder="Select analytics type" />
                      </SelectTrigger>
                      <SelectContent>
                        {analyticsTypes?.map((type) => (
                          <SelectItem key={type.id} value={type.id}>
                            {type.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {selectedAnalyticsType && analyticsTypes && (
                    <p className="text-xs text-muted-foreground">
                      {analyticsTypes.find(t => t.id === selectedAnalyticsType)?.description}
                    </p>
                  )}
                </div>

                {/* Time Granularity */}
                <div className="space-y-2">
                  <Label htmlFor="granularity">Time Granularity</Label>
                  {isLoadingTimeGranularities ? (
                    <Skeleton className="h-10 w-full" />
                  ) : (
                    <Select value={selectedGranularity} onValueChange={setSelectedGranularity}>
                      <SelectTrigger id="granularity">
                        <SelectValue placeholder="Select time granularity" />
                      </SelectTrigger>
                      <SelectContent>
                        {timeGranularities?.map((granularity) => (
                          <SelectItem key={granularity.id} value={granularity.id}>
                            {granularity.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {/* Date Range */}
                <div className="space-y-2">
                  <Label>Date Range</Label>
                  <div className="grid gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="analyticsStartDate">Start Date</Label>
                      <DatePicker 
                        date={analyticsStartDate} 
                        setDate={setAnalyticsStartDate} 
                        className="w-full"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="analyticsEndDate">End Date</Label>
                      <DatePicker 
                        date={analyticsEndDate} 
                        setDate={setAnalyticsEndDate} 
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>

                <Button 
                  className="w-full mt-4" 
                  onClick={handleRunAnalytics} 
                  disabled={isRunningAnalytics || !selectedAnalyticsType}
                >
                  {isRunningAnalytics ? (
                    <>
                      <RotateCw className="mr-2 h-4 w-4 animate-spin" />
                      Running...
                    </>
                  ) : (
                    <>
                      <BarChart3 className="mr-2 h-4 w-4" />
                      Run Analytics
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Analytics Results */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Analytics Results</CardTitle>
                <CardDescription>Insights from your energy data</CardDescription>
              </CardHeader>
              <CardContent>
                {isRunningAnalytics ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <RotateCw className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
                    <p>Processing analytics...</p>
                  </div>
                ) : analyticsResult ? (
                  renderInsights()
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <BarChart3 className="mx-auto h-12 w-12 mb-4 opacity-20" />
                    <p>Run analytics to view insights</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ReportsPage;