import { Request, Response } from 'express';
import { 
  evVehicles, 
  evChargingSessions, 
  v2gServiceProviders, 
  v2gServiceEnrollments, 
  v2gDischargeEvents,
  insertEVVehicleSchema,
  insertEVChargingSessionSchema,
  insertV2GServiceProviderSchema,
  insertV2GServiceEnrollmentSchema,
  insertV2GDischargeEventSchema,
  evChargingModeEnum,
  v2gServiceTypeEnum
} from '@shared/schema';
import { db } from '../db';
import { eq, and, desc, isNull, not, sql } from 'drizzle-orm';
import { z } from 'zod';

// Define a simplified authenticated request interface for controller
interface AuthenticatedRequest extends Request {
  user: {
    id: number;
    role: string;
    partnerId?: number;
    [key: string]: any;
  };
}

// EV Vehicle Management
export async function getEVVehicles(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.query.userId ? Number(req.query.userId) : (req.user?.id || null);
    
    // If admin and querying other users' vehicles
    if (req.user.role === 'admin' && req.query.userId) {
      // Allow admin to view any user's vehicles
    } else if (userId !== req.user.id) {
      // Non-admin users can only view their own vehicles
      return res.status(403).json({ message: 'You can only view your own vehicles' });
    }
    
    let query = db.select().from(evVehicles);
    
    if (userId) {
      query = query.where(eq(evVehicles.userId, userId));
    }
    
    const vehicles = await query.orderBy(desc(evVehicles.updatedAt));
    
    res.json(vehicles);
  } catch (error) {
    console.error('Error fetching EV vehicles:', error);
    res.status(500).json({ message: 'Failed to fetch EV vehicles' });
  }
}

export async function getEVVehicleById(req: AuthenticatedRequest, res: Response) {
  try {
    const vehicleId = Number(req.params.id);
    
    const [vehicle] = await db
      .select()
      .from(evVehicles)
      .where(eq(evVehicles.id, vehicleId));
    
    if (!vehicle) {
      return res.status(404).json({ message: 'EV vehicle not found' });
    }
    
    // Check if user is authorized to view this vehicle
    if (req.user.role !== 'admin' && vehicle.userId !== req.user.id) {
      return res.status(403).json({ message: 'You are not authorized to view this vehicle' });
    }
    
    res.json(vehicle);
  } catch (error) {
    console.error('Error fetching EV vehicle:', error);
    res.status(500).json({ message: 'Failed to fetch EV vehicle' });
  }
}

export async function createEVVehicle(req: AuthenticatedRequest, res: Response) {
  try {
    // Force userId to be the authenticated user's ID unless admin
    if (req.user.role !== 'admin' && req.body.userId && req.body.userId !== req.user.id) {
      return res.status(403).json({ message: 'You can only create vehicles for yourself' });
    }
    
    // Set userId to the authenticated user if not provided
    if (!req.body.userId) {
      req.body.userId = req.user.id;
    }
    
    // Validate input
    const validatedData = insertEVVehicleSchema.parse(req.body);
    
    // Create vehicle
    const [vehicle] = await db
      .insert(evVehicles)
      .values(validatedData)
      .returning();
    
    res.status(201).json(vehicle);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid data', errors: error.errors });
    }
    console.error('Error creating EV vehicle:', error);
    res.status(500).json({ message: 'Failed to create EV vehicle' });
  }
}

export async function updateEVVehicle(req: AuthenticatedRequest, res: Response) {
  try {
    const vehicleId = Number(req.params.id);
    
    // Get the existing vehicle
    const [existingVehicle] = await db
      .select()
      .from(evVehicles)
      .where(eq(evVehicles.id, vehicleId));
    
    if (!existingVehicle) {
      return res.status(404).json({ message: 'EV vehicle not found' });
    }
    
    // Check if user is authorized to update this vehicle
    if (req.user.role !== 'admin' && existingVehicle.userId !== req.user.id) {
      return res.status(403).json({ message: 'You are not authorized to update this vehicle' });
    }
    
    // Prevent changing userId unless admin
    if (req.user.role !== 'admin' && req.body.userId && req.body.userId !== existingVehicle.userId) {
      return res.status(403).json({ message: 'You cannot change the owner of this vehicle' });
    }
    
    // Validate input
    const validatedData = insertEVVehicleSchema.parse(req.body);
    
    // Update vehicle
    const [updatedVehicle] = await db
      .update(evVehicles)
      .set({
        ...validatedData,
        updatedAt: new Date()
      })
      .where(eq(evVehicles.id, vehicleId))
      .returning();
    
    res.json(updatedVehicle);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid data', errors: error.errors });
    }
    console.error('Error updating EV vehicle:', error);
    res.status(500).json({ message: 'Failed to update EV vehicle' });
  }
}

