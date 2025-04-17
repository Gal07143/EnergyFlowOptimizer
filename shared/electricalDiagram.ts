import { pgTable, serial, text, integer, jsonb, varchar, timestamp, pgEnum, boolean } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';
import { relations } from 'drizzle-orm';
import { sites } from './schema';

// Enum for node types in the electrical diagram
export const nodeTypeEnum = pgEnum('node_type', [
  'main_grid',
  'generator',
  'lv_panel',
  'hv_panel', 
  'transformer',
  'circuit_breaker',
  'switch',
  'energy_meter',
  'solar_inverter',
  'battery_inverter',
  'ev_charger',
  'motor',
  'load',
  'device' // Link to real device in the system
]);

// Main table for electrical diagrams
export const electricalDiagrams = pgTable('electrical_diagrams', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  siteId: integer('site_id').references(() => sites.id, { onDelete: 'cascade' }),
  description: text('description'),
  isActive: boolean('is_active').default(true).notNull(),
  lastCalculatedAt: timestamp('last_calculated_at'),
  customSettings: jsonb('custom_settings').default({}),
  thumbnail: text('thumbnail'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// Table for diagram nodes
export const diagramNodes = pgTable('diagram_nodes', {
  id: serial('id').primaryKey(),
  diagramId: integer('diagram_id').notNull().references(() => electricalDiagrams.id, { onDelete: 'cascade' }),
  type: nodeTypeEnum('type').notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  positionX: integer('position_x').notNull(),
  positionY: integer('position_y').notNull(),
  properties: jsonb('properties').notNull().default({}),
  deviceId: integer('device_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// Table for diagram edges/connections
export const diagramEdges = pgTable('diagram_edges', {
  id: serial('id').primaryKey(),
  diagramId: integer('diagram_id').notNull().references(() => electricalDiagrams.id, { onDelete: 'cascade' }),
  sourceId: integer('source_id').notNull().references(() => diagramNodes.id, { onDelete: 'cascade' }),
  targetId: integer('target_id').notNull().references(() => diagramNodes.id, { onDelete: 'cascade' }),
  type: varchar('type', { length: 50 }).default('standard').notNull(),
  properties: jsonb('properties').notNull().default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// Define relations
export const electricalDiagramsRelations = relations(electricalDiagrams, ({ many }) => ({
  nodes: many(diagramNodes),
  edges: many(diagramEdges)
}));

export const diagramNodesRelations = relations(diagramNodes, ({ one, many }) => ({
  diagram: one(electricalDiagrams, {
    fields: [diagramNodes.diagramId],
    references: [electricalDiagrams.id]
  }),
  outgoingEdges: many(diagramEdges, { relationName: 'source' }),
  incomingEdges: many(diagramEdges, { relationName: 'target' })
}));

export const diagramEdgesRelations = relations(diagramEdges, ({ one }) => ({
  diagram: one(electricalDiagrams, {
    fields: [diagramEdges.diagramId],
    references: [electricalDiagrams.id]
  }),
  source: one(diagramNodes, {
    fields: [diagramEdges.sourceId],
    references: [diagramNodes.id],
    relationName: 'source'
  }),
  target: one(diagramNodes, {
    fields: [diagramEdges.targetId],
    references: [diagramNodes.id],
    relationName: 'target'
  })
}));

// Type definitions
export type ElectricalDiagram = typeof electricalDiagrams.$inferSelect;
export type DiagramNode = typeof diagramNodes.$inferSelect;
export type DiagramEdge = typeof diagramEdges.$inferSelect;

// Insert schemas
export const insertElectricalDiagramSchema = createInsertSchema(electricalDiagrams)
  .omit({ id: true, createdAt: true, updatedAt: true, lastCalculatedAt: true });
export const insertDiagramNodeSchema = createInsertSchema(diagramNodes)
  .omit({ id: true, createdAt: true, updatedAt: true });
export const insertDiagramEdgeSchema = createInsertSchema(diagramEdges)
  .omit({ id: true, createdAt: true, updatedAt: true });

// Insert types
export type InsertElectricalDiagram = z.infer<typeof insertElectricalDiagramSchema>;
export type InsertDiagramNode = z.infer<typeof insertDiagramNodeSchema>;
export type InsertDiagramEdge = z.infer<typeof insertDiagramEdgeSchema>;

// Extended types for frontend
export type DiagramNodeWithConnections = DiagramNode & {
  incomingEdges?: DiagramEdge[];
  outgoingEdges?: DiagramEdge[];
};

export type ElectricalDiagramComplete = ElectricalDiagram & {
  nodes: DiagramNodeWithConnections[];
  edges: DiagramEdge[];
};

// Node properties by type
export const nodePropertiesSchema = {
  main_grid: z.object({
    voltage: z.number().optional(),
    maxSupply: z.number().optional(), // kW
    provider: z.string().optional(),
    tariffId: z.number().optional()
  }),
  generator: z.object({
    capacity: z.number().optional(), // kW
    fuel: z.string().optional(),
    efficiency: z.number().optional()
  }),
  lv_panel: z.object({
    voltage: z.number().optional(), // V
    capacity: z.number().optional(), // A
    phases: z.number().optional(),
    location: z.string().optional()
  }),
  hv_panel: z.object({
    voltage: z.number().optional(), // kV
    capacity: z.number().optional(), // A
    phases: z.number().optional(),
    location: z.string().optional()
  }),
  transformer: z.object({
    primaryVoltage: z.number().optional(), // kV
    secondaryVoltage: z.number().optional(), // V
    capacity: z.number().optional(), // kVA
    impedance: z.number().optional(), // %
    efficiency: z.number().optional() // %
  }),
  circuit_breaker: z.object({
    rating: z.number().optional(), // A
    breaking: z.number().optional(), // kA
    poles: z.number().optional()
  }),
  switch: z.object({
    rating: z.number().optional(), // A
    type: z.string().optional(),
    state: z.boolean().optional() // true = closed, false = open
  }),
  energy_meter: z.object({
    meterId: z.number().optional(),
    meterType: z.string().optional(),
    direction: z.enum(['import', 'export', 'bidirectional']).optional()
  }),
  solar_inverter: z.object({
    capacity: z.number().optional(), // kW
    efficiency: z.number().optional(), // %
    mppt: z.number().optional() // Number of MPPT trackers
  }),
  battery_inverter: z.object({
    capacity: z.number().optional(), // kW
    batteryCapacity: z.number().optional(), // kWh
    efficiency: z.number().optional() // %
  }),
  ev_charger: z.object({
    power: z.number().optional(), // kW
    connector: z.string().optional(),
    phases: z.number().optional()
  }),
  motor: z.object({
    power: z.number().optional(), // kW
    efficiency: z.number().optional(), // %
    type: z.string().optional()
  }),
  load: z.object({
    power: z.number().optional(), // kW
    description: z.string().optional(),
    priority: z.number().optional() // 1-5, for load shedding
  }),
  device: z.object({
    deviceId: z.number().optional(),
    deviceType: z.string().optional()
  })
};