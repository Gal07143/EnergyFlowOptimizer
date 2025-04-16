import { Request, Response } from 'express';
import { 
  demandResponsePrograms, 
  demandResponseEvents, 
  siteDemandResponseSettings, 
  siteEventParticipations, 
  demandResponseActions,
  insertDemandResponseProgramSchema,
  insertDemandResponseEventSchema,
  insertSiteDemandResponseSettingsSchema,
  insertSiteEventParticipationSchema,
  insertDemandResponseActionSchema
} from '@shared/schema';
import { db } from '../db';
import { eq, and, desc } from 'drizzle-orm';

// Programs
export async function getDemandResponsePrograms(req: Request, res: Response) {
  try {
    const siteId = Number(req.params.siteId);
    const programs = await db
      .select()
      .from(demandResponsePrograms)
      .where(eq(demandResponsePrograms.siteId, siteId))
      .orderBy(desc(demandResponsePrograms.createdAt));
    
    res.json(programs);
  } catch (error) {
    console.error('Error fetching demand response programs:', error);
    res.status(500).json({ message: 'Failed to fetch demand response programs' });
  }
}

export async function getDemandResponseProgram(req: Request, res: Response) {
  try {
    const programId = Number(req.params.id);
    const [program] = await db
      .select()
      .from(demandResponsePrograms)
      .where(eq(demandResponsePrograms.id, programId));
    
    if (!program) {
      return res.status(404).json({ message: 'Demand response program not found' });
    }
    
    res.json(program);
  } catch (error) {
    console.error('Error fetching demand response program:', error);
    res.status(500).json({ message: 'Failed to fetch demand response program' });
  }
}

export async function createDemandResponseProgram(req: Request, res: Response) {
  try {
    const validatedData = insertDemandResponseProgramSchema.parse(req.body);
    
    const [program] = await db
      .insert(demandResponsePrograms)
      .values(validatedData)
      .returning();
    
    res.status(201).json(program);
  } catch (error) {
    console.error('Error creating demand response program:', error);
    res.status(500).json({ message: 'Failed to create demand response program' });
  }
}

export async function updateDemandResponseProgram(req: Request, res: Response) {
  try {
    const programId = Number(req.params.id);
    const validatedData = insertDemandResponseProgramSchema.partial().parse(req.body);
    
    const [updatedProgram] = await db
      .update(demandResponsePrograms)
      .set({
        ...validatedData,
        updatedAt: new Date()
      })
      .where(eq(demandResponsePrograms.id, programId))
      .returning();
    
    if (!updatedProgram) {
      return res.status(404).json({ message: 'Demand response program not found' });
    }
    
    res.json(updatedProgram);
  } catch (error) {
    console.error('Error updating demand response program:', error);
    res.status(500).json({ message: 'Failed to update demand response program' });
  }
}

// Events
export async function getDemandResponseEvents(req: Request, res: Response) {
  try {
    const siteId = Number(req.params.siteId);
    const events = await db
      .select()
      .from(demandResponseEvents)
      .where(eq(demandResponseEvents.siteId, siteId))
      .orderBy(desc(demandResponseEvents.startTime));
    
    res.json(events);
  } catch (error) {
    console.error('Error fetching demand response events:', error);
    res.status(500).json({ message: 'Failed to fetch demand response events' });
  }
}

export async function getDemandResponseEvent(req: Request, res: Response) {
  try {
    const eventId = Number(req.params.id);
    const [event] = await db
      .select()
      .from(demandResponseEvents)
      .where(eq(demandResponseEvents.id, eventId));
    
    if (!event) {
      return res.status(404).json({ message: 'Demand response event not found' });
    }
    
    res.json(event);
  } catch (error) {
    console.error('Error fetching demand response event:', error);
    res.status(500).json({ message: 'Failed to fetch demand response event' });
  }
}

export async function createDemandResponseEvent(req: Request, res: Response) {
  try {
    const validatedData = insertDemandResponseEventSchema.parse(req.body);
    
    const [event] = await db
      .insert(demandResponseEvents)
      .values(validatedData)
      .returning();
    
    res.status(201).json(event);
  } catch (error) {
    console.error('Error creating demand response event:', error);
    res.status(500).json({ message: 'Failed to create demand response event' });
  }
}

export async function updateDemandResponseEvent(req: Request, res: Response) {
  try {
    const eventId = Number(req.params.id);
    const validatedData = insertDemandResponseEventSchema.partial().parse(req.body);
    
    const [updatedEvent] = await db
      .update(demandResponseEvents)
      .set({
        ...validatedData,
        updatedAt: new Date()
      })
      .where(eq(demandResponseEvents.id, eventId))
      .returning();
    
    if (!updatedEvent) {
      return res.status(404).json({ message: 'Demand response event not found' });
    }
    
    res.json(updatedEvent);
  } catch (error) {
    console.error('Error updating demand response event:', error);
    res.status(500).json({ message: 'Failed to update demand response event' });
  }
}

