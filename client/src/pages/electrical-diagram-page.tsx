import { FC, useState, useCallback, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  NodeChange,
  EdgeChange,
  Connection,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  SelectionMode,
  Panel
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Button } from "@/components/ui/button";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Save, Plus, Trash2, DownloadCloud, Share2 } from 'lucide-react';
import { useSiteContext } from '@/hooks/use-site-context';
import { nodeTypeEnum } from '../../shared/electricalDiagram';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

// Custom node components for different electrical components
import ElectricalNodeRenderer from '../components/electrical-diagram/node-renderer';
import { NodePropertiesPanel } from '../components/electrical-diagram/node-properties-panel';

interface DiagramParams {
  id?: string;
}

// Node properties by type
interface NodeProperties {
  [key: string]: any;
}

const initialNodes: Node[] = [];
const initialEdges: Edge[] = [];

const nodeTypes = {
  main_grid: ElectricalNodeRenderer,
  generator: ElectricalNodeRenderer,
  lv_panel: ElectricalNodeRenderer,
  hv_panel: ElectricalNodeRenderer,
  transformer: ElectricalNodeRenderer,
  circuit_breaker: ElectricalNodeRenderer,
  switch: ElectricalNodeRenderer,
  energy_meter: ElectricalNodeRenderer,
  solar_inverter: ElectricalNodeRenderer,
  battery_inverter: ElectricalNodeRenderer,
  ev_charger: ElectricalNodeRenderer,
  motor: ElectricalNodeRenderer,
  load: ElectricalNodeRenderer,
  device: ElectricalNodeRenderer
};