export async function deleteEVVehicle(req: AuthenticatedRequest, res: Response) {
  try {
    const vehicleId = Number(req.params.id);
    
    // Get the existing vehicle
    const [existingVehicle] = await db
      .select()
      .from(evVehicles)
      .where(eq(evVehicles.id, vehicleId));
    
    if (!existingVehicle) {
      return res.status(404).json({ message: 'EV vehicle not found' });
    }
    
    // Check if user is authorized to delete this vehicle
    if (req.user.role !== 'admin' && existingVehicle.userId !== req.user.id) {
      return res.status(403).json({ message: 'You are not authorized to delete this vehicle' });
    }
    
    // Check if vehicle has active charging sessions
    const [activeSession] = await db
      .select()
      .from(evChargingSessions)
      .where(and(
        eq(evChargingSessions.vehicleId, vehicleId),
        isNull(evChargingSessions.endTime)
      ));
    
    if (activeSession) {
      return res.status(400).json({ message: 'Cannot delete vehicle with active charging sessions' });
    }
    
    // Check if vehicle has active V2G enrollments
    const [activeEnrollment] = await db
      .select()
      .from(v2gServiceEnrollments)
      .where(and(
        eq(v2gServiceEnrollments.vehicleId, vehicleId),
        eq(v2gServiceEnrollments.status, 'active')
      ));
    
    if (activeEnrollment) {
      return res.status(400).json({ message: 'Cannot delete vehicle with active V2G enrollments' });
    }
    
    // Delete vehicle
    await db
      .delete(evVehicles)
      .where(eq(evVehicles.id, vehicleId));
    
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting EV vehicle:', error);
    res.status(500).json({ message: 'Failed to delete EV vehicle' });
  }
}

// Charging Sessions
export async function getChargingSessions(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.query.userId ? Number(req.query.userId) : (req.user?.id || null);
    const vehicleId = req.query.vehicleId ? Number(req.query.vehicleId) : null;
    const deviceId = req.query.deviceId ? Number(req.query.deviceId) : null;
    const limit = req.query.limit ? Number(req.query.limit) : 50;
    const onlyActive = req.query.active === 'true';
    
    // If admin and querying other users' sessions
    if (req.user.role === 'admin' && req.query.userId) {
      // Allow admin to view any user's sessions
    } else if (userId !== req.user.id) {
      // Non-admin users can only view their own sessions
      return res.status(403).json({ message: 'You can only view your own charging sessions' });
    }
    
    let query = db.select().from(evChargingSessions);
    
    if (userId) {
      query = query.where(eq(evChargingSessions.userId, userId));
    }
    
    if (vehicleId) {
      query = query.where(eq(evChargingSessions.vehicleId, vehicleId));
    }
    
    if (deviceId) {
      query = query.where(eq(evChargingSessions.deviceId, deviceId));
    }
    
    if (onlyActive) {
      query = query.where(isNull(evChargingSessions.endTime));
    }
    
    const sessions = await query
      .orderBy(desc(evChargingSessions.startTime))
      .limit(limit);
    
    res.json(sessions);
  } catch (error) {
    console.error('Error fetching charging sessions:', error);
    res.status(500).json({ message: 'Failed to fetch charging sessions' });
  }
}

export async function getChargingSessionById(req: AuthenticatedRequest, res: Response) {
  try {
    const sessionId = Number(req.params.id);
    
    const [session] = await db
      .select()
      .from(evChargingSessions)
      .where(eq(evChargingSessions.id, sessionId));
    
    if (!session) {
      return res.status(404).json({ message: 'Charging session not found' });
    }
    
    // Check if user is authorized to view this session
    if (req.user.role !== 'admin' && session.userId !== req.user.id) {
      return res.status(403).json({ message: 'You are not authorized to view this charging session' });
    }
    
    res.json(session);
  } catch (error) {
    console.error('Error fetching charging session:', error);
    res.status(500).json({ message: 'Failed to fetch charging session' });
  }
}

