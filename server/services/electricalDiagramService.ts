import { db } from '../db';
import { eq, and, inArray } from 'drizzle-orm';
import { 
  electricalDiagrams, 
  diagramNodes,
  diagramEdges,
  type ElectricalDiagram,
  type DiagramNode,
  type DiagramEdge,
  type InsertElectricalDiagram,
  type InsertDiagramNode,
  type InsertDiagramEdge,
  type ElectricalDiagramComplete
} from '../../shared/electricalDiagram';

export class ElectricalDiagramService {
  // Diagram CRUD operations
  async getAllDiagrams(siteId?: number): Promise<ElectricalDiagram[]> {
    if (siteId) {
      return db.select().from(electricalDiagrams).where(eq(electricalDiagrams.siteId, siteId));
    }
    return db.select().from(electricalDiagrams);
  }

  async getDiagramById(id: number): Promise<ElectricalDiagramComplete | null> {
    const diagram = await db.select().from(electricalDiagrams).where(eq(electricalDiagrams.id, id)).limit(1);
    
    if (diagram.length === 0) {
      return null;
    }

    const nodes = await db.select().from(diagramNodes).where(eq(diagramNodes.diagramId, id));
    const edges = await db.select().from(diagramEdges).where(eq(diagramEdges.diagramId, id));

    return {
      ...diagram[0],
      nodes,
      edges
    };
  }

  async createDiagram(data: InsertElectricalDiagram): Promise<ElectricalDiagram> {
    const [diagram] = await db.insert(electricalDiagrams).values(data).returning();
    return diagram;
  }

  async updateDiagram(id: number, data: Partial<InsertElectricalDiagram>): Promise<ElectricalDiagram | null> {
    const [updated] = await db
      .update(electricalDiagrams)
      .set({
        ...data,
        updatedAt: new Date()
      })
      .where(eq(electricalDiagrams.id, id))
      .returning();
    
    return updated || null;
  }

  async deleteDiagram(id: number): Promise<boolean> {
    // This will cascade delete nodes and edges
    const result = await db
      .delete(electricalDiagrams)
      .where(eq(electricalDiagrams.id, id))
      .returning({ id: electricalDiagrams.id });
    
    return result.length > 0;
  }

  // Node operations
  async createNode(data: InsertDiagramNode): Promise<DiagramNode> {
    const [node] = await db.insert(diagramNodes).values(data).returning();
    return node;
  }

  async updateNode(id: number, data: Partial<InsertDiagramNode>): Promise<DiagramNode | null> {
    const [updated] = await db
      .update(diagramNodes)
      .set({
        ...data,
        updatedAt: new Date()
      })
      .where(eq(diagramNodes.id, id))
      .returning();
    
    return updated || null;
  }

  async deleteNode(id: number): Promise<boolean> {
    const result = await db
      .delete(diagramNodes)
      .where(eq(diagramNodes.id, id))
      .returning({ id: diagramNodes.id });
    
    return result.length > 0;
  }

  async bulkCreateNodes(nodes: InsertDiagramNode[]): Promise<DiagramNode[]> {
    if (nodes.length === 0) return [];
    const createdNodes = await db.insert(diagramNodes).values(nodes).returning();
    return createdNodes;
  }

  // Edge operations
  async createEdge(data: InsertDiagramEdge): Promise<DiagramEdge> {
    const [edge] = await db.insert(diagramEdges).values(data).returning();
    return edge;
  }

  async updateEdge(id: number, data: Partial<InsertDiagramEdge>): Promise<DiagramEdge | null> {
    const [updated] = await db
      .update(diagramEdges)
      .set({
        ...data,
        updatedAt: new Date()
      })
      .where(eq(diagramEdges.id, id))
      .returning();
    
    return updated || null;
  }

  async deleteEdge(id: number): Promise<boolean> {
    const result = await db
      .delete(diagramEdges)
      .where(eq(diagramEdges.id, id))
      .returning({ id: diagramEdges.id });
    
    return result.length > 0;
  }

