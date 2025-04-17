import React, { useState, useEffect, useRef } from 'react';
const { memo } = React;

// Memoized anomaly chart component
const AnomalyChart = memo(({ data }: { 
  data: Array<any> 
}) => {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <ScatterChart margin={{ top: 20, right: 30, left: 20, bottom: 10 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis 
          dataKey="timestamp" 
          name="Time" 
          allowDuplicatedCategory={false} 
          type="category" 
        />
        <YAxis 
          dataKey="actual" 
          name="Energy" 
          unit=" kWh" 
          domain={['auto', 'auto']}
        />
        <ZAxis 
          dataKey="severity" 
          range={[50, 200]} 
          name="Severity" 
        />
        <Tooltip 
          cursor={{ strokeDasharray: '3 3' }}
          formatter={(value, name) => {
            if (name === 'Actual') return [`${value} kWh`, name];
            if (name === 'Expected') return [`${value} kWh`, name];
            return [value, name];
          }}
        />
        <Legend />
        <Scatter 
          name="Actual" 
          data={data} 
          fill="#FF5252"
          shape="triangle"
        />
        <Scatter 
          name="Expected" 
          data={data}
          dataKey="expected"
          fill="#4CAF50"
          shape="circle"
        />
      </ScatterChart>
    </ResponsiveContainer>
  );
});
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  ReferenceLine,
  Scatter,
  ScatterChart,
  ZAxis,
  ReferenceArea
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Loader2, AlertTriangle, TrendingDown, TrendingUp, Activity } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { apiRequest } from '@/lib/queryClient';
import { useSiteSelector } from '@/hooks/useSiteData';
import { format } from 'date-fns';

// Types for consumption patterns
interface PatternPrediction {
  timestamp: string;
  predictedConsumption: number;
  confidenceInterval: {
    lower: number;
    upper: number;
  };
  probability: number;
  features: Record<string, any>;
}

interface ConsumptionPattern {
  id: number;
  siteId: number;
  name: string;
  description?: string;
  timeFrame: 'hourly' | 'daily' | 'weekly' | 'monthly' | 'seasonally';
  usageCategory: 'base_load' | 'peak_load' | 'variable_load';
  source: 'grid' | 'solar' | 'battery' | 'ev_charger' | 'heat_pump' | 'other';
  startTimestamp: string;
  endTimestamp: string;
  patternData: {
    timestamps: string[];
    values: number[];
    averageValue: number;
    peakValue: number;
    minValue: number;
    standardDeviation: number;
  };
  correlations: Record<string, number>;
  ml: {
    modelType: string;
    features: string[];
    weights?: number[];
    accuracy: number;
    lastTraining: string;
    predictions?: PatternPrediction[];
  };
  createdAt: string;
  updatedAt: string;
}

// Types for anomalies
interface EnergyReading {
  timestamp: string;
  homePower?: number;
  gridPower?: number;
  solarPower?: number;
  batteryPower?: number;
  homeEnergy?: number;
  gridEnergy?: number;
  solarEnergy?: number;
  batteryEnergy?: number;
}

interface Anomaly {
  reading: EnergyReading;
  patternId: number;
  expectedValue: number;
  deviation: number;
  deviationPercent: number;
  isAnomaly: boolean;
  severity: 'low' | 'medium' | 'high';
  insights: string;
  potentialCauses: string[];
  anomalyType: 'spike' | 'drop' | 'sustained' | 'pattern_change';
}