const ElectricalDiagramPage: FC = () => {
  const { id } = useParams<DiagramParams>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { selectedSite } = useSiteContext();

  // Local state for diagram elements
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [diagramName, setDiagramName] = useState<string>('New Electrical Diagram');
  const [diagramDescription, setDiagramDescription] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showAddNodePanel, setShowAddNodePanel] = useState<boolean>(false);
  const [newNodeType, setNewNodeType] = useState<string>('');

  // Fetch diagram data if ID is provided
  const { data: diagramData, isLoading: isDiagramLoading } = useQuery({
    queryKey: ['/api/electrical-diagrams', id],
    queryFn: async () => {
      if (!id) return null;
      return await (await fetch(`/api/electrical-diagrams/${id}`)).json();
    },
    enabled: !!id
  });

  // Transform backend data to ReactFlow format
  useEffect(() => {
    if (diagramData) {
      setDiagramName(diagramData.name);
      setDiagramDescription(diagramData.description || '');

      // Transform nodes
      const rfNodes = diagramData.nodes.map((node: any) => ({
        id: node.id.toString(),
        type: node.type,
        data: { 
          label: node.name,
          type: node.type,
          nodeId: node.id,
          properties: node.properties || {}
        },
        position: { x: node.positionX, y: node.positionY }
      }));

      // Transform edges
      const rfEdges = diagramData.edges.map((edge: any) => ({
        id: edge.id.toString(),
        source: edge.sourceId.toString(),
        target: edge.targetId.toString(),
        type: edge.type,
        data: edge.properties || {}
      }));

      setNodes(rfNodes);
      setEdges(rfEdges);
    }
  }, [diagramData]);

  // Save diagram mutation
  const saveDiagramMutation = useMutation({
    mutationFn: async () => {
      // Transform data back to backend format
      const diagramNodes = nodes.map(node => ({
        id: parseInt(node.id),
        name: node.data.label,
        type: node.type as typeof nodeTypeEnum.enumValues[number],
        positionX: node.position.x,
        positionY: node.position.y,
        properties: node.data.properties,
        diagramId: id ? parseInt(id) : undefined,
        tempId: node.id // Temporary ID for reference
      }));

      const diagramEdges = edges.map(edge => ({
        sourceId: parseInt(edge.source),
        targetId: parseInt(edge.target),
        type: edge.type || 'standard',
        properties: edge.data || {},
        diagramId: id ? parseInt(id) : undefined
      }));

      const payload = {
        name: diagramName,
        description: diagramDescription,
        siteId: selectedSite?.id,
        isActive: true
      };

      if (id) {
        // Update existing diagram
        await apiRequest('PUT', `/api/electrical-diagrams/${id}`, payload);
        // Update nodes and edges in bulk
        return await apiRequest('PUT', `/api/electrical-diagrams/${id}/bulk`, {
          nodes: diagramNodes,
          edges: diagramEdges
        });
      } else {
        // Create new diagram
        const diagram = await apiRequest('POST', '/api/electrical-diagrams', payload);
        const newDiagramId = diagram.id;
        // Add nodes and edges to new diagram
        return await apiRequest('PUT', `/api/electrical-diagrams/${newDiagramId}/bulk`, {
          nodes: diagramNodes.map(node => ({ ...node, diagramId: newDiagramId })),
          edges: diagramEdges.map(edge => ({ ...edge, diagramId: newDiagramId }))
        });
      }
    },
    onSuccess: (data) => {
      toast({
        title: 'Success',
        description: 'Diagram saved successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/electrical-diagrams'] });
      if (!id && data?.diagram?.id) {
        navigate(`/electrical-diagrams/${data.diagram.id}`);
      }
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to save diagram',
        variant: 'destructive'
      });
      console.error('Save error:', error);
    }
  });

  // Calculate diagram parameters mutation
  const calculateDiagramMutation = useMutation({
    mutationFn: async () => {
      if (!id) throw new Error('Diagram ID is required for calculation');
      return await apiRequest('POST', `/api/electrical-diagrams/${id}/calculate`, {});
    },
    onSuccess: (data) => {
      toast({
        title: 'Calculations Complete',
        description: 'Diagram parameters have been calculated',
      });
      console.log('Calculation results:', data);
    },
    onError: (error) => {
      toast({
        title: 'Calculation Error',
        description: 'Failed to calculate diagram parameters',
        variant: 'destructive'
      });
      console.error('Calculation error:', error);
    }
  });

  // Handle node changes
  const onNodesChange = useCallback(
    (changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );

  // Handle edge changes
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  // Handle edge connections
  const onConnect = useCallback(
    (connection: Connection) => setEdges((eds) => addEdge(connection, eds)),
    []
  );

  // Handle node selection
  const onNodeClick = (_: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  };

  // Handle node property updates
  const updateNodeProperties = (nodeId: string, properties: NodeProperties) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: {
              ...node.data,
              properties
            }
          };
        }
        return node;
      })
    );
  };

  // Add a new node
  const addNewNode = (type: string) => {
    const newNode: Node = {
      id: `temp-${Date.now()}`,
      type,
      position: { x: 100, y: 100 },
      data: { 
        label: `New ${type.replace('_', ' ')}`,
        type,
        properties: {}
      }
    };
    
    setNodes((nds) => [...nds, newNode]);
    setShowAddNodePanel(false);
  };

  // Delete selected node
  const deleteSelectedNode = () => {
    if (selectedNode) {
      setNodes((nds) => nds.filter((node) => node.id !== selectedNode.id));
      // Also remove connected edges
      setEdges((eds) => 
        eds.filter(
          (edge) => edge.source !== selectedNode.id && edge.target !== selectedNode.id
        )
      );
      setSelectedNode(null);
    }
  };

  // Save the diagram
  const saveDiagram = () => {
    saveDiagramMutation.mutate();
  };

  // Run electrical calculations
  const runCalculations = () => {
    calculateDiagramMutation.mutate();
  };

  return (
    <div className="w-full h-[calc(100vh-60px)] flex flex-col">
      <div className="p-4 bg-background border-b flex justify-between items-center">
        <div className="flex gap-2 items-center">
          <Input
            value={diagramName}
            onChange={(e) => setDiagramName(e.target.value)}
            className="w-64 font-semibold"
          />
          <Badge variant="outline">
            {selectedSite ? selectedSite.name : 'No Site Selected'}
          </Badge>
        </div>
        
        <div className="flex gap-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the
                  electrical diagram and all associated data.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction className="bg-destructive">
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          
          <Button onClick={runCalculations} variant="outline" size="sm" disabled={!id || calculateDiagramMutation.isPending}>
            {calculateDiagramMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <DownloadCloud className="h-4 w-4 mr-2" />
            )}
            Calculate
          </Button>
          
          <Button onClick={saveDiagram} disabled={saveDiagramMutation.isPending} size="sm">
            {saveDiagramMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save
          </Button>
        </div>
      </div>
      
      <div className="flex-1 flex">
        <div className="flex-1 relative">
          {isDiagramLoading && (
            <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-50">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}
          
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            nodeTypes={nodeTypes}
            fitView
            selectionMode={SelectionMode.Partial}
          >
            <Background />
            <Controls />
            <MiniMap />
            
            <Panel position="top-right">
              <Button 
                onClick={() => setShowAddNodePanel(!showAddNodePanel)} 
                size="sm" 
                className="mb-1"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Component
              </Button>
              
              {showAddNodePanel && (
                <Card className="w-64 mt-1">
                  <CardHeader className="py-2">
                    <CardTitle className="text-sm">Add Component</CardTitle>
                  </CardHeader>
                  <CardContent className="py-2">
                    <Select onValueChange={setNewNodeType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select component type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectLabel>Supply Components</SelectLabel>
                          <SelectItem value="main_grid">Main Grid</SelectItem>
                          <SelectItem value="generator">Generator</SelectItem>
                        </SelectGroup>
                        <SelectGroup>
                          <SelectLabel>Distribution Components</SelectLabel>
                          <SelectItem value="lv_panel">LV Panel</SelectItem>
                          <SelectItem value="hv_panel">HV Panel</SelectItem>
                          <SelectItem value="transformer">Transformer</SelectItem>
                          <SelectItem value="circuit_breaker">Circuit Breaker</SelectItem>
                          <SelectItem value="switch">Switch</SelectItem>
                        </SelectGroup>
                        <SelectGroup>
                          <SelectLabel>Energy Components</SelectLabel>
                          <SelectItem value="energy_meter">Energy Meter</SelectItem>
                          <SelectItem value="solar_inverter">Solar Inverter</SelectItem>
                          <SelectItem value="battery_inverter">Battery Inverter</SelectItem>
                          <SelectItem value="ev_charger">EV Charger</SelectItem>
                        </SelectGroup>
                        <SelectGroup>
                          <SelectLabel>Load Components</SelectLabel>
                          <SelectItem value="motor">Motor</SelectItem>
                          <SelectItem value="load">General Load</SelectItem>
                          <SelectItem value="device">Device Link</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </CardContent>
                  <CardFooter className="py-2">
                    <Button 
                      size="sm" 
                      onClick={() => addNewNode(newNodeType)} 
                      disabled={!newNodeType}
                      className="w-full"
                    >
                      Add to Diagram
                    </Button>
                  </CardFooter>
                </Card>
              )}
            </Panel>
          </ReactFlow>
        </div>
        
        {selectedNode && (
          <NodePropertiesPanel 
            node={selectedNode} 
            onUpdate={updateNodeProperties} 
            onDelete={deleteSelectedNode}
            onClose={() => setSelectedNode(null)}
          />
        )}
      </div>
    </div>
  );
};

export default ElectricalDiagramPage;