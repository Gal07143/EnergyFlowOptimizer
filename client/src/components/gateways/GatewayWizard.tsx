import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Check, X, AlertTriangle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

// Gateway connection options
const GATEWAY_PROTOCOLS = [
  { value: "mqtt", label: "MQTT" },
  { value: "http", label: "HTTP/HTTPS" },
  { value: "modbus_tcp", label: "Modbus TCP" },
  { value: "modbus_rtu", label: "Modbus RTU" },
  { value: "bacnet", label: "BACnet" },
];

// Gateway types with descriptions
const GATEWAY_TYPES = [
  {
    id: "rut956",
    name: "Teltonika RUT956",
    description: "Industrial cellular router with I/O, RS232/RS485, and dual SIM",
    protocolSupport: ["mqtt", "http", "modbus_tcp"],
    image: "/assets/gateways/rut956.jpg",
  },
  {
    id: "tplink",
    name: "TP-Link ER605",
    description: "VPN Router with Omada SDN support and gigabit ports",
    protocolSupport: ["mqtt", "http"],
    image: "/assets/gateways/tplink.jpg",
  },
  {
    id: "moxa",
    name: "Moxa MGate MB3170",
    description: "1-port Modbus gateway with serial-to-ethernet conversion",
    protocolSupport: ["modbus_tcp", "modbus_rtu"],
    image: "/assets/gateways/moxa.jpg",
  },
  {
    id: "generic",
    name: "Generic Gateway",
    description: "Configure any custom gateway device",
    protocolSupport: ["mqtt", "http", "modbus_tcp", "modbus_rtu", "bacnet"],
    image: "/assets/gateways/generic.jpg",
  },
];

// Gateway form schema
const gatewayFormSchema = z.object({
  name: z.string().min(3, {
    message: "Gateway name must be at least 3 characters.",
  }),
  manufacturer: z.string().optional(),
  model: z.string().optional(),
  siteId: z.number().min(1, "Please select a site"),
  type: z.literal("energy_gateway"),
  serialNumber: z.string().optional(),
  // Additional fields can be added here
});

// Protocol configuration schemas
const mqttConfigSchema = z.object({
  protocol: z.literal("mqtt"),
  mqttBroker: z.string().min(1, "MQTT broker URL is required"),
  mqttTopic: z.string().min(1, "Base topic is required"),
  mqttUsername: z.string().optional(),
  mqttPassword: z.string().optional(),
  mqttClientId: z.string().optional(),
  tlsEnabled: z.boolean().optional(),
});

const httpConfigSchema = z.object({
  protocol: z.literal("http"),
  ipAddress: z.string().min(1, "IP address is required"),
  port: z.number().optional(),
  apiKey: z.string().optional(),
  username: z.string().optional(),
  password: z.string().optional(),
  tlsEnabled: z.boolean().optional(),
});

const modbusConfigSchema = z.object({
  protocol: z.literal("modbus_tcp").or(z.literal("modbus_rtu")),
  ipAddress: z.string().min(1, "IP address is required"),
  port: z.number().optional(),
});

// Union all protocol schemas - fixed discriminated union
const protocolConfigSchema = z.discriminatedUnion("protocol", [
  mqttConfigSchema,
  httpConfigSchema,
  z.object({
    protocol: z.literal("modbus_tcp"),
    ipAddress: z.string().min(1),
    port: z.number().optional(),
  }),
  z.object({
    protocol: z.literal("modbus_rtu"),
    ipAddress: z.string().min(1),
    port: z.number().optional(),
  }),
]);

// Combine base schema with protocol-specific schema
const combinedGatewayFormSchema = gatewayFormSchema;

type GatewayFormValues = z.infer<typeof combinedGatewayFormSchema>;
type ProtocolConfigValues = z.infer<typeof protocolConfigSchema>;

// Steps for the wizard
type WizardStep = 
  | "select-gateway" 
  | "gateway-details" 
  | "protocol-config" 
  | "generate-credentials" 
  | "test-connection" 
  | "connect-devices";

