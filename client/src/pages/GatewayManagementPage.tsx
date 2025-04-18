import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

// UI Components
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2, PlusCircle, Search, Router, Wifi, ExternalLink, Server, Power, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { GatewayWizard } from "@/components/gateways/GatewayWizard";

// Placeholder for gateway status indicators
const GatewayStatus = ({ status }: { status: string }) => {
  if (status === "online") {
    return (
      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800">
        <Power className="w-3 h-3 mr-1 fill-green-500" /> Online
      </Badge>
    );
  } else if (status === "offline") {
    return (
      <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-900/20 dark:text-gray-400 dark:border-gray-800">
        <Power className="w-3 h-3 mr-1" /> Offline
      </Badge>
    );
  } else if (status === "error") {
    return (
      <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800">
        <AlertTriangle className="w-3 h-3 mr-1" /> Error
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800">
      <AlertTriangle className="w-3 h-3 mr-1" /> Unknown
    </Badge>
  );
};

const ProtocolBadge = ({ protocol }: { protocol: string }) => {
  switch (protocol) {
    case "mqtt":
      return (
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800">
          <Wifi className="w-3 h-3 mr-1" /> MQTT
        </Badge>
      );
    case "http":
      return (
        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800">
          <ExternalLink className="w-3 h-3 mr-1" /> HTTP
        </Badge>
      );
    case "modbus_tcp":
      return (
        <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800">
          <Server className="w-3 h-3 mr-1" /> Modbus TCP
        </Badge>
      );
    case "modbus_rtu":
      return (
        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800">
          <Server className="w-3 h-3 mr-1" /> Modbus RTU
        </Badge>
      );
    default:
      return (
        <Badge variant="outline">
          {protocol}
        </Badge>
      );
  }
};

interface Gateway {
  id: number;
  name: string;
  manufacturer?: string;
  model?: string;
  status: string;
  createdAt: string;
  type: string;
  siteId: number;
  lastConnectionTime?: string;
  protocol?: string;
  connectedDevices?: number;
}

export default function GatewayManagementPage() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddGateway, setShowAddGateway] = useState(false);
  const [selectedGateway, setSelectedGateway] = useState<Gateway | null>(null);
  
  // Fetch all gateways
  const {
    data: gateways = [],
    isLoading: isLoadingGateways,
    error: gatewaysError,
    refetch: refetchGateways,
  } = useQuery<Gateway[]>({
    queryKey: ["/api/gateways"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/gateways");
      return await response.json();
    },
  });
  
  // Handle errors
  if (gatewaysError) {
    toast({
      title: "Error fetching gateways",
      description: (gatewaysError as Error).message,
      variant: "destructive",
    });
  }
  
  // Filter gateways based on search term
  const filteredGateways = gateways.filter(
    (gateway) =>
      gateway.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (gateway.manufacturer && gateway.manufacturer.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (gateway.model && gateway.model.toLowerCase().includes(searchTerm.toLowerCase()))
  );
  
  return (
    <div className="container py-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gateway Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage communication gateways for your devices
          </p>
        </div>
        <div>
          <Dialog open={showAddGateway} onOpenChange={setShowAddGateway}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Gateway
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>Add New Gateway</DialogTitle>
                <DialogDescription>
                  Follow the wizard to add and configure a new gateway device
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <GatewayWizard onComplete={() => {
                  setShowAddGateway(false);
                  refetchGateways();
                }} />
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      
      <div className="flex flex-col space-y-6">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle>Gateways</CardTitle>
              <div className="relative w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search gateways..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <CardDescription>
              View and manage all gateway devices in your system
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingGateways ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : gateways.length === 0 ? (
              <div className="text-center py-8">
                <Router className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No Gateways Found</h3>
                <p className="text-muted-foreground mt-1">
                  Add your first gateway to start connecting devices
                </p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => setShowAddGateway(true)}
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add Gateway
                </Button>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Protocol</TableHead>
                      <TableHead>Devices</TableHead>
                      <TableHead>Last Connection</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredGateways.map((gateway) => (
                      <TableRow key={gateway.id}>
                        <TableCell className="font-medium">
                          <div>{gateway.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {gateway.manufacturer} {gateway.model}
                          </div>
                        </TableCell>
                        <TableCell>
                          <GatewayStatus status={gateway.status || "unknown"} />
                        </TableCell>
                        <TableCell>
                          {gateway.protocol ? (
                            <ProtocolBadge protocol={gateway.protocol} />
                          ) : (
                            <span className="text-xs text-muted-foreground">Not configured</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {gateway.connectedDevices !== undefined ? (
                            <span>{gateway.connectedDevices}</span>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {gateway.lastConnectionTime ? (
                            <span className="text-sm">
                              {new Date(gateway.lastConnectionTime).toLocaleString()}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">Never</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedGateway(gateway)}
                            >
                              View
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                // Handle test connection
                                toast({
                                  title: "Testing Connection",
                                  description: `Testing connection to ${gateway.name}...`,
                                });
                              }}
                            >
                              Test
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Gateway Details Dialog */}
      <Dialog open={!!selectedGateway} onOpenChange={(open) => !open && setSelectedGateway(null)}>
        <DialogContent className="max-w-3xl">
          {selectedGateway && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedGateway.name}</DialogTitle>
                <DialogDescription>
                  Gateway details and connected devices
                </DialogDescription>
              </DialogHeader>
              
              <Tabs defaultValue="details">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="details">Details</TabsTrigger>
                  <TabsTrigger value="devices">Connected Devices</TabsTrigger>
                  <TabsTrigger value="logs">Logs</TabsTrigger>
                </TabsList>
                
                <TabsContent value="details" className="p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h3 className="text-sm font-medium">Gateway Information</h3>
                      <div className="mt-2 space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Manufacturer:</span>
                          <span className="text-sm font-medium">{selectedGateway.manufacturer || "N/A"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Model:</span>
                          <span className="text-sm font-medium">{selectedGateway.model || "N/A"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Status:</span>
                          <GatewayStatus status={selectedGateway.status || "unknown"} />
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Created:</span>
                          <span className="text-sm font-medium">
                            {new Date(selectedGateway.createdAt).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-sm font-medium">Connection Details</h3>
                      <div className="mt-2 space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Protocol:</span>
                          <span className="text-sm font-medium">
                            {selectedGateway.protocol ? (
                              <ProtocolBadge protocol={selectedGateway.protocol} />
                            ) : (
                              "Not configured"
                            )}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Last Connection:</span>
                          <span className="text-sm font-medium">
                            {selectedGateway.lastConnectionTime
                              ? new Date(selectedGateway.lastConnectionTime).toLocaleString()
                              : "Never"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Connected Devices:</span>
                          <span className="text-sm font-medium">
                            {selectedGateway.connectedDevices !== undefined
                              ? selectedGateway.connectedDevices
                              : "0"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-6">
                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" size="sm" onClick={() => {
                        // Test connection
                        toast({
                          title: "Testing Connection",
                          description: `Testing connection to ${selectedGateway.name}...`,
                        });
                      }}>
                        Test Connection
                      </Button>
                      <Button size="sm">Edit Gateway</Button>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="devices" className="p-4">
                  <div className="text-center py-8">
                    <Server className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium">No Devices Connected</h3>
                    <p className="text-muted-foreground mt-1 max-w-md mx-auto">
                      This gateway doesn't have any devices connected to it yet.
                      Add devices to enable communication through this gateway.
                    </p>
                    <Button
                      variant="outline"
                      className="mt-4"
                    >
                      Connect Devices
                    </Button>
                  </div>
                </TabsContent>
                
                <TabsContent value="logs" className="p-4">
                  <div className="text-center py-8">
                    <div className="h-10 w-10 mx-auto text-muted-foreground mb-4">📋</div>
                    <h3 className="text-lg font-medium">No Event Logs</h3>
                    <p className="text-muted-foreground mt-1 max-w-md mx-auto">
                      There are no event logs for this gateway yet.
                      Logs will appear here once activity is detected.
                    </p>
                  </div>
                </TabsContent>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}