// Site Demand Response Settings
export async function getSiteDemandResponseSettings(req: Request, res: Response) {
  try {
    const siteId = Number(req.params.siteId);
    const [settings] = await db
      .select()
      .from(siteDemandResponseSettings)
      .where(eq(siteDemandResponseSettings.siteId, siteId));
    
    if (!settings) {
      return res.status(404).json({ message: 'Site demand response settings not found' });
    }
    
    res.json(settings);
  } catch (error) {
    console.error('Error fetching site demand response settings:', error);
    res.status(500).json({ message: 'Failed to fetch site demand response settings' });
  }
}

export async function createSiteDemandResponseSettings(req: Request, res: Response) {
  try {
    const validatedData = insertSiteDemandResponseSettingsSchema.parse(req.body);
    
    const [settings] = await db
      .insert(siteDemandResponseSettings)
      .values(validatedData)
      .returning();
    
    res.status(201).json(settings);
  } catch (error) {
    console.error('Error creating site demand response settings:', error);
    res.status(500).json({ message: 'Failed to create site demand response settings' });
  }
}

export async function updateSiteDemandResponseSettings(req: Request, res: Response) {
  try {
    const siteId = Number(req.params.siteId);
    const validatedData = insertSiteDemandResponseSettingsSchema.partial().parse(req.body);
    
    const [updatedSettings] = await db
      .update(siteDemandResponseSettings)
      .set({
        ...validatedData,
        updatedAt: new Date()
      })
      .where(eq(siteDemandResponseSettings.siteId, siteId))
      .returning();
    
    if (!updatedSettings) {
      return res.status(404).json({ message: 'Site demand response settings not found' });
    }
    
    res.json(updatedSettings);
  } catch (error) {
    console.error('Error updating site demand response settings:', error);
    res.status(500).json({ message: 'Failed to update site demand response settings' });
  }
}

// Site Event Participations
export async function getSiteEventParticipations(req: Request, res: Response) {
  try {
    const siteId = Number(req.params.siteId);
    const participations = await db
      .select()
      .from(siteEventParticipations)
      .where(eq(siteEventParticipations.siteId, siteId))
      .orderBy(desc(siteEventParticipations.createdAt));
    
    res.json(participations);
  } catch (error) {
    console.error('Error fetching site event participations:', error);
    res.status(500).json({ message: 'Failed to fetch site event participations' });
  }
}

export async function getSiteEventParticipation(req: Request, res: Response) {
  try {
    const participationId = Number(req.params.id);
    const [participation] = await db
      .select()
      .from(siteEventParticipations)
      .where(eq(siteEventParticipations.id, participationId));
    
    if (!participation) {
      return res.status(404).json({ message: 'Site event participation not found' });
    }
    
    res.json(participation);
  } catch (error) {
    console.error('Error fetching site event participation:', error);
    res.status(500).json({ message: 'Failed to fetch site event participation' });
  }
}

export async function createSiteEventParticipation(req: Request, res: Response) {
  try {
    const validatedData = insertSiteEventParticipationSchema.parse(req.body);
    
    const [participation] = await db
      .insert(siteEventParticipations)
      .values(validatedData)
      .returning();
    
    res.status(201).json(participation);
  } catch (error) {
    console.error('Error creating site event participation:', error);
    res.status(500).json({ message: 'Failed to create site event participation' });
  }
}

export async function updateSiteEventParticipation(req: Request, res: Response) {
  try {
    const participationId = Number(req.params.id);
    const validatedData = insertSiteEventParticipationSchema.partial().parse(req.body);
    
    const [updatedParticipation] = await db
      .update(siteEventParticipations)
      .set({
        ...validatedData,
        updatedAt: new Date()
      })
      .where(eq(siteEventParticipations.id, participationId))
      .returning();
    
    if (!updatedParticipation) {
      return res.status(404).json({ message: 'Site event participation not found' });
    }
    
    res.json(updatedParticipation);
  } catch (error) {
    console.error('Error updating site event participation:', error);
    res.status(500).json({ message: 'Failed to update site event participation' });
  }
}

// Demand Response Actions
export async function getDemandResponseActions(req: Request, res: Response) {
  try {
    const eventId = Number(req.params.eventId);
    const actions = await db
      .select()
      .from(demandResponseActions)
      .where(eq(demandResponseActions.eventId, eventId))
      .orderBy(desc(demandResponseActions.createdAt));
    
    res.json(actions);
  } catch (error) {
    console.error('Error fetching demand response actions:', error);
    res.status(500).json({ message: 'Failed to fetch demand response actions' });
  }
}

export async function createDemandResponseAction(req: Request, res: Response) {
  try {
    const validatedData = insertDemandResponseActionSchema.parse(req.body);
    
    const [action] = await db
      .insert(demandResponseActions)
      .values(validatedData)
      .returning();
    
    res.status(201).json(action);
  } catch (error) {
    console.error('Error creating demand response action:', error);
    res.status(500).json({ message: 'Failed to create demand response action' });
  }
}

