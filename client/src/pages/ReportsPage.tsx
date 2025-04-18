import React, { useState } from 'react';
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
import { FileText, FileSpreadsheetIcon, Calendar, BarChart3, Save, Download, RotateCw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

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

const ReportsPage: React.FC = () => {
  const { toast } = useToast();
  const { currentSiteId } = useSiteContext();
  const [activeTab, setActiveTab] = useState('reports');
  
  // Reports state
  const [selectedReportType, setSelectedReportType] = useState<string>('');
  const [selectedFormat, setSelectedFormat] = useState<string>('pdf');
  const [selectedTimePeriod, setSelectedTimePeriod] = useState<string>('month');
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  
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

  // Display insights from analytics results
  const renderInsights = () => {
    if (!analyticsResult || !analyticsResult.insights || analyticsResult.insights.length === 0) {
      return (
        <Alert>
          <AlertTitle>No insights available</AlertTitle>
          <AlertDescription>
            No insights could be derived from the current data. Try a different date range or analytics type.
          </AlertDescription>
        </Alert>
      );
    }

    return (
      <div className="space-y-4">
        {analyticsResult.insights.map((insight: any, index: number) => (
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
              
              {/* Add more insight type renderers as needed */}
              
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
                    disabled={!selectedReportType || isGeneratingReport}
                  >
                    {isGeneratingReport ? (
                      <>
                        <RotateCw className="mr-2 h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
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
                        <SelectValue placeholder="Select granularity" />
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
                  disabled={!selectedAnalyticsType || isRunningAnalytics}
                >
                  {isRunningAnalytics ? (
                    <>
                      <RotateCw className="mr-2 h-4 w-4 animate-spin" />
                      Running Analysis...
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
                <CardDescription>
                  {analyticsResult 
                    ? `Results for ${analyticsResult.analyticsType} analysis`
                    : 'Configure your options and run analytics to see results'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isRunningAnalytics ? (
                  <div className="space-y-4 py-8">
                    <div className="flex justify-center">
                      <RotateCw className="h-12 w-12 animate-spin text-primary/70" />
                    </div>
                    <p className="text-center text-muted-foreground">
                      Processing data and generating insights...
                    </p>
                  </div>
                ) : analyticsResult ? (
                  <div className="space-y-6">
                    {/* Display key metrics */}
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                      <Card className="bg-muted/50">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium">Site</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">{analyticsResult.siteId}</div>
                        </CardContent>
                      </Card>
                      
                      <Card className="bg-muted/50">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium">Time Range</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-sm font-medium">
                            {new Date(analyticsResult.startDate).toLocaleDateString()} - {new Date(analyticsResult.endDate).toLocaleDateString()}
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Card className="bg-muted/50">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium">Type</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-sm font-medium">
                            {analyticsTypes?.find(t => t.id === analyticsResult.analyticsType)?.name || analyticsResult.analyticsType}
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Card className="bg-muted/50">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium">Granularity</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-sm font-medium">
                            {timeGranularities?.find(g => g.id === analyticsResult.granularity)?.name || analyticsResult.granularity}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                    
                    {/* Display insights */}
                    <div>
                      <h3 className="text-lg font-medium mb-4">Key Insights</h3>
                      {renderInsights()}
                    </div>
                  </div>
                ) : (
                  <div className="py-8 text-center text-muted-foreground">
                    <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-20" />
                    <p>Select analytics options and run analysis to see results</p>
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