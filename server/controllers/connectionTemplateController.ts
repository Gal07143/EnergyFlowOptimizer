import { Request, Response } from 'express';
import { db } from '../db';
import { 
  deviceCatalog, 
  deviceManufacturers, 
  deviceCatalogPresets,
  deviceConnectionTemplates,
  DeviceConnectionTemplate
} from '@shared/schema';
import { eq, and, or, sql, SQL } from 'drizzle-orm';

/**
 * Get connection templates based on manufacturer, device catalog, and protocol
 */
export async function getConnectionTemplates(req: Request, res: Response) {
  try {
    const { manufacturerId, deviceCatalogId, protocol } = req.query;
    
    // Build the query based on filters
    let query = db.select().from(deviceConnectionTemplates);
    
    if (manufacturerId) {
      const id = parseInt(manufacturerId as string);
      if (!isNaN(id)) {
        query = query.where(eq(deviceConnectionTemplates.manufacturerId, id));
      }
    }
    
    if (deviceCatalogId) {
      const id = parseInt(deviceCatalogId as string);
      if (!isNaN(id)) {
        query = query.where(eq(deviceConnectionTemplates.deviceCatalogId, id));
      }
    }
    
    if (protocol) {
      query = query.where(eq(deviceConnectionTemplates.protocol, protocol as string));
    }
    
    // Fallback to query by protocol only if no templates found
    const templates = await query;
    
    if (templates.length === 0 && protocol) {
      // If we didn't find templates specific to the manufacturer or model,
      // return generic templates for this protocol
      const genericTemplates = await db
        .select()
        .from(deviceConnectionTemplates)
        .where(
          and(
            eq(deviceConnectionTemplates.protocol, protocol as string),
            sql`${deviceConnectionTemplates.manufacturerId} IS NULL`,
            sql`${deviceConnectionTemplates.deviceCatalogId} IS NULL`
          )
        );
      
      return res.json(genericTemplates);
    }
    
    return res.json(templates);
  } catch (error) {
    console.error('Error fetching connection templates:', error);
    return res.status(500).json({ 
      message: 'Failed to fetch connection templates',
      error: (error as Error).message
    });
  }
}

/**
 * Create a new connection template
 */
export async function createConnectionTemplate(req: Request, res: Response) {
  try {
    const { name, description, protocol, manufacturerId, deviceCatalogId, settings, isDefault } = req.body;
    
    // Validate required fields
    if (!name || !protocol || !settings) {
      return res.status(400).json({ message: 'Missing required fields: name, protocol, and settings are required' });
    }
    
    // Insert the template
    const [template] = await db.insert(deviceConnectionTemplates).values({
      name,
      description,
      protocol,
      manufacturerId: manufacturerId || null,
      deviceCatalogId: deviceCatalogId || null,
      settings,
      isDefault: isDefault || false,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    
    // If this is set as default, update other templates of same criteria to not be default
    if (isDefault) {
      await db.update(deviceConnectionTemplates)
        .set({ isDefault: false })
        .where(
          and(
            eq(deviceConnectionTemplates.protocol, protocol),
            manufacturerId === null 
              ? sql`${deviceConnectionTemplates.manufacturerId} IS NULL` 
              : eq(deviceConnectionTemplates.manufacturerId, manufacturerId),
            deviceCatalogId === null 
              ? sql`${deviceConnectionTemplates.deviceCatalogId} IS NULL` 
              : eq(deviceConnectionTemplates.deviceCatalogId, deviceCatalogId),
            sql`${deviceConnectionTemplates.id} != ${template.id}`
          )
        );
    }
    
    return res.status(201).json(template);
  } catch (error) {
    console.error('Error creating connection template:', error);
    return res.status(500).json({ 
      message: 'Failed to create connection template',
      error: (error as Error).message
    });
  }
}

/**
 * Update an existing connection template
 */
export async function updateConnectionTemplate(req: Request, res: Response) {
  try {
    const templateId = parseInt(req.params.id);
    
    if (isNaN(templateId)) {
      return res.status(400).json({ message: 'Invalid template ID' });
    }
    
    const { name, description, protocol, manufacturerId, deviceCatalogId, settings, isDefault } = req.body;
    
    // Check if template exists
    const existingTemplate = await db
      .select()
      .from(deviceConnectionTemplates)
      .where(eq(deviceConnectionTemplates.id, templateId))
      .limit(1);
    
    if (existingTemplate.length === 0) {
      return res.status(404).json({ message: 'Connection template not found' });
    }
    
    // Update the template
    const [updatedTemplate] = await db
      .update(deviceConnectionTemplates)
      .set({
        name: name || existingTemplate[0].name,
        description,
        protocol: protocol || existingTemplate[0].protocol,
        manufacturerId: manufacturerId !== undefined ? manufacturerId : existingTemplate[0].manufacturerId,
        deviceCatalogId: deviceCatalogId !== undefined ? deviceCatalogId : existingTemplate[0].deviceCatalogId,
        settings: settings || existingTemplate[0].settings,
        isDefault: isDefault !== undefined ? isDefault : existingTemplate[0].isDefault,
        updatedAt: new Date()
      })
      .where(eq(deviceConnectionTemplates.id, templateId))
      .returning();
    
    // If this is set as default, update other templates of same criteria to not be default
    if (isDefault) {
      await db.update(deviceConnectionTemplates)
        .set({ isDefault: false })
        .where(
          and(
            eq(deviceConnectionTemplates.protocol, updatedTemplate.protocol),
            updatedTemplate.manufacturerId === null 
              ? sql`${deviceConnectionTemplates.manufacturerId} IS NULL` 
              : eq(deviceConnectionTemplates.manufacturerId, updatedTemplate.manufacturerId),
            updatedTemplate.deviceCatalogId === null 
              ? sql`${deviceConnectionTemplates.deviceCatalogId} IS NULL` 
              : eq(deviceConnectionTemplates.deviceCatalogId, updatedTemplate.deviceCatalogId),
            sql`${deviceConnectionTemplates.id} != ${updatedTemplate.id}`
          )
        );
    }
    
    return res.json(updatedTemplate);
  } catch (error) {
    console.error('Error updating connection template:', error);
    return res.status(500).json({ 
      message: 'Failed to update connection template',
      error: (error as Error).message
    });
  }
}

/**
 * Delete a connection template
 */
export async function deleteConnectionTemplate(req: Request, res: Response) {
  try {
    const templateId = parseInt(req.params.id);
    
    if (isNaN(templateId)) {
      return res.status(400).json({ message: 'Invalid template ID' });
    }
    
    // Check if template exists
    const existingTemplate = await db
      .select()
      .from(deviceConnectionTemplates)
      .where(eq(deviceConnectionTemplates.id, templateId))
      .limit(1);
    
    if (existingTemplate.length === 0) {
      return res.status(404).json({ message: 'Connection template not found' });
    }
    
    // Delete the template
    await db
      .delete(deviceConnectionTemplates)
      .where(eq(deviceConnectionTemplates.id, templateId));
    
    return res.json({ message: 'Connection template deleted successfully' });
  } catch (error) {
    console.error('Error deleting connection template:', error);
    return res.status(500).json({ 
      message: 'Failed to delete connection template',
      error: (error as Error).message
    });
  }
}