// Demo data initialization
export async function createDemoDemandResponseData(siteId: number) {
  try {
    // Create a demo demand response program
    const [program] = await db
      .insert(demandResponsePrograms)
      .values({
        siteId,
        name: "Peak Demand Reduction Program",
        provider: "Grid Utility Co.",
        programType: "peak_time_rebate",
        description: "Voluntary program for reducing electricity usage during peak demand periods.",
        incentiveRate: 0.25,
        isActive: true,
        notificationLeadTime: 60,
        startDate: new Date("2025-01-01"),
        endDate: new Date("2025-12-31"),
        metadata: { minParticipationDuration: 60, maxEventsPerMonth: 5 },
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();

    // Create site demand response settings
    const [settings] = await db
      .insert(siteDemandResponseSettings)
      .values({
        siteId,
        isEnrolled: true,
        maxReductionCapacity: 3.5,
        defaultParticipation: "opt_in",
        notificationEmail: "user@example.com",
        notificationSms: "+1234567890",
        notificationPush: true,
        autoResponseEnabled: true,
        devicePriorities: { 1: 1, 2: 2, 3: 3 },
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();

    // Create a scheduled demand response event
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(14, 0, 0, 0);
    const tomorrowEnd = new Date(tomorrow);
    tomorrowEnd.setHours(16, 0, 0, 0);

    const [scheduledEvent] = await db
      .insert(demandResponseEvents)
      .values({
        siteId,
        programId: program.id,
        name: "Tomorrow's Peak Reduction Event",
        description: "Reduce consumption during peak afternoon hours",
        status: "scheduled",
        startTime: tomorrow,
        endTime: tomorrowEnd,
        targetReduction: 2.5,
        isEmergency: false,
        incentiveMultiplier: 1.0,
        metadata: { forecastedGridLoad: "high", weatherAlert: false },
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();

    // Create a completed demand response event in the past
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(15, 0, 0, 0);
    const yesterdayEnd = new Date(yesterday);
    yesterdayEnd.setHours(17, 0, 0, 0);

    const [completedEvent] = await db
      .insert(demandResponseEvents)
      .values({
        siteId,
        programId: program.id,
        name: "Yesterday's Peak Reduction Event",
        description: "Reduce consumption during peak afternoon hours",
        status: "completed",
        startTime: yesterday,
        endTime: yesterdayEnd,
        targetReduction: 2.0,
        isEmergency: false,
        incentiveMultiplier: 1.0,
        metadata: { forecastedGridLoad: "critical", weatherAlert: true },
        createdAt: new Date(yesterday.getTime() - 86400000), // 1 day before event
        updatedAt: new Date(yesterdayEnd.getTime() + 3600000) // 1 hour after event
      })
      .returning();

    // Create participation for the completed event
    const [participation] = await db
      .insert(siteEventParticipations)
      .values({
        siteId,
        eventId: completedEvent.id,
        participationStatus: "opt_in",
        baselineConsumption: 5.2,
        actualConsumption: 3.1,
        reductionAchieved: 2.1,
        incentiveEarned: 0.53,
        createdAt: new Date(yesterday.getTime() - 86400000),
        updatedAt: new Date(yesterdayEnd.getTime() + 3600000)
      })
      .returning();

    // Create participation for the scheduled event
    await db
      .insert(siteEventParticipations)
      .values({
        siteId,
        eventId: scheduledEvent.id,
        participationStatus: "opt_in",
        baselineConsumption: null,
        actualConsumption: null,
        reductionAchieved: null,
        incentiveEarned: null,
        createdAt: new Date(),
        updatedAt: new Date()
      });

    // Create some demand response actions for the completed event
    // First we need the site participation for the completed event
    const [completedParticipation] = await db
      .select()
      .from(siteEventParticipations)
      .where(eq(siteEventParticipations.eventId, completedEvent.id))
      .limit(1);

    if (completedParticipation) {
      await db
        .insert(demandResponseActions)
        .values([
          {
            participationId: completedParticipation.id,
            deviceId: 1,
            actionType: "setpoint_adjustment",
            startTime: new Date(yesterday.getTime()),
            endTime: new Date(yesterdayEnd.getTime()),
            setPoint: 24,
            estimatedReduction: 0.8,
            actualReduction: 0.7,
            status: "completed",
            createdAt: new Date(yesterday.getTime() - 300000), // 5 minutes before event
            updatedAt: new Date(yesterdayEnd.getTime() + 300000) // 5 minutes after event
          },
          {
            participationId: completedParticipation.id,
            deviceId: 2,
            actionType: "charging_delay",
            startTime: new Date(yesterday.getTime()),
            endTime: new Date(yesterdayEnd.getTime()),
            estimatedReduction: 1.2,
            actualReduction: 1.3,
            status: "completed",
            createdAt: new Date(yesterday.getTime() - 300000),
            updatedAt: new Date(yesterdayEnd.getTime() + 300000)
          }
        ]);
    }

    return { program, settings, events: [scheduledEvent, completedEvent] };
  } catch (error) {
    console.error('Error creating demo demand response data:', error);
    throw error;
  }
}