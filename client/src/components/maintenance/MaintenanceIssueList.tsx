import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Wrench, CheckCircle2, FileText, ClipboardList } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export interface MaintenanceIssue {
  id: number;
  deviceId: number;
  deviceName?: string;
  title: string;
  description?: string;
  severity: "low" | "medium" | "high" | "critical";
  status: "pending" | "scheduled" | "in_progress" | "completed" | "cancelled";
  type: "preventive" | "corrective" | "predictive" | "condition_based" | "inspection";
  detectedAt: Date;
  predictedFailureAt?: Date;
  resolvedAt?: Date;
  resolution?: string;
  anomalyScore?: number;
  confidenceScore?: number;
  assignedTo?: number;
  assigneeName?: string;
}

interface MaintenanceIssueListProps {
  issues: MaintenanceIssue[];
  onViewIssue: (issueId: number) => void;
  onResolveIssue: (issueId: number) => void;
}

const getSeverityBadge = (severity: string) => {
  switch (severity) {
    case "low":
      return <Badge variant="outline" className="bg-blue-100 text-blue-800 hover:bg-blue-100">Low</Badge>;
    case "medium":
      return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Medium</Badge>;
    case "high":
      return <Badge variant="outline" className="bg-orange-100 text-orange-800 hover:bg-orange-100">High</Badge>;
    case "critical":
      return <Badge variant="outline" className="bg-red-100 text-red-800 hover:bg-red-100">Critical</Badge>;
    default:
      return <Badge variant="outline">Unknown</Badge>;
  }
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case "pending":
      return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">Pending</Badge>;
    case "scheduled":
      return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Scheduled</Badge>;
    case "in_progress":
      return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">In Progress</Badge>;
    case "completed":
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Completed</Badge>;
    case "cancelled":
      return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Cancelled</Badge>;
    default:
      return <Badge>Unknown</Badge>;
  }
};

const getMaintenanceTypeIcon = (type: string) => {
  switch (type) {
    case "preventive":
      return <ClipboardList className="h-5 w-5 text-blue-500" />;
    case "corrective":
      return <Wrench className="h-5 w-5 text-orange-500" />;
    case "predictive":
      return <FileText className="h-5 w-5 text-purple-500" />;
    case "condition_based":
      return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    default:
      return <ClipboardList className="h-5 w-5 text-gray-500" />;
  }
};

const IssueItem: React.FC<{
  issue: MaintenanceIssue;
  onViewIssue: (issueId: number) => void;
  onResolveIssue: (issueId: number) => void;
}> = ({ issue, onViewIssue, onResolveIssue }) => {
  const isResolved = issue.status === "completed" || issue.status === "cancelled";
  
  return (
    <Card className="mb-3">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2">
            {getMaintenanceTypeIcon(issue.type)}
            <div>
              <CardTitle className="text-sm">{issue.deviceName || `Device ${issue.deviceId}`}</CardTitle>
              <CardDescription className="text-xs capitalize">
                {issue.type.replace("_", " ")} maintenance
              </CardDescription>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            {getStatusBadge(issue.status)}
            {getSeverityBadge(issue.severity)}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm font-medium mb-1">{issue.title}</p>
        {issue.description && (
          <p className="text-xs text-muted-foreground mb-2">{issue.description}</p>
        )}
        
        <div className="flex justify-between items-end mt-2">
          <div className="flex flex-col gap-1">
            <div className="text-xs text-muted-foreground">
              Detected {formatDistanceToNow(new Date(issue.detectedAt))} ago
            </div>
            {issue.assigneeName && (
              <div className="text-xs text-muted-foreground">
                Assigned to: {issue.assigneeName}
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => onViewIssue(issue.id)}
              className="text-xs h-7 px-2"
            >
              Details
            </Button>
            {!isResolved && (
              <Button 
                variant="default" 
                size="sm" 
                onClick={() => onResolveIssue(issue.id)}
                className="text-xs h-7 px-2"
              >
                Resolve
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const MaintenanceIssueList: React.FC<MaintenanceIssueListProps> = ({
  issues,
  onViewIssue,
  onResolveIssue,
}) => {
  if (issues.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle2 className="mx-auto h-8 w-8 mb-2" />
            <p>No maintenance issues</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {issues.map((issue) => (
        <IssueItem
          key={issue.id}
          issue={issue}
          onViewIssue={onViewIssue}
          onResolveIssue={onResolveIssue}
        />
      ))}
    </div>
  );
};

export default MaintenanceIssueList;