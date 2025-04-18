import { db } from '../db';
import { eventLogs, EventLog, InsertEventLog } from '@shared/schema';

/**
 * Create a new event log entry
 */
export async function createEventLog(
  eventLogData: Omit<InsertEventLog, 'timestamp'>
): Promise<EventLog> {
  try {
    const [eventLog] = await db
      .insert(eventLogs)
      .values({
        ...eventLogData,
        timestamp: new Date()
      })
      .returning();
    
    return eventLog;
  } catch (error) {
    console.error('Error creating event log:', error);
    throw error;
  }
}

/**
 * Retrieve event logs with filtering options
 */
export async function getEventLogs(options: {
  siteId?: number;
  deviceId?: number;
  userId?: number;
  eventType?: string;
  eventCategory?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}): Promise<EventLog[]> {
  try {
    const { siteId, deviceId, userId, eventType, eventCategory, startDate, endDate, limit = 100, offset = 0 } = options;
    
    // Build query dynamically based on filters
    let query = db.select().from(eventLogs);
    
    if (siteId) {
      query = query.where(eq(eventLogs.siteId, siteId));
    }
    
    if (deviceId) {
      query = query.where(eq(eventLogs.deviceId, deviceId));
    }
    
    if (userId) {
      query = query.where(eq(eventLogs.userId, userId));
    }
    
    if (eventType) {
      query = query.where(eq(eventLogs.eventType, eventType));
    }
    
    if (eventCategory) {
      query = query.where(eq(eventLogs.eventCategory, eventCategory));
    }
    
    if (startDate && endDate) {
      query = query.where(
        and(
          gte(eventLogs.timestamp, startDate),
          lte(eventLogs.timestamp, endDate)
        )
      );
    } else if (startDate) {
      query = query.where(gte(eventLogs.timestamp, startDate));
    } else if (endDate) {
      query = query.where(lte(eventLogs.timestamp, endDate));
    }
    
    // Add pagination
    query = query
      .orderBy(desc(eventLogs.timestamp))
      .limit(limit)
      .offset(offset);
    
    return await query;
  } catch (error) {
    console.error('Error retrieving event logs:', error);
    throw error;
  }
}

/**
 * Get event log by ID
 */
export async function getEventLogById(id: number): Promise<EventLog | undefined> {
  try {
    const [eventLog] = await db
      .select()
      .from(eventLogs)
      .where(eq(eventLogs.id, id));
    
    return eventLog;
  } catch (error) {
    console.error('Error retrieving event log by ID:', error);
    throw error;
  }
}

// Import statement for operators
import { eq, desc, and, gte, lte } from 'drizzle-orm';