  async bulkCreateEdges(edges: InsertDiagramEdge[]): Promise<DiagramEdge[]> {
    if (edges.length === 0) return [];
    const createdEdges = await db.insert(diagramEdges).values(edges).returning();
    return createdEdges;
  }

  // Utility function to update the entire diagram at once (bulk operation)
  async updateEntireDiagram(diagramId: number, nodes: InsertDiagramNode[], edges: InsertDiagramEdge[]): Promise<{
    diagram: ElectricalDiagram,
    nodes: DiagramNode[],
    edges: DiagramEdge[]
  }> {
    // Start a transaction
    return db.transaction(async (tx) => {
      // First, delete all existing nodes and edges (cascade will handle edges)
      await tx.delete(diagramNodes).where(eq(diagramNodes.diagramId, diagramId));
      
      // Add all new nodes
      const newNodes = await tx.insert(diagramNodes).values(
        nodes.map(node => ({
          ...node,
          diagramId
        }))
      ).returning();
      
      // Create a mapping of frontend node IDs to database IDs
      const nodeIdMap = new Map<string | number, number>();
      for (let i = 0; i < nodes.length; i++) {
        if (typeof nodes[i].id !== 'undefined') {
          nodeIdMap.set(nodes[i].id, newNodes[i].id);
        }
      }
      
      // Add all new edges with the correct node IDs
      const newEdges = await tx.insert(diagramEdges).values(
        edges.map(edge => ({
          ...edge,
          diagramId,
          sourceId: nodeIdMap.get(edge.sourceId) || edge.sourceId,
          targetId: nodeIdMap.get(edge.targetId) || edge.targetId
        }))
      ).returning();
      
      // Update the last calculated timestamp
      const [diagram] = await tx
        .update(electricalDiagrams)
        .set({ updatedAt: new Date() })
        .where(eq(electricalDiagrams.id, diagramId))
        .returning();
      
      return {
        diagram,
        nodes: newNodes,
        edges: newEdges
      };
    });
  }

  // Function to calculate electrical parameters using the diagram
  async calculateDiagramParameters(diagramId: number): Promise<any> {
    // Get the full diagram
    const diagram = await this.getDiagramById(diagramId);
    if (!diagram) {
      throw new Error('Diagram not found');
    }

    // Update lastCalculatedAt
    await db
      .update(electricalDiagrams)
      .set({ lastCalculatedAt: new Date() })
      .where(eq(electricalDiagrams.id, diagramId));

    // Placeholder for actual calculation logic
    // In a real implementation, this would analyze the diagram structure,
    // apply electrical engineering calculations, and return results
    
    // Example calculation result structure
    const calculationResults = {
      totalLoad: 0,
      peakDemand: 0,
      powerFactor: 0.9,
      voltageProfiles: {},
      energyFlow: {},
      losses: {},
      loadDistribution: {},
      warnings: [],
      recommendations: []
    };

    // Perform node-by-node analysis
    for (const node of diagram.nodes) {
      // Process each node based on its type and properties
      switch (node.type) {
        case 'load':
          // Add to total load
          calculationResults.totalLoad += (node.properties as any).power || 0;
          break;
        // Handle other node types...
      }
    }

    return calculationResults;
  }

  // Function to get the real-time state of the diagram
  async getDiagramRealTimeState(diagramId: number): Promise<any> {
    const diagram = await this.getDiagramById(diagramId);
    if (!diagram) {
      throw new Error('Diagram not found');
    }

    // TODO: This would fetch real-time data from connected devices
    // and overlay that data onto the diagram nodes and edges
    
    // Placeholder for real implementation
    const realTimeState = {
      timestamp: new Date(),
      nodeStates: {},
      edgeStates: {},
      alerts: []
    };

    return realTimeState;
  }
}

export const electricalDiagramService = new ElectricalDiagramService();