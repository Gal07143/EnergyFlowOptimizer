import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, AlertCircle, Clock, Calendar } from "lucide-react";
import { Separator } from "@/components/ui/separator";

export interface AIAnalysisResult {
  analysis: string;
  recommendations: string[];
  potentialIssues: string[];
  remainingLifeEstimate?: string;
  generatedAt?: Date;
}

interface AIAnalysisCardProps {
  deviceName: string;
  deviceType: string;
  result: AIAnalysisResult;
  isLoading?: boolean;
}

const AIAnalysisCard: React.FC<AIAnalysisCardProps> = ({
  deviceName,
  deviceType,
  result,
  isLoading = false,
}) => {
  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div className="flex justify-between">
          <div>
            <CardTitle className="text-lg">AI-Powered Analysis</CardTitle>
            <CardDescription>
              {deviceName} ({deviceType.replace("_", " ")})
            </CardDescription>
          </div>
          <Badge variant="secondary" className="h-6">AI Generated</Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-slate-200 rounded w-3/4"></div>
            <div className="h-4 bg-slate-200 rounded w-full"></div>
            <div className="h-4 bg-slate-200 rounded w-5/6"></div>
            <div className="h-4 bg-slate-200 rounded w-4/5"></div>
          </div>
        ) : (
          <>
            <div>
              <h4 className="font-medium text-sm mb-2">Analysis Summary</h4>
              <p className="text-sm text-muted-foreground">{result.analysis}</p>
            </div>
            
            {result.remainingLifeEstimate && (
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>Estimated remaining lifetime: <strong>{result.remainingLifeEstimate}</strong></span>
              </div>
            )}
            
            <Separator />
            
            <div>
              <div className="flex items-center mb-2">
                <AlertCircle className="h-4 w-4 text-red-500 mr-2" />
                <h4 className="font-medium text-sm">Potential Issues</h4>
              </div>
              
              <ul className="space-y-1">
                {result.potentialIssues.map((issue, index) => (
                  <li key={index} className="text-sm text-muted-foreground flex gap-2">
                    <span className="text-red-500">•</span>
                    <span>{issue}</span>
                  </li>
                ))}
                {result.potentialIssues.length === 0 && (
                  <li className="text-sm text-muted-foreground">No issues detected</li>
                )}
              </ul>
            </div>
            
            <Separator />
            
            <div>
              <div className="flex items-center mb-2">
                <Lightbulb className="h-4 w-4 text-yellow-500 mr-2" />
                <h4 className="font-medium text-sm">Recommendations</h4>
              </div>
              
              <ul className="space-y-1">
                {result.recommendations.map((rec, index) => (
                  <li key={index} className="text-sm text-muted-foreground flex gap-2">
                    <span className="text-yellow-500">•</span>
                    <span>{rec}</span>
                  </li>
                ))}
                {result.recommendations.length === 0 && (
                  <li className="text-sm text-muted-foreground">No recommendations available</li>
                )}
              </ul>
            </div>
          </>
        )}
      </CardContent>
      
      <CardFooter className="text-xs text-muted-foreground">
        {result.generatedAt && (
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>Generated: {new Date(result.generatedAt).toLocaleDateString()} {new Date(result.generatedAt).toLocaleTimeString()}</span>
          </div>
        )}
      </CardFooter>
    </Card>
  );
};

export default AIAnalysisCard;