export function GatewayWizard({ onComplete }: { onComplete?: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Wizard state
  const [step, setStep] = useState<WizardStep>("select-gateway");
  const [selectedGatewayType, setSelectedGatewayType] = useState<string | null>(null);
  const [selectedProtocol, setSelectedProtocol] = useState<string | null>(null);
  const [gatewayId, setGatewayId] = useState<number | null>(null);
  const [credentials, setCredentials] = useState<Record<string, string> | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<"idle" | "testing" | "success" | "failed">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Progress calculation
  const totalSteps = 6;
  const currentStepNumber = 
    step === "select-gateway" ? 1 :
    step === "gateway-details" ? 2 :
    step === "protocol-config" ? 3 :
    step === "generate-credentials" ? 4 :
    step === "test-connection" ? 5 : 6;
  
  const progress = (currentStepNumber / totalSteps) * 100;
  
  // Form setup
  const form = useForm<GatewayFormValues>({
    resolver: zodResolver(combinedGatewayFormSchema),
    defaultValues: {
      name: "",
      type: "energy_gateway",
      siteId: 1, // Default to first site
    },
  });
  
  // Protocol config form
  const protocolForm = useForm<ProtocolConfigValues>({
    // This will be set dynamically based on the selected protocol
  });
  
  // Create gateway mutation
  const createGatewayMutation = useMutation({
    mutationFn: async (data: GatewayFormValues) => {
      const response = await apiRequest("POST", "/api/gateways", data);
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Gateway created",
        description: "Gateway device has been created successfully.",
      });
      setGatewayId(data.id);
      setStep("protocol-config");
      queryClient.invalidateQueries({ queryKey: ["/api/gateways"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create gateway",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Create gateway config mutation
  const createGatewayConfigMutation = useMutation({
    mutationFn: async (data: ProtocolConfigValues) => {
      if (!gatewayId) throw new Error("Gateway ID is missing");
      const response = await apiRequest("POST", `/api/gateways/${gatewayId}/config`, data);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Configuration saved",
        description: "Gateway configuration has been saved successfully.",
      });
      setStep("generate-credentials");
      queryClient.invalidateQueries({ queryKey: [`/api/gateways/${gatewayId}`] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to save configuration",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Generate credentials mutation
  const generateCredentialsMutation = useMutation({
    mutationFn: async (protocol: string) => {
      const response = await apiRequest("POST", "/api/gateways/generate-credentials", { protocol });
      return await response.json();
    },
    onSuccess: (data) => {
      setCredentials(data);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to generate credentials",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Test connection mutation
  const testConnectionMutation = useMutation({
    mutationFn: async () => {
      if (!gatewayId) throw new Error("Gateway ID is missing");
      const response = await apiRequest("POST", `/api/gateways/${gatewayId}/test-connection`, {});
      return await response.json();
    },
    onSuccess: (data) => {
      setConnectionStatus(data.success ? "success" : "failed");
      if (!data.success && data.message) {
        setErrorMessage(data.message);
      }
    },
    onError: (error: Error) => {
      setConnectionStatus("failed");
      setErrorMessage(error.message);
    },
  });
  
  // Form submission handlers
  const onSubmitGatewayDetails = (data: GatewayFormValues) => {
    createGatewayMutation.mutate(data);
  };
  
  const onSubmitProtocolConfig = (data: ProtocolConfigValues) => {
    createGatewayConfigMutation.mutate(data);
  };
  
  const handleGenerateCredentials = () => {
    if (selectedProtocol) {
      generateCredentialsMutation.mutate(selectedProtocol);
    }
  };
  
  const handleTestConnection = () => {
    setConnectionStatus("testing");
    testConnectionMutation.mutate();
  };
  
  const handleComplete = () => {
    if (onComplete) {
      onComplete();
    }
    toast({
      title: "Gateway setup complete",
      description: "Gateway has been successfully configured and is ready to use.",
    });
  };
  
  // Gateway type selection handler
  const handleSelectGatewayType = (gatewayTypeId: string) => {
    setSelectedGatewayType(gatewayTypeId);
    
    // Find the selected gateway type
    const gatewayType = GATEWAY_TYPES.find(gt => gt.id === gatewayTypeId);
    if (gatewayType) {
      // Pre-fill form with gateway info
      form.setValue("model", gatewayType.name);
      form.setValue("manufacturer", gatewayType.id === "generic" ? "" : gatewayType.name.split(" ")[0]);
      
      // Move to next step
      setStep("gateway-details");
    }
  };
  
  // Protocol selection handler
  const handleSelectProtocol = (protocol: string) => {
    setSelectedProtocol(protocol);
    
    // Reset protocol form with appropriate schema
    switch (protocol) {
      case "mqtt":
        protocolForm.reset({
          protocol: "mqtt",
          mqttBroker: "",
          mqttTopic: `gateways/${gatewayId || ""}/#`,
        });
        break;
      case "http":
        protocolForm.reset({
          protocol: "http",
          ipAddress: "",
          port: 80,
        });
        break;
      case "modbus_tcp":
        protocolForm.reset({
          protocol: "modbus_tcp",
          ipAddress: "",
          port: 502, // Default Modbus port
        });
        break;
      case "modbus_rtu":
        protocolForm.reset({
          protocol: "modbus_rtu",
          ipAddress: "",
          port: 0, // For serial port
        });
        break;
    }
  };
  
  // Step content rendering
  const renderStepContent = () => {
    switch (step) {
      case "select-gateway":
        return (
          <div className="space-y-6">
            <CardHeader>
              <CardTitle>Select Gateway Type</CardTitle>
              <CardDescription>
                Choose the type of gateway device you want to add
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {GATEWAY_TYPES.map((gateway) => (
                  <div
                    key={gateway.id}
                    className={`border rounded-lg p-4 cursor-pointer hover:bg-accent hover:text-accent-foreground transition-colors ${
                      selectedGatewayType === gateway.id
                        ? "border-primary bg-primary/10"
                        : "border-border"
                    }`}
                    onClick={() => handleSelectGatewayType(gateway.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0 w-16 h-16 bg-muted rounded flex items-center justify-center">
                        {/* Gateway image would go here */}
                        <span className="text-2xl">{gateway.id[0].toUpperCase()}</span>
                      </div>
                      <div>
                        <h3 className="font-medium">{gateway.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {gateway.description}
                        </p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {gateway.protocolSupport.map((protocol) => (
                            <Badge key={protocol} variant="outline" className="text-xs">
                              {protocol.toUpperCase()}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={() => onComplete && onComplete()}>
                Cancel
              </Button>
              <Button
                onClick={() => selectedGatewayType && setStep("gateway-details")}
                disabled={!selectedGatewayType}
              >
                Next
              </Button>
            </CardFooter>
          </div>
        );

      case "gateway-details":
        return (
          <div className="space-y-6">
            <CardHeader>
              <CardTitle>Gateway Details</CardTitle>
              <CardDescription>
                Enter the basic information about your gateway device
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmitGatewayDetails)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Gateway Name</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Enter a name for this gateway" />
                        </FormControl>
                        <FormDescription>
                          Choose a descriptive name for your gateway device
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="manufacturer"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Manufacturer</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Manufacturer name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="model"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Model</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Model name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="serialNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Serial Number</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Serial number (optional)" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="pt-4 flex justify-between">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setStep("select-gateway")}
                    >
                      Back
                    </Button>
                    <Button type="submit" disabled={createGatewayMutation.isPending}>
                      {createGatewayMutation.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Next
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </div>
        );

      case "protocol-config":
        return (
          <div className="space-y-6">
            <CardHeader>
              <CardTitle>Connection Configuration</CardTitle>
              <CardDescription>
                Specify how your gateway device will connect to the system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Protocol selector */}
                <div>
                  <h3 className="text-sm font-medium mb-2">Communication Protocol</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {GATEWAY_PROTOCOLS.map((protocol) => (
                      <Button
                        key={protocol.value}
                        type="button"
                        variant={selectedProtocol === protocol.value ? "default" : "outline"}
                        className="justify-start"
                        onClick={() => handleSelectProtocol(protocol.value)}
                      >
                        {protocol.label}
                      </Button>
                    ))}
                  </div>
                </div>
                
                {/* Protocol-specific configuration */}
                {selectedProtocol && (
                  <div className="pt-4">
                    <h3 className="text-sm font-medium mb-3">
                      {selectedProtocol.toUpperCase()} Configuration
                    </h3>
                    
                    {selectedProtocol === "mqtt" && (
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 gap-3">
                          <div>
                            <label className="text-sm font-medium">MQTT Broker URL</label>
                            <Input 
                              value={protocolForm.watch("mqttBroker") as string || ""}
                              onChange={(e) => protocolForm.setValue("mqttBroker", e.target.value)}
                              placeholder="e.g., mqtt://broker.example.com:1883" 
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium">Base Topic</label>
                            <Input 
                              value={protocolForm.watch("mqttTopic") as string || ""}
                              onChange={(e) => protocolForm.setValue("mqttTopic", e.target.value)}
                              placeholder="e.g., gateways/my-gateway/#" 
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium">Username (Optional)</label>
                            <Input 
                              value={protocolForm.watch("mqttUsername") as string || ""}
                              onChange={(e) => protocolForm.setValue("mqttUsername", e.target.value)}
                              placeholder="Username" 
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium">Password (Optional)</label>
                            <Input 
                              type="password"
                              value={protocolForm.watch("mqttPassword") as string || ""}
                              onChange={(e) => protocolForm.setValue("mqttPassword", e.target.value)}
                              placeholder="Password" 
                            />
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {selectedProtocol === "http" && (
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 gap-3">
                          <div>
                            <label className="text-sm font-medium">IP Address or Hostname</label>
                            <Input 
                              value={protocolForm.watch("ipAddress") as string || ""}
                              onChange={(e) => protocolForm.setValue("ipAddress", e.target.value)}
                              placeholder="e.g., 192.168.1.100 or gateway.local" 
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium">Port</label>
                            <Input 
                              type="number"
                              value={protocolForm.watch("port") as number || 80}
                              onChange={(e) => protocolForm.setValue("port", parseInt(e.target.value))}
                              placeholder="80" 
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium">API Key (Optional)</label>
                            <Input 
                              value={protocolForm.watch("apiKey") as string || ""}
                              onChange={(e) => protocolForm.setValue("apiKey", e.target.value)}
                              placeholder="API Key" 
                            />
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {(selectedProtocol === "modbus_tcp" || selectedProtocol === "modbus_rtu") && (
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 gap-3">
                          <div>
                            <label className="text-sm font-medium">IP Address</label>
                            <Input 
                              value={protocolForm.watch("ipAddress") as string || ""}
                              onChange={(e) => protocolForm.setValue("ipAddress", e.target.value)}
                              placeholder="e.g., 192.168.1.100" 
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium">Port</label>
                            <Input 
                              type="number"
                              value={protocolForm.watch("port") as number || (selectedProtocol === "modbus_tcp" ? 502 : 0)}
                              onChange={(e) => protocolForm.setValue("port", parseInt(e.target.value))}
                              placeholder={selectedProtocol === "modbus_tcp" ? "502" : "0"} 
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => setStep("gateway-details")}
              >
                Back
              </Button>
              <Button
                onClick={() => {
                  if (selectedProtocol) {
                    // Handle form submission based on protocol
                    if (selectedProtocol === "mqtt") {
                      onSubmitProtocolConfig({
                        protocol: "mqtt",
                        mqttBroker: protocolForm.watch("mqttBroker") as string,
                        mqttTopic: protocolForm.watch("mqttTopic") as string,
                        mqttUsername: protocolForm.watch("mqttUsername") as string,
                        mqttPassword: protocolForm.watch("mqttPassword") as string,
                        mqttClientId: `gateway-${gatewayId}-${Date.now()}`,
                        tlsEnabled: false,
                      });
                    } else if (selectedProtocol === "http") {
                      onSubmitProtocolConfig({
                        protocol: "http",
                        ipAddress: protocolForm.watch("ipAddress") as string,
                        port: protocolForm.watch("port") as number,
                        apiKey: protocolForm.watch("apiKey") as string,
                        username: "",
                        password: "",
                        tlsEnabled: false,
                      });
                    } else if (selectedProtocol === "modbus_tcp") {
                      onSubmitProtocolConfig({
                        protocol: "modbus_tcp",
                        ipAddress: protocolForm.watch("ipAddress") as string,
                        port: protocolForm.watch("port") as number,
                      });
                    } else if (selectedProtocol === "modbus_rtu") {
                      onSubmitProtocolConfig({
                        protocol: "modbus_rtu",
                        ipAddress: protocolForm.watch("ipAddress") as string,
                        port: protocolForm.watch("port") as number,
                      });
                    }
                  }
                }}
                disabled={!selectedProtocol || createGatewayConfigMutation.isPending}
              >
                {createGatewayConfigMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Next
              </Button>
            </CardFooter>
          </div>
        );

      case "generate-credentials":
        return (
          <div className="space-y-6">
            <CardHeader>
              <CardTitle>Generate Credentials</CardTitle>
              <CardDescription>
                Generate secure credentials for your gateway device
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Alert>
                  <AlertTriangle className="h-5 w-5" />
                  <AlertTitle>Important</AlertTitle>
                  <AlertDescription>
                    These credentials will be used to authenticate your gateway device.
                    Make sure to save them securely - they will only be shown once.
                  </AlertDescription>
                </Alert>
                
                <div className="pt-2">
                  <Button
                    onClick={handleGenerateCredentials}
                    disabled={!selectedProtocol || generateCredentialsMutation.isPending}
                  >
                    {generateCredentialsMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <>Generate Credentials</>
                    )}
                  </Button>
                </div>
                
                {credentials && (
                  <div className="pt-2 space-y-3">
                    <h3 className="text-sm font-medium">Generated Credentials</h3>
                    <div className="bg-muted p-3 rounded-md">
                      <code className="text-xs">
                        <pre className="whitespace-pre-wrap">
                          {JSON.stringify(credentials, null, 2)}
                        </pre>
                      </code>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => setStep("protocol-config")}
              >
                Back
              </Button>
              <Button
                onClick={() => setStep("test-connection")}
                disabled={!credentials}
              >
                Next
              </Button>
            </CardFooter>
          </div>
        );

      case "test-connection":
        return (
          <div className="space-y-6">
            <CardHeader>
              <CardTitle>Test Connection</CardTitle>
              <CardDescription>
                Verify that the system can connect to your gateway device
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="text-center py-6">
                  {connectionStatus === "idle" && (
                    <div className="space-y-4">
                      <div>
                        <AlertTriangle className="h-12 w-12 mx-auto text-orange-500" />
                        <p className="mt-2 text-muted-foreground">
                          Before testing, please make sure your gateway device is online
                          and properly configured with the credentials you generated.
                        </p>
                      </div>
                      <Button onClick={handleTestConnection}>
                        Test Connection
                      </Button>
                    </div>
                  )}
                  
                  {connectionStatus === "testing" && (
                    <div className="space-y-4">
                      <Loader2 className="h-12 w-12 mx-auto animate-spin text-primary" />
                      <p>Testing connection to gateway device...</p>
                    </div>
                  )}
                  
                  {connectionStatus === "success" && (
                    <div className="space-y-4">
                      <div className="bg-green-100 dark:bg-green-900/20 p-6 rounded-full inline-flex">
                        <Check className="h-12 w-12 text-green-600 dark:text-green-500" />
                      </div>
                      <div>
                        <h3 className="text-xl font-medium text-green-600 dark:text-green-500">
                          Connection Successful
                        </h3>
                        <p className="mt-1 text-muted-foreground">
                          Your gateway device is online and properly configured.
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {connectionStatus === "failed" && (
                    <div className="space-y-4">
                      <div className="bg-red-100 dark:bg-red-900/20 p-6 rounded-full inline-flex">
                        <X className="h-12 w-12 text-red-600 dark:text-red-500" />
                      </div>
                      <div>
                        <h3 className="text-xl font-medium text-red-600 dark:text-red-500">
                          Connection Failed
                        </h3>
                        <p className="mt-1 text-muted-foreground">
                          {errorMessage || "Could not connect to the gateway device. Please check your configuration."}
                        </p>
                      </div>
                      <Button onClick={handleTestConnection}>
                        Try Again
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => setStep("generate-credentials")}
              >
                Back
              </Button>
              <Button
                onClick={() => setStep("connect-devices")}
                disabled={connectionStatus !== "success" && connectionStatus !== "failed"}
              >
                {connectionStatus === "failed" ? "Skip Connection" : "Next"}
              </Button>
            </CardFooter>
          </div>
        );

      case "connect-devices":
        return (
          <div className="space-y-6">
            <CardHeader>
              <CardTitle>Connect Devices</CardTitle>
              <CardDescription>
                Assign devices to this gateway
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  You can now connect devices to this gateway. These devices will
                  communicate with the Energy Management System through the gateway.
                </p>
                
                <div className="pt-4">
                  <Button variant="outline" className="w-full">
                    Add Devices to Gateway
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2 text-center">
                    You can also add devices later from the Devices page
                  </p>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => setStep("test-connection")}
              >
                Back
              </Button>
              <Button onClick={handleComplete}>
                Complete Setup
              </Button>
            </CardFooter>
          </div>
        );
    }
  };
  
  return (
    <div className="flex flex-col space-y-4 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Gateway Wizard</h2>
        <div className="text-sm text-muted-foreground">
          Step {currentStepNumber} of {totalSteps}
        </div>
      </div>
      
      <Progress value={progress} className="h-2" />
      
      <Card className="w-full">
        {renderStepContent()}
      </Card>
    </div>
  );
}