import { Router } from 'express';
import { z } from 'zod';
import { electricalDiagramService } from '../services/electricalDiagramService';
import { 
  insertElectricalDiagramSchema, 
  insertDiagramNodeSchema, 
  insertDiagramEdgeSchema,
  nodePropertiesSchema
} from '../../shared/electricalDiagram';
import { validateBody, validateQuery, validateParams } from '../middleware/validation';
import { authenticate } from '../middleware/auth';

const router = Router();

// Schema for diagram parameters
const diagramParamsSchema = z.object({
  id: z.coerce.number().int().positive()
});

// Schema for optional site ID query parameter
const siteQuerySchema = z.object({
  siteId: z.coerce.number().int().positive().optional()
});

// Get all diagrams with optional site filter
router.get(
  '/',
  authenticate,
  validateQuery(siteQuerySchema),
  async (req, res, next) => {
    try {
      const { siteId } = req.query as z.infer<typeof siteQuerySchema>;
      const diagrams = await electricalDiagramService.getAllDiagrams(siteId);
      res.json(diagrams);
    } catch (error) {
      next(error);
    }
  }
);

// Get diagram by ID with all nodes and edges
router.get(
  '/:id',
  authenticate,
  validateParams(diagramParamsSchema),
  async (req, res, next) => {
    try {
      const { id } = req.params as unknown as z.infer<typeof diagramParamsSchema>;
      const diagram = await electricalDiagramService.getDiagramById(id);
      
      if (!diagram) {
        return res.status(404).json({ message: 'Diagram not found' });
      }
      
      res.json(diagram);
    } catch (error) {
      next(error);
    }
  }
);

// Create a new diagram
router.post(
  '/',
  authenticate,
  validateBody(insertElectricalDiagramSchema),
  async (req, res, next) => {
    try {
      const diagram = await electricalDiagramService.createDiagram(req.body);
      res.status(201).json(diagram);
    } catch (error) {
      next(error);
    }
  }
);

// Update diagram
router.put(
  '/:id',
  authenticate,
  validateParams(diagramParamsSchema),
  validateBody(insertElectricalDiagramSchema.partial()),
  async (req, res, next) => {
    try {
      const { id } = req.params as unknown as z.infer<typeof diagramParamsSchema>;
      const diagram = await electricalDiagramService.updateDiagram(id, req.body);
      
      if (!diagram) {
        return res.status(404).json({ message: 'Diagram not found' });
      }
      
      res.json(diagram);
    } catch (error) {
      next(error);
    }
  }
);

// Delete diagram
router.delete(
  '/:id',
  authenticate,
  validateParams(diagramParamsSchema),
  async (req, res, next) => {
    try {
      const { id } = req.params as unknown as z.infer<typeof diagramParamsSchema>;
      const success = await electricalDiagramService.deleteDiagram(id);
      
      if (!success) {
        return res.status(404).json({ message: 'Diagram not found' });
      }
      
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  }
);

// Add a node to a diagram
router.post(
  '/:id/nodes',
  authenticate,
  validateParams(diagramParamsSchema),
  validateBody(insertDiagramNodeSchema),
  async (req, res, next) => {
    try {
      const { id } = req.params as unknown as z.infer<typeof diagramParamsSchema>;
      const nodeData = { ...req.body, diagramId: id };
      const node = await electricalDiagramService.createNode(nodeData);
      res.status(201).json(node);
    } catch (error) {
      next(error);
    }
  }
);

// Update a node
router.put(
  '/nodes/:id',
  authenticate,
  validateParams(diagramParamsSchema),
  validateBody(insertDiagramNodeSchema.partial()),
  async (req, res, next) => {
    try {
      const { id } = req.params as unknown as z.infer<typeof diagramParamsSchema>;
      const node = await electricalDiagramService.updateNode(id, req.body);
      
      if (!node) {
        return res.status(404).json({ message: 'Node not found' });
      }
      
      res.json(node);
    } catch (error) {
      next(error);
    }
  }
);

// Delete a node
router.delete(
  '/nodes/:id',
  authenticate,
  validateParams(diagramParamsSchema),
  async (req, res, next) => {
    try {
      const { id } = req.params as unknown as z.infer<typeof diagramParamsSchema>;
      const success = await electricalDiagramService.deleteNode(id);
      
      if (!success) {
        return res.status(404).json({ message: 'Node not found' });
      }
      
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  }
);

// Add an edge to a diagram
router.post(
  '/:id/edges',
  authenticate,
  validateParams(diagramParamsSchema),
  validateBody(insertDiagramEdgeSchema),
  async (req, res, next) => {
    try {
      const { id } = req.params as unknown as z.infer<typeof diagramParamsSchema>;
      const edgeData = { ...req.body, diagramId: id };
      const edge = await electricalDiagramService.createEdge(edgeData);
      res.status(201).json(edge);
    } catch (error) {
      next(error);
    }
  }
);

// Update an edge
router.put(
  '/edges/:id',
  authenticate,
  validateParams(diagramParamsSchema),
  validateBody(insertDiagramEdgeSchema.partial()),
  async (req, res, next) => {
    try {
      const { id } = req.params as unknown as z.infer<typeof diagramParamsSchema>;
      const edge = await electricalDiagramService.updateEdge(id, req.body);
      
      if (!edge) {
        return res.status(404).json({ message: 'Edge not found' });
      }
      
      res.json(edge);
    } catch (error) {
      next(error);
    }
  }
);

// Delete an edge
router.delete(
  '/edges/:id',
  authenticate,
  validateParams(diagramParamsSchema),
  async (req, res, next) => {
    try {
      const { id } = req.params as unknown as z.infer<typeof diagramParamsSchema>;
      const success = await electricalDiagramService.deleteEdge(id);
      
      if (!success) {
        return res.status(404).json({ message: 'Edge not found' });
      }
      
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  }
);

// Bulk update entire diagram (nodes and edges)
router.put(
  '/:id/bulk',
  authenticate,
  validateParams(diagramParamsSchema),
  validateBody(z.object({
    nodes: z.array(insertDiagramNodeSchema.omit({ diagramId: true })),
    edges: z.array(insertDiagramEdgeSchema.omit({ diagramId: true })),
  })),
  async (req, res, next) => {
    try {
      const { id } = req.params as unknown as z.infer<typeof diagramParamsSchema>;
      const { nodes, edges } = req.body;
      
      const result = await electricalDiagramService.updateEntireDiagram(id, nodes, edges);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

// Calculate electrical parameters for diagram
router.post(
  '/:id/calculate',
  authenticate,
  validateParams(diagramParamsSchema),
  async (req, res, next) => {
    try {
      const { id } = req.params as unknown as z.infer<typeof diagramParamsSchema>;
      const calculations = await electricalDiagramService.calculateDiagramParameters(id);
      res.json(calculations);
    } catch (error) {
      next(error);
    }
  }
);

// Get real-time state for diagram
router.get(
  '/:id/real-time',
  authenticate,
  validateParams(diagramParamsSchema),
  async (req, res, next) => {
    try {
      const { id } = req.params as unknown as z.infer<typeof diagramParamsSchema>;
      const state = await electricalDiagramService.getDiagramRealTimeState(id);
      res.json(state);
    } catch (error) {
      next(error);
    }
  }
);

export const electricalDiagramRoutes = router;