// Main component
// Memoized pattern chart component to avoid unnecessary re-renders
const PatternChart = memo(({ data, averageValue }: { 
  data: Array<{timestamp: string, value: number}>, 
  averageValue: number 
}) => {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart
        data={data}
        margin={{ top: 20, right: 30, left: 20, bottom: 10 }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="timestamp" />
        <YAxis unit=" kWh" />
        <Tooltip />
        <ReferenceLine
          y={averageValue}
          stroke="#888"
          strokeDasharray="3 3"
          label="Average"
        />
        <Line
          type="monotone"
          dataKey="value"
          name="Energy Usage"
          stroke="#8884d8"
          strokeWidth={2}
          dot={{ r: 3 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
});

// Memoized prediction chart component to avoid unnecessary re-renders
const PredictionChart = memo(({ data }: { 
  data: Array<{timestamp: string, predicted: number, upper: number, lower: number}> 
}) => {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart
        data={data}
        margin={{ top: 20, right: 30, left: 20, bottom: 10 }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="timestamp" />
        <YAxis unit=" kWh" />
        <Tooltip />
        <Legend />
        <Line
          type="monotone"
          dataKey="predicted"
          name="Prediction"
          stroke="#8884d8"
          strokeWidth={2}
          dot={{ r: 3 }}
        />
        <Line
          type="monotone"
          dataKey="upper"
          name="Upper Bound"
          stroke="#82ca9d"
          strokeDasharray="5 5"
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="lower"
          name="Lower Bound"
          stroke="#ff8042"
          strokeDasharray="5 5"
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
});

// Main component with optimized performance
export default function ConsumptionPatterns() {
  const { currentSiteId } = useSiteSelector();
  const [loading, setLoading] = useState(true);
  const [patterns, setPatterns] = useState<ConsumptionPattern[]>([]);
  const [selectedPattern, setSelectedPattern] = useState<number | null>(null);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [view, setView] = useState<'patterns' | 'anomalies'>('patterns');
  const [timeframe, setTimeframe] = useState<'hourly' | 'daily' | 'weekly' | 'monthly'>('daily');

  // Use a ref to track first render and avoid unnecessary data fetches
  const initialFetchRef = useRef(false);
  
  useEffect(() => {
    // Load patterns when component mounts or site changes
    if (currentSiteId && !initialFetchRef.current) {
      initialFetchRef.current = true;
      fetchPatterns();
    }
  }, [currentSiteId]);

  // Fetch consumption patterns from the API
  const fetchPatterns = async () => {
    setLoading(true);
    try {
      const response = await apiRequest('GET', `/api/sites/${currentSiteId}/consumption-patterns`);
      const data = await response.json();
      setPatterns(data);
      
      // Select the first pattern by default
      if (data.length > 0) {
        setSelectedPattern(data[0].id);
      }
    } catch (error) {
      console.error("Failed to fetch consumption patterns:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch anomalies for the last 7 days
  const fetchAnomalies = async () => {
    setLoading(true);
    try {
      // Create test data for anomaly detection (in real system, this would be historical data)
      const now = new Date();
      const readings: EnergyReading[] = Array.from({ length: 24 }).map((_, i) => {
        const timestamp = new Date();
        timestamp.setHours(now.getHours() - 24 + i);
        
        // Normal power values
        let homePower = 0.2 + Math.random() * 0.3; // Base load
        
        // Add morning peak
        if (i >= 6 && i <= 9) {
          homePower += 0.8 + Math.random() * 0.4;
        }
        
        // Add evening peak
        if (i >= 17 && i <= 22) {
          homePower += 1.2 + Math.random() * 0.8;
        }
        
        // Add anomaly at 19:00
        if (i === 19) {
          homePower = 25; // Significant spike
        }
        
        // Add anomaly at 3:00
        if (i === 3) {
          homePower = 0.01; // Significant drop
        }
        
        return {
          timestamp: timestamp.toISOString(),
          homePower,
          gridPower: homePower * (0.7 + Math.random() * 0.3),
          solarPower: i >= 7 && i <= 19 ? Math.random() * 3 : 0,
          batteryPower: Math.random() * 0.5
        };
      });
      
      const response = await apiRequest('POST', `/api/sites/${currentSiteId}/consumption-patterns/anomalies`, { 
        readings 
      });
      const data = await response.json();
      setAnomalies(data);
    } catch (error) {
      console.error("Failed to fetch anomalies:", error);
    } finally {
      setLoading(false);
    }
  };

  // Train a pattern model
  const trainModel = async (patternId: number) => {
    setLoading(true);
    try {
      await apiRequest('POST', `/api/sites/${currentSiteId}/consumption-patterns/${patternId}/train`, {
        modelType: 'regression',
        featureSelection: ['timeOfDay', 'dayOfWeek', 'isWeekend', 'temperature', 'humidity']
      });
      await fetchPatterns(); // Refresh data
    } catch (error) {
      console.error("Failed to train model:", error);
    } finally {
      setLoading(false);
    }
  };

  // Find the selected pattern
  const currentPattern = patterns.find(p => p.id === selectedPattern);

  // Format pattern data for visualization
  const getPatternChartData = () => {
    if (!currentPattern) return [];
    
    return currentPattern.patternData.timestamps.map((timestamp, index) => ({
      timestamp: format(new Date(timestamp), timeframe === 'hourly' ? 'HH:mm' : 'MM/dd'),
      value: currentPattern.patternData.values[index],
    }));
  };

  // Format prediction data for visualization
  const getPredictionChartData = () => {
    if (!currentPattern || !currentPattern.ml.predictions) return [];
    
    return currentPattern.ml.predictions.map(prediction => ({
      timestamp: format(new Date(prediction.timestamp), timeframe === 'hourly' ? 'HH:mm' : 'MM/dd'),
      predicted: prediction.predictedConsumption,
      lower: prediction.confidenceInterval.lower,
      upper: prediction.confidenceInterval.upper,
    }));
  };

  // Format anomaly data for visualization
  const getAnomalyChartData = () => {
    if (anomalies.length === 0) return [];
    
    // Group by timestamp and sort chronologically
    const sortedAnomalies = [...anomalies].sort((a, b) => 
      new Date(a.reading.timestamp).getTime() - new Date(b.reading.timestamp).getTime()
    );
    
    return sortedAnomalies.map(anomaly => {
      const timestamp = format(new Date(anomaly.reading.timestamp), timeframe === 'hourly' ? 'HH:mm' : 'MM/dd');
      return {
        timestamp,
        actual: anomaly.reading.homePower || anomaly.reading.gridPower || 0,
        expected: anomaly.expectedValue,
        deviation: anomaly.deviation,
        severity: anomaly.severity === 'high' ? 2 : (anomaly.severity === 'medium' ? 1 : 0.5),
        type: anomaly.anomalyType,
        insights: anomaly.insights,
        causes: anomaly.potentialCauses,
      };
    });
  };

  // Get key insights for the selected pattern
  const getPatternInsights = () => {
    if (!currentPattern) return null;
    
    const { correlations, patternData } = currentPattern;
    
    const topCorrelations = Object.entries(correlations)
      .filter(([_, value]) => Math.abs(value) > 0.3)
      .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
      .slice(0, 3);
    
    const variability = patternData.standardDeviation / patternData.averageValue;
    
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Key Insights</h3>
        
        <div>
          <div className="text-sm font-medium mb-1">Pattern Variability</div>
          <div className="text-2xl font-bold">{(variability * 100).toFixed(1)}%</div>
          <p className="text-sm text-gray-500 mt-1">
            {variability < 0.1 ? 'Very stable consumption pattern' : 
             variability < 0.3 ? 'Moderate variability' : 
             'Highly variable consumption pattern'}
          </p>
        </div>
        
        {topCorrelations.length > 0 && (
          <div>
            <div className="text-sm font-medium mb-1">Key Correlations</div>
            <ul className="space-y-2">
              {topCorrelations.map(([factor, value]) => (
                <li key={factor} className="flex items-center justify-between">
                  <span className="capitalize">{factor.replace('_', ' ')}</span>
                  <Badge variant={value > 0 ? "default" : "destructive"}>
                    {value > 0 ? '+' : ''}{(value * 100).toFixed(0)}%
                  </Badge>
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {currentPattern.ml.predictions && (
          <div>
            <div className="text-sm font-medium mb-1">AI Model</div>
            <div className="flex items-center">
              <div className="mr-4">
                <div className="text-xs text-gray-500">Type</div>
                <div className="font-medium">{currentPattern.ml.modelType}</div>
              </div>
              <div className="mr-4">
                <div className="text-xs text-gray-500">Accuracy</div>
                <div className="font-medium">{(currentPattern.ml.accuracy * 100).toFixed(1)}%</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Last Training</div>
                <div className="font-medium">{format(new Date(currentPattern.ml.lastTraining), 'MMM d, yyyy')}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Consumption Patterns & Anomaly Detection</CardTitle>
            <CardDescription>
              Machine learning analysis of energy usage patterns and detection of anomalies
            </CardDescription>
          </div>
          <Tabs value={view} onValueChange={(v) => {
            setView(v as 'patterns' | 'anomalies');
            if (v === 'anomalies' && anomalies.length === 0) {
              fetchAnomalies();
            }
          }}>
            <TabsList>
              <TabsTrigger value="patterns">Patterns</TabsTrigger>
              <TabsTrigger value="anomalies">Anomalies</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">Loading data...</span>
          </div>
        ) : view === 'patterns' ? (
          <>
            {/* Pattern Selection Controls */}
            <div className="flex justify-between items-center mb-6">
              <div className="flex gap-4">
                <Select 
                  value={selectedPattern?.toString()} 
                  onValueChange={(v) => setSelectedPattern(parseInt(v))}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Select pattern" />
                  </SelectTrigger>
                  <SelectContent>
                    {patterns.map(pattern => (
                      <SelectItem key={pattern.id} value={pattern.id.toString()}>
                        {pattern.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Select 
                  value={timeframe} 
                  onValueChange={(v) => setTimeframe(v as 'hourly' | 'daily' | 'weekly' | 'monthly')}
                >
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Time frame" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hourly">Hourly</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {currentPattern && (
                <Button onClick={() => trainModel(currentPattern.id)}>
                  Train Model
                </Button>
              )}
            </div>
            
            {/* Pattern Visualization */}
            {currentPattern ? (
              <>
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="md:col-span-2">
                    <h3 className="text-lg font-medium mb-4">
                      {currentPattern.name}
                      <Badge className="ml-2" 
                        variant={
                          currentPattern.usageCategory === 'base_load' ? 'outline' : 
                          currentPattern.usageCategory === 'peak_load' ? 'default' : 'secondary'
                        }
                      >
                        {currentPattern.usageCategory.replace('_', ' ')}
                      </Badge>
                    </h3>
                    
                    <div className="mb-8">
                      <Tabs defaultValue="historical">
                        <TabsList>
                          <TabsTrigger value="historical">Historical Data</TabsTrigger>
                          <TabsTrigger value="predictions" disabled={!currentPattern.ml.predictions}>
                            AI Predictions
                          </TabsTrigger>
                        </TabsList>
                        <TabsContent value="historical">
                          <PatternChart 
                            data={getPatternChartData()} 
                            averageValue={currentPattern.patternData.averageValue} 
                          />
                        </TabsContent>
                        <TabsContent value="predictions">
                          {currentPattern.ml.predictions ? (
                            <PredictionChart data={getPredictionChartData()} />
                          ) : (
                            <div className="flex items-center justify-center h-64 text-gray-500">
                              No prediction data available. Train the model first.
                            </div>
                          )}
                        </TabsContent>
                      </Tabs>
                    </div>
                  </div>
                  
                  <div>
                    {getPatternInsights()}
                  </div>
                </div>
                
                <p className="text-sm text-gray-500 mt-6">
                  This pattern covers {currentPattern.source} energy from {
                    format(new Date(currentPattern.startTimestamp), 'MMM d, yyyy')
                  } to {
                    format(new Date(currentPattern.endTimestamp), 'MMM d, yyyy')
                  }
                </p>
              </>
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-500">
                No consumption patterns available for this site.
              </div>
            )}
          </>
        ) : (
          <div>
            {anomalies.length > 0 ? (
              <>
                <div className="mb-6">
                  <h3 className="text-lg font-medium mb-2">Detected Anomalies</h3>
                  <p className="text-sm text-gray-500">
                    Found {anomalies.length} anomalies across your energy consumption patterns
                  </p>
                </div>
                
                <div className="mb-6">
                  <AnomalyChart data={getAnomalyChartData()} />
                </div>
                
                <div className="space-y-4">
                  {anomalies.slice(0, 3).map((anomaly, index) => (
                    <Alert 
                      key={index}
                      variant={
                        anomaly.severity === 'high' ? 'destructive' : 'default'
                      }
                    >
                      <div className="flex items-start">
                        {anomaly.anomalyType === 'spike' ? (
                          <TrendingUp className="h-5 w-5 mr-2" />
                        ) : anomaly.anomalyType === 'drop' ? (
                          <TrendingDown className="h-5 w-5 mr-2" />
                        ) : (
                          <Activity className="h-5 w-5 mr-2" />
                        )}
                        <div className="flex-1">
                          <AlertTitle className="text-base">
                            {anomaly.insights}
                          </AlertTitle>
                          <AlertDescription className="text-sm mt-1">
                            <p>
                              Detected at{' '}
                              {format(new Date(anomaly.reading.timestamp), 'MMM d, yyyy h:mm a')}
                              &nbsp;({anomaly.severity} severity)
                            </p>
                            <p className="mt-1">
                              Possible causes:
                            </p>
                            <ul className="mt-1 ml-5 list-disc">
                              {anomaly.potentialCauses.map((cause, idx) => (
                                <li key={idx}>{cause}</li>
                              ))}
                            </ul>
                          </AlertDescription>
                        </div>
                      </div>
                    </Alert>
                  ))}
                  
                  {anomalies.length > 3 && (
                    <Button variant="outline" className="w-full">
                      View {anomalies.length - 3} more anomalies
                    </Button>
                  )}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-64">
                <AlertTriangle className="h-12 w-12 text-gray-400 mb-4" />
                <p className="text-gray-500 mb-4">No anomalies detected in the current data</p>
                <Button onClick={fetchAnomalies}>
                  Analyze for Anomalies
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
      <CardFooter className="text-xs text-gray-500 border-t pt-4">
        ML-based pattern analysis using weighted feature importance and anomaly detection with context-aware insights
      </CardFooter>
    </Card>
  );
}