export async function createChargingSession(req: AuthenticatedRequest, res: Response) {
  try {
    // Force userId to be the authenticated user's ID unless admin
    if (req.user.role !== 'admin' && req.body.userId && req.body.userId !== req.user.id) {
      return res.status(403).json({ message: 'You can only create charging sessions for yourself' });
    }
    
    // Set userId to the authenticated user if not provided
    if (!req.body.userId) {
      req.body.userId = req.user.id;
    }
    
    // Validate the vehicle belongs to the user
    if (req.body.vehicleId) {
      const [vehicle] = await db
        .select()
        .from(evVehicles)
        .where(eq(evVehicles.id, req.body.vehicleId));
      
      if (!vehicle) {
        return res.status(404).json({ message: 'Vehicle not found' });
      }
      
      if (req.user.role !== 'admin' && vehicle.userId !== req.user.id) {
        return res.status(403).json({ message: 'You do not own this vehicle' });
      }
    }
    
    // Check for active sessions with this vehicle
    if (req.body.vehicleId) {
      const [activeSession] = await db
        .select()
        .from(evChargingSessions)
        .where(and(
          eq(evChargingSessions.vehicleId, req.body.vehicleId),
          isNull(evChargingSessions.endTime)
        ));
      
      if (activeSession) {
        return res.status(400).json({ message: 'Vehicle already has an active charging session' });
      }
    }
    
    // Validate input
    const validatedData = insertEVChargingSessionSchema.parse(req.body);
    
    // Create session
    const [session] = await db
      .insert(evChargingSessions)
      .values(validatedData)
      .returning();
    
    res.status(201).json(session);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid data', errors: error.errors });
    }
    console.error('Error creating charging session:', error);
    res.status(500).json({ message: 'Failed to create charging session' });
  }
}

export async function updateChargingSession(req: AuthenticatedRequest, res: Response) {
  try {
    const sessionId = Number(req.params.id);
    
    // Get the existing session
    const [existingSession] = await db
      .select()
      .from(evChargingSessions)
      .where(eq(evChargingSessions.id, sessionId));
    
    if (!existingSession) {
      return res.status(404).json({ message: 'Charging session not found' });
    }
    
    // Check if user is authorized to update this session
    if (req.user.role !== 'admin' && existingSession.userId !== req.user.id) {
      return res.status(403).json({ message: 'You are not authorized to update this charging session' });
    }
    
    // Prevent changing userId unless admin
    if (req.user.role !== 'admin' && req.body.userId && req.body.userId !== existingSession.userId) {
      return res.status(403).json({ message: 'You cannot change the owner of this charging session' });
    }
    
    // Validate input
    const validatedData = insertEVChargingSessionSchema.parse(req.body);
    
    // Update session
    const [updatedSession] = await db
      .update(evChargingSessions)
      .set({
        ...validatedData,
        updatedAt: new Date()
      })
      .where(eq(evChargingSessions.id, sessionId))
      .returning();
    
    res.json(updatedSession);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid data', errors: error.errors });
    }
    console.error('Error updating charging session:', error);
    res.status(500).json({ message: 'Failed to update charging session' });
  }
}

export async function endChargingSession(req: AuthenticatedRequest, res: Response) {
  try {
    const sessionId = Number(req.params.id);
    
    // Get the existing session
    const [existingSession] = await db
      .select()
      .from(evChargingSessions)
      .where(eq(evChargingSessions.id, sessionId));
    
    if (!existingSession) {
      return res.status(404).json({ message: 'Charging session not found' });
    }
    
    // Check if user is authorized to end this session
    if (req.user.role !== 'admin' && existingSession.userId !== req.user.id) {
      return res.status(403).json({ message: 'You are not authorized to end this charging session' });
    }
    
    // Check if session is already ended
    if (existingSession.endTime) {
      return res.status(400).json({ message: 'Charging session already ended' });
    }
    
    // Update session with end data
    const endTime = new Date();
    const endSoc = req.body.endSoc || null;
    const totalEnergyKwh = req.body.totalEnergyKwh || null;
    const sessionStatus = req.body.sessionStatus || 'completed';
    const energyToGridKwh = req.body.energyToGridKwh || '0';
    const energyToHomeKwh = req.body.energyToHomeKwh || '0';
    const energyFromGridKwh = req.body.energyFromGridKwh || '0';
    const peakChargingRateKw = req.body.peakChargingRateKw || null;
    const peakDischargingRateKw = req.body.peakDischargingRateKw || null;
    const costSavings = req.body.costSavings || null;
    const revenue = req.body.revenue || null;
    const carbonSavingsKg = req.body.carbonSavingsKg || null;
    
    // End the session
    const [updatedSession] = await db
      .update(evChargingSessions)
      .set({
        endTime,
        endSoc,
        totalEnergyKwh,
        sessionStatus,
        energyToGridKwh,
        energyToHomeKwh,
        energyFromGridKwh,
        peakChargingRateKw,
        peakDischargingRateKw,
        costSavings,
        revenue,
        carbonSavingsKg,
        updatedAt: endTime
      })
      .where(eq(evChargingSessions.id, sessionId))
      .returning();
    
    // If this was a V2G session, we may need to log additional data
    if (
      existingSession.chargingMode === 'v2g' || 
      existingSession.chargingMode === 'v2h' ||
      existingSession.chargingMode === 'v2g_scheduled' ||
      existingSession.chargingMode === 'v2h_scheduled' ||
      existingSession.chargingMode === 'bidirectional_optimized'
    ) {
      // Additional V2G/V2H processing could go here
    }
    
    res.json(updatedSession);
  } catch (error) {
    console.error('Error ending charging session:', error);
    res.status(500).json({ message: 'Failed to end charging session' });
  }
}

// V2G Service Providers
export async function getV2GServiceProviders(req: Request, res: Response) {
  try {
    const serviceType = req.query.serviceType as string | undefined;
    const isActive = req.query.active === 'true' ? true : (req.query.active === 'false' ? false : undefined);
    const country = req.query.country as string | undefined;
    
    let query = db.select().from(v2gServiceProviders);
    
    if (serviceType) {
      query = query.where(eq(v2gServiceProviders.serviceType, serviceType));
    }
    
    if (isActive !== undefined) {
      query = query.where(eq(v2gServiceProviders.isActive, isActive));
    }
    
    if (country) {
      query = query.where(eq(v2gServiceProviders.country, country));
    }
    
    const providers = await query.orderBy(v2gServiceProviders.name);
    
    res.json(providers);
  } catch (error) {
    console.error('Error fetching V2G service providers:', error);
    res.status(500).json({ message: 'Failed to fetch V2G service providers' });
  }
}

// V2G Service Enrollments
export async function getServiceEnrollments(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.query.userId ? Number(req.query.userId) : (req.user?.id || null);
    const vehicleId = req.query.vehicleId ? Number(req.query.vehicleId) : null;
    const status = req.query.status as string | undefined;
    
    // If admin and querying other users' enrollments
    if (req.user.role === 'admin' && req.query.userId) {
      // Allow admin to view any user's enrollments
    } else if (userId !== req.user.id) {
      // Non-admin users can only view their own enrollments
      return res.status(403).json({ message: 'You can only view your own service enrollments' });
    }
    
    let query = db.select().from(v2gServiceEnrollments);
    
    if (userId) {
      query = query.where(eq(v2gServiceEnrollments.userId, userId));
    }
    
    if (vehicleId) {
      query = query.where(eq(v2gServiceEnrollments.vehicleId, vehicleId));
    }
    
    if (status) {
      query = query.where(eq(v2gServiceEnrollments.status, status));
    }
    
    const enrollments = await query.orderBy(desc(v2gServiceEnrollments.enrollmentDate));
    
    res.json(enrollments);
  } catch (error) {
    console.error('Error fetching V2G service enrollments:', error);
    res.status(500).json({ message: 'Failed to fetch V2G service enrollments' });
  }
}

export async function createServiceEnrollment(req: AuthenticatedRequest, res: Response) {
  try {
    // Force userId to be the authenticated user's ID unless admin
    if (req.user.role !== 'admin' && req.body.userId && req.body.userId !== req.user.id) {
      return res.status(403).json({ message: 'You can only create enrollments for yourself' });
    }
    
    // Set userId to the authenticated user if not provided
    if (!req.body.userId) {
      req.body.userId = req.user.id;
    }
    
    // Validate the vehicle belongs to the user
    if (req.body.vehicleId) {
      const [vehicle] = await db
        .select()
        .from(evVehicles)
        .where(eq(evVehicles.id, req.body.vehicleId));
      
      if (!vehicle) {
        return res.status(404).json({ message: 'Vehicle not found' });
      }
      
      if (req.user.role !== 'admin' && vehicle.userId !== req.user.id) {
        return res.status(403).json({ message: 'You do not own this vehicle' });
      }
      
      // Check if vehicle is bidirectional capable
      if (!vehicle.bidirectionalCapable) {
        return res.status(400).json({ message: 'Vehicle is not capable of bidirectional charging' });
      }
    }
    
    // Validate the service provider exists and is active
    if (req.body.serviceProviderId) {
      const [provider] = await db
        .select()
        .from(v2gServiceProviders)
        .where(eq(v2gServiceProviders.id, req.body.serviceProviderId));
      
      if (!provider) {
        return res.status(404).json({ message: 'Service provider not found' });
      }
      
      if (!provider.isActive) {
        return res.status(400).json({ message: 'Service provider is not active' });
      }
    }
    
    // Check for existing enrollment with same vehicle and provider
    if (req.body.vehicleId && req.body.serviceProviderId) {
      const [existingEnrollment] = await db
        .select()
        .from(v2gServiceEnrollments)
        .where(and(
          eq(v2gServiceEnrollments.vehicleId, req.body.vehicleId),
          eq(v2gServiceEnrollments.serviceProviderId, req.body.serviceProviderId),
          eq(v2gServiceEnrollments.status, 'active')
        ));
      
      if (existingEnrollment) {
        return res.status(400).json({ message: 'Vehicle is already enrolled with this service provider' });
      }
    }
    
    // Validate input
    const validatedData = insertV2GServiceEnrollmentSchema.parse(req.body);
    
    // Create enrollment
    const [enrollment] = await db
      .insert(v2gServiceEnrollments)
      .values(validatedData)
      .returning();
    
    res.status(201).json(enrollment);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid data', errors: error.errors });
    }
    console.error('Error creating V2G service enrollment:', error);
    res.status(500).json({ message: 'Failed to create V2G service enrollment' });
  }
}

export async function terminateServiceEnrollment(req: AuthenticatedRequest, res: Response) {
  try {
    const enrollmentId = Number(req.params.id);
    
    // Get the existing enrollment
    const [existingEnrollment] = await db
      .select()
      .from(v2gServiceEnrollments)
      .where(eq(v2gServiceEnrollments.id, enrollmentId));
    
    if (!existingEnrollment) {
      return res.status(404).json({ message: 'Service enrollment not found' });
    }
    
    // Check if user is authorized to terminate this enrollment
    if (req.user.role !== 'admin' && existingEnrollment.userId !== req.user.id) {
      return res.status(403).json({ message: 'You are not authorized to terminate this enrollment' });
    }
    
    // Check if enrollment is already terminated
    if (existingEnrollment.status === 'terminated') {
      return res.status(400).json({ message: 'Enrollment is already terminated' });
    }
    
    // Update enrollment status
    const terminationDate = new Date();
    const terminationReason = req.body.terminationReason || 'User requested termination';
    
    // Terminate the enrollment
    const [updatedEnrollment] = await db
      .update(v2gServiceEnrollments)
      .set({
        status: 'terminated',
        terminationDate,
        terminationReason,
        updatedAt: terminationDate
      })
      .where(eq(v2gServiceEnrollments.id, enrollmentId))
      .returning();
    
    // Check for active discharge events and cancel them
    const activeEvents = await db
      .select()
      .from(v2gDischargeEvents)
      .where(and(
        eq(v2gDischargeEvents.enrollmentId, enrollmentId),
        eq(v2gDischargeEvents.eventStatus, 'in_progress')
      ));
    
    if (activeEvents.length > 0) {
      // End all active discharge events
      await db
        .update(v2gDischargeEvents)
        .set({
          endTime: terminationDate,
          eventStatus: 'cancelled',
          completionStatus: 'failure',
          failureReason: 'Enrollment terminated',
          updatedAt: terminationDate
        })
        .where(and(
          eq(v2gDischargeEvents.enrollmentId, enrollmentId),
          eq(v2gDischargeEvents.eventStatus, 'in_progress')
        ));
    }
    
    res.json(updatedEnrollment);
  } catch (error) {
    console.error('Error terminating service enrollment:', error);
    res.status(500).json({ message: 'Failed to terminate service enrollment' });
  }
}

// V2G Statistics and Reporting
export async function getV2GUserStatistics(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.params.userId ? Number(req.params.userId) : req.user.id;
    
    // Check authorization
    if (req.user.role !== 'admin' && userId !== req.user.id) {
      return res.status(403).json({ message: 'You can only view your own statistics' });
    }
    
    // Get total number of vehicles
    const [vehicleCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(evVehicles)
      .where(eq(evVehicles.userId, userId));
    
    // Get total number of bidirectional vehicles
    const [biDirVehicleCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(evVehicles)
      .where(and(
        eq(evVehicles.userId, userId),
        eq(evVehicles.bidirectionalCapable, true)
      ));
    
    // Get total number of active enrollments
    const [enrollmentCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(v2gServiceEnrollments)
      .where(and(
        eq(v2gServiceEnrollments.userId, userId),
        eq(v2gServiceEnrollments.status, 'active')
      ));
    
    // Get total number of discharge events
    const [eventCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(v2gDischargeEvents)
      .innerJoin(v2gServiceEnrollments, 
        eq(v2gDischargeEvents.enrollmentId, v2gServiceEnrollments.id))
      .where(eq(v2gServiceEnrollments.userId, userId));
    
    // Get total energy discharged to grid
    const [gridEnergy] = await db
      .select({ 
        total: sql<string>`COALESCE(SUM(${evChargingSessions.energyToGridKwh}), '0')` 
      })
      .from(evChargingSessions)
      .where(and(
        eq(evChargingSessions.userId, userId),
        not(isNull(evChargingSessions.endTime))
      ));
    
    // Get total energy discharged to home
    const [homeEnergy] = await db
      .select({ 
        total: sql<string>`COALESCE(SUM(${evChargingSessions.energyToHomeKwh}), '0')` 
      })
      .from(evChargingSessions)
      .where(and(
        eq(evChargingSessions.userId, userId),
        not(isNull(evChargingSessions.endTime))
      ));
    
    // Get total revenue
    const [revenue] = await db
      .select({ 
        total: sql<string>`COALESCE(SUM(${evChargingSessions.revenue}), '0')` 
      })
      .from(evChargingSessions)
      .where(and(
        eq(evChargingSessions.userId, userId),
        not(isNull(evChargingSessions.endTime))
      ));
    
    // Get total cost savings
    const [savings] = await db
      .select({ 
        total: sql<string>`COALESCE(SUM(${evChargingSessions.costSavings}), '0')` 
      })
      .from(evChargingSessions)
      .where(and(
        eq(evChargingSessions.userId, userId),
        not(isNull(evChargingSessions.endTime))
      ));
    
    // Get total carbon savings
    const [carbon] = await db
      .select({ 
        total: sql<string>`COALESCE(SUM(${evChargingSessions.carbonSavingsKg}), '0')` 
      })
      .from(evChargingSessions)
      .where(and(
        eq(evChargingSessions.userId, userId),
        not(isNull(evChargingSessions.endTime))
      ));
    
    res.json({
      totalVehicles: vehicleCount.count,
      bidirectionalVehicles: biDirVehicleCount.count,
      activeEnrollments: enrollmentCount.count,
      dischargeEvents: eventCount.count,
      totalEnergyToGridKwh: Number(gridEnergy.total),
      totalEnergyToHomeKwh: Number(homeEnergy.total),
      totalRevenue: Number(revenue.total),
      totalCostSavings: Number(savings.total),
      totalCarbonSavingsKg: Number(carbon.total)
    });
  } catch (error) {
    console.error('Error fetching V2G statistics:', error);
    res.status(500).json({ message: 'Failed to fetch V2G statistics' });
  }
}