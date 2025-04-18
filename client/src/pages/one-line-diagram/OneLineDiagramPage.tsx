import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import OneLine from "@/components/one-line-diagram/OneLine";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Info, FileText, HelpCircle } from "lucide-react";

export default function OneLineDiagramPage() {
  return (
    <div className="container mx-auto py-6 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">One-Line Diagram</h1>
          <p className="text-muted-foreground mt-1">
            Create and manage electrical system diagrams
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <HoverCard>
            <HoverCardTrigger asChild>
              <Button variant="outline" size="sm">
                <HelpCircle className="h-4 w-4 mr-2" />
                Help
              </Button>
            </HoverCardTrigger>
            <HoverCardContent className="w-80">
              <div className="space-y-1">
                <h4 className="text-sm font-semibold">Using the One-Line Diagram</h4>
                <p className="text-sm text-muted-foreground">
                  Drag and drop components from the palette to create your electrical system diagram. Connect components by dragging from one handle to another.
                </p>
                <div className="pt-2">
                  <ul className="text-xs space-y-1 list-disc list-inside text-muted-foreground">
                    <li>Zoom using mouse wheel</li>
                    <li>Pan by dragging the canvas</li>
                    <li>Click on components to select</li>
                    <li>Use the Export button to save your diagram</li>
                  </ul>
                </div>
              </div>
            </HoverCardContent>
          </HoverCard>
          
          <Button>
            <FileText className="h-4 w-4 mr-2" />
            Save Diagram
          </Button>
        </div>
      </div>
      
      <Card className="border shadow-md">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Site System Diagram</CardTitle>
              <CardDescription>Visual representation of electrical system components and connections</CardDescription>
            </div>
            <div className="flex items-center text-sm text-muted-foreground">
              <Info className="h-4 w-4 mr-1" />
              Changes are saved automatically
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="h-[80vh] w-full border-t bg-background/50">
            <OneLine />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}