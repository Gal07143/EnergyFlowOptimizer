/**
 * VPP Controller
 * Handles API routes for Virtual Power Plant functionality
 */

import { Request, Response } from 'express';
import { getVPPService } from '../services/vppService';
import { getSiteManagementService } from '../services/siteManagementService';
import { getMqttService } from '../services/mqttService';

export class VPPController {
  /**
   * Get all VPP programs
   */
  static async getAllPrograms(req: Request, res: Response) {
    try {
      const vppService = getVPPService();
      const programs = vppService.getAllPrograms();
      
      res.status(200).json(programs);
    } catch (error) {
      console.error('Error getting VPP programs:', error);
      res.status(500).json({ error: 'Failed to retrieve VPP programs' });
    }
  }
  
  /**
   * Get active VPP programs
   */
  static async getActivePrograms(req: Request, res: Response) {
    try {
      const vppService = getVPPService();
      const programs = vppService.getActivePrograms();
      
      res.status(200).json(programs);
    } catch (error) {
      console.error('Error getting active VPP programs:', error);
      res.status(500).json({ error: 'Failed to retrieve active VPP programs' });
    }
  }
  
  /**
   * Get a VPP program by ID
   */
  static async getProgramById(req: Request, res: Response) {
    try {
      const programId = parseInt(req.params.id);
      if (isNaN(programId)) {
        return res.status(400).json({ error: 'Invalid program ID' });
      }
      
      const vppService = getVPPService();
      const program = vppService.getProgram(programId);
      
      if (!program) {
        return res.status(404).json({ error: 'Program not found' });
      }
      
      res.status(200).json(program);
    } catch (error) {
      console.error(`Error getting VPP program ${req.params.id}:`, error);
      res.status(500).json({ error: 'Failed to retrieve VPP program' });
    }
  }
  
  /**
   * Create a new VPP program
   */
  static async createProgram(req: Request, res: Response) {
    try {
      const vppService = getVPPService();
      const program = vppService.createProgram(req.body);
      
      res.status(201).json(program);
    } catch (error) {
      console.error('Error creating VPP program:', error);
      res.status(500).json({ error: 'Failed to create VPP program' });
    }
  }
  
  /**
   * Update a VPP program
   */
  static async updateProgram(req: Request, res: Response) {
    try {
      const programId = parseInt(req.params.id);
      if (isNaN(programId)) {
        return res.status(400).json({ error: 'Invalid program ID' });
      }
      
      const vppService = getVPPService();
      const updatedProgram = vppService.updateProgram(programId, req.body);
      
      if (!updatedProgram) {
        return res.status(404).json({ error: 'Program not found' });
      }
      
      res.status(200).json(updatedProgram);
    } catch (error) {
      console.error(`Error updating VPP program ${req.params.id}:`, error);
      res.status(500).json({ error: 'Failed to update VPP program' });
    }
  }
  
  /**
   * Delete a VPP program
   */
  static async deleteProgram(req: Request, res: Response) {
    try {
      const programId = parseInt(req.params.id);
      if (isNaN(programId)) {
        return res.status(400).json({ error: 'Invalid program ID' });
      }
      
      const vppService = getVPPService();
      const success = vppService.deleteProgram(programId);
      
      if (!success) {
        return res.status(404).json({ error: 'Program not found' });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error(`Error deleting VPP program ${req.params.id}:`, error);
      res.status(500).json({ error: 'Failed to delete VPP program' });
    }
  }
  
  /**
   * Get enrollments for a site
   */
  static async getSiteEnrollments(req: Request, res: Response) {
    try {
      const siteId = parseInt(req.params.siteId);
      if (isNaN(siteId)) {
        return res.status(400).json({ error: 'Invalid site ID' });
      }
      
      const vppService = getVPPService();
      const enrollments = vppService.getEnrollmentsBySite(siteId);
      
      res.status(200).json(enrollments);
    } catch (error) {
      console.error(`Error getting enrollments for site ${req.params.siteId}:`, error);
      res.status(500).json({ error: 'Failed to retrieve site enrollments' });
    }
  }
  
  /**
   * Get enrollments for a program
   */
  static async getProgramEnrollments(req: Request, res: Response) {
    try {
      const programId = parseInt(req.params.programId);
      if (isNaN(programId)) {
        return res.status(400).json({ error: 'Invalid program ID' });
      }
      
      const vppService = getVPPService();
      const enrollments = vppService.getEnrollmentsByProgram(programId);
      
      res.status(200).json(enrollments);
    } catch (error) {
      console.error(`Error getting enrollments for program ${req.params.programId}:`, error);
      res.status(500).json({ error: 'Failed to retrieve program enrollments' });
    }
  }
  
  /**
   * Enroll a site in a VPP program
   */
  static async enrollSite(req: Request, res: Response) {
    try {
      const vppService = getVPPService();
      const enrollment = vppService.enrollSite(req.body);
      
      // Notify the site about the enrollment
      const mqttService = getMqttService();
      mqttService.publish(`vpp/sites/${enrollment.siteId}/enrollments/created`, {
        messageType: 'vpp_enrollment_created',
        timestamp: new Date().toISOString(),
        enrollment
      });
      
      res.status(201).json(enrollment);
    } catch (error) {
      console.error('Error enrolling site in VPP program:', error);
      res.status(500).json({ error: 'Failed to enroll site' });
    }
  }
  
  /**
   * Update an enrollment
   */
  static async updateEnrollment(req: Request, res: Response) {
    try {
      const enrollmentId = parseInt(req.params.id);
      if (isNaN(enrollmentId)) {
        return res.status(400).json({ error: 'Invalid enrollment ID' });
      }
      
      const vppService = getVPPService();
      const updatedEnrollment = vppService.updateEnrollment(enrollmentId, req.body);
      
      if (!updatedEnrollment) {
        return res.status(404).json({ error: 'Enrollment not found' });
      }
      
      // Notify the site about the enrollment update
      const mqttService = getMqttService();
      mqttService.publish(`vpp/sites/${updatedEnrollment.siteId}/enrollments/updated`, {
        messageType: 'vpp_enrollment_updated',
        timestamp: new Date().toISOString(),
        enrollment: updatedEnrollment
      });
      
      res.status(200).json(updatedEnrollment);
    } catch (error) {
      console.error(`Error updating enrollment ${req.params.id}:`, error);
      res.status(500).json({ error: 'Failed to update enrollment' });
    }
  }
  
  /**
   * Unenroll a site from a VPP program
   */
  static async unenrollSite(req: Request, res: Response) {
    try {
      const enrollmentId = parseInt(req.params.id);
      if (isNaN(enrollmentId)) {
        return res.status(400).json({ error: 'Invalid enrollment ID' });
      }
      
      const vppService = getVPPService();
      
      // Get enrollment before deleting it to have the site ID for notifications
      const enrollment = vppService.getEnrollmentsBySite(1)
        .find(e => e.id === enrollmentId);
      
      if (!enrollment) {
        return res.status(404).json({ error: 'Enrollment not found' });
      }
      
      const success = vppService.unenrollSite(enrollmentId);
      
      if (!success) {
        return res.status(404).json({ error: 'Enrollment not found' });
      }
      
      // Notify the site about the unenrollment
      const mqttService = getMqttService();
      mqttService.publish(`vpp/sites/${enrollment.siteId}/enrollments/deleted`, {
        messageType: 'vpp_enrollment_deleted',
        timestamp: new Date().toISOString(),
        enrollmentId
      });
      
      res.status(204).send();
    } catch (error) {
      console.error(`Error unenrolling site from VPP program, enrollment ${req.params.id}:`, error);
      res.status(500).json({ error: 'Failed to unenroll site' });
    }
  }
  
  /**
   * Get all VPP events
   */
  static async getAllEvents(req: Request, res: Response) {
    try {
      const vppService = getVPPService();
      const events = vppService.getAllEvents();
      
      res.status(200).json(events);
    } catch (error) {
      console.error('Error getting VPP events:', error);
      res.status(500).json({ error: 'Failed to retrieve VPP events' });
    }
  }
  
  /**
   * Get active VPP events
   */
  static async getActiveEvents(req: Request, res: Response) {
    try {
      const vppService = getVPPService();
      const events = vppService.getActiveEvents();
      
      res.status(200).json(events);
    } catch (error) {
      console.error('Error getting active VPP events:', error);
      res.status(500).json({ error: 'Failed to retrieve active VPP events' });
    }
  }
  
  /**
   * Get upcoming VPP events
   */
  static async getUpcomingEvents(req: Request, res: Response) {
    try {
      const vppService = getVPPService();
      const events = vppService.getUpcomingEvents();
      
      res.status(200).json(events);
    } catch (error) {
      console.error('Error getting upcoming VPP events:', error);
      res.status(500).json({ error: 'Failed to retrieve upcoming VPP events' });
    }
  }
  
  /**
   * Get VPP events for a site
   */
  static async getSiteEvents(req: Request, res: Response) {
    try {
      const siteId = parseInt(req.params.siteId);
      if (isNaN(siteId)) {
        return res.status(400).json({ error: 'Invalid site ID' });
      }
      
      const vppService = getVPPService();
      const events = vppService.getEventsBySite(siteId);
      
      res.status(200).json(events);
    } catch (error) {
      console.error(`Error getting VPP events for site ${req.params.siteId}:`, error);
      res.status(500).json({ error: 'Failed to retrieve site VPP events' });
    }
  }
  
  /**
   * Get VPP events for a program
   */
  static async getProgramEvents(req: Request, res: Response) {
    try {
      const programId = parseInt(req.params.programId);
      if (isNaN(programId)) {
        return res.status(400).json({ error: 'Invalid program ID' });
      }
      
      const vppService = getVPPService();
      const events = vppService.getEventsByProgram(programId);
      
      res.status(200).json(events);
    } catch (error) {
      console.error(`Error getting VPP events for program ${req.params.programId}:`, error);
      res.status(500).json({ error: 'Failed to retrieve program VPP events' });
    }
  }
  
  /**
   * Create a new VPP event
   */
  static async createEvent(req: Request, res: Response) {
    try {
      const vppService = getVPPService();
      const event = vppService.createEvent(req.body);
      
      // No need to explicitly notify sites here as the createEvent method
      // already handles notifications unless explicitly disabled
      
      res.status(201).json(event);
    } catch (error) {
      console.error('Error creating VPP event:', error);
      res.status(500).json({ error: 'Failed to create VPP event' });
    }
  }
  
  /**
   * Update a VPP event
   */
  static async updateEvent(req: Request, res: Response) {
    try {
      const eventId = parseInt(req.params.id);
      if (isNaN(eventId)) {
        return res.status(400).json({ error: 'Invalid event ID' });
      }
      
      const vppService = getVPPService();
      const existingEvent = vppService.getEventsBySite(1)
        .find(e => e.id === eventId);
      
      if (!existingEvent) {
        return res.status(404).json({ error: 'Event not found' });
      }
      
      const updatedEvent = vppService.updateEvent(eventId, req.body);
      
      if (!updatedEvent) {
        return res.status(404).json({ error: 'Event not found' });
      }
      
      // Notify participating sites about the update
      const mqttService = getMqttService();
      for (const siteId of updatedEvent.participatingSites) {
        mqttService.publish(`vpp/sites/${siteId}/events/${eventId}/updated`, {
          messageType: 'vpp_event_updated',
          timestamp: new Date().toISOString(),
          event: updatedEvent
        });
      }
      
      res.status(200).json(updatedEvent);
    } catch (error) {
      console.error(`Error updating VPP event ${req.params.id}:`, error);
      res.status(500).json({ error: 'Failed to update VPP event' });
    }
  }
  
  /**
   * Cancel a VPP event
   */
  static async cancelEvent(req: Request, res: Response) {
    try {
      const eventId = parseInt(req.params.id);
      if (isNaN(eventId)) {
        return res.status(400).json({ error: 'Invalid event ID' });
      }
      
      const vppService = getVPPService();
      const updatedEvent = vppService.cancelEvent(eventId);
      
      if (!updatedEvent) {
        return res.status(404).json({ error: 'Event not found or cannot be cancelled' });
      }
      
      res.status(200).json(updatedEvent);
    } catch (error) {
      console.error(`Error cancelling VPP event ${req.params.id}:`, error);
      res.status(500).json({ error: 'Failed to cancel VPP event' });
    }
  }
  
  /**
   * Accept a VPP event for a site
   */
  static async acceptEvent(req: Request, res: Response) {
    try {
      const eventId = parseInt(req.params.eventId);
      const siteId = parseInt(req.params.siteId);
      
      if (isNaN(eventId) || isNaN(siteId)) {
        return res.status(400).json({ error: 'Invalid event ID or site ID' });
      }
      
      const vppService = getVPPService();
      const participation = vppService.acceptEvent(eventId, siteId, req.body.capacity);
      
      if (!participation) {
        return res.status(404).json({ error: 'Event not found, not upcoming, or site not enrolled' });
      }
      
      res.status(200).json(participation);
    } catch (error) {
      console.error(`Error accepting VPP event ${req.params.eventId} for site ${req.params.siteId}:`, error);
      res.status(500).json({ error: 'Failed to accept VPP event' });
    }
  }
  
  /**
   * Reject a VPP event for a site
   */
  static async rejectEvent(req: Request, res: Response) {
    try {
      const eventId = parseInt(req.params.eventId);
      const siteId = parseInt(req.params.siteId);
      
      if (isNaN(eventId) || isNaN(siteId)) {
        return res.status(400).json({ error: 'Invalid event ID or site ID' });
      }
      
      const vppService = getVPPService();
      const participation = vppService.rejectEvent(eventId, siteId);
      
      if (!participation) {
        return res.status(404).json({ error: 'Event not found, not upcoming, or site not enrolled' });
      }
      
      res.status(200).json(participation);
    } catch (error) {
      console.error(`Error rejecting VPP event ${req.params.eventId} for site ${req.params.siteId}:`, error);
      res.status(500).json({ error: 'Failed to reject VPP event' });
    }
  }
  
  /**
   * Get participations for an event
   */
  static async getEventParticipations(req: Request, res: Response) {
    try {
      const eventId = parseInt(req.params.eventId);
      if (isNaN(eventId)) {
        return res.status(400).json({ error: 'Invalid event ID' });
      }
      
      const vppService = getVPPService();
      const participations = vppService.getParticipationsByEvent(eventId);
      
      res.status(200).json(participations);
    } catch (error) {
      console.error(`Error getting participations for event ${req.params.eventId}:`, error);
      res.status(500).json({ error: 'Failed to retrieve event participations' });
    }
  }
  
  /**
   * Get participations for a site
   */
  static async getSiteParticipations(req: Request, res: Response) {
    try {
      const siteId = parseInt(req.params.siteId);
      if (isNaN(siteId)) {
        return res.status(400).json({ error: 'Invalid site ID' });
      }
      
      const vppService = getVPPService();
      const participations = vppService.getParticipationsBySite(siteId);
      
      res.status(200).json(participations);
    } catch (error) {
      console.error(`Error getting participations for site ${req.params.siteId}:`, error);
      res.status(500).json({ error: 'Failed to retrieve site participations' });
    }
  }
  
  /**
   * Get metrics for a participation
   */
  static async getParticipationMetrics(req: Request, res: Response) {
    try {
      const participationId = parseInt(req.params.participationId);
      if (isNaN(participationId)) {
        return res.status(400).json({ error: 'Invalid participation ID' });
      }
      
      const vppService = getVPPService();
      const metrics = vppService.getMetricsByParticipation(participationId);
      
      res.status(200).json(metrics);
    } catch (error) {
      console.error(`Error getting metrics for participation ${req.params.participationId}:`, error);
      res.status(500).json({ error: 'Failed to retrieve participation metrics' });
    }
  }
  
  /**
   * Get latest metrics for a participation
   */
  static async getLatestParticipationMetrics(req: Request, res: Response) {
    try {
      const participationId = parseInt(req.params.participationId);
      if (isNaN(participationId)) {
        return res.status(400).json({ error: 'Invalid participation ID' });
      }
      
      const vppService = getVPPService();
      const metrics = vppService.getLatestMetricsByParticipation(participationId);
      
      if (!metrics) {
        return res.status(404).json({ error: 'No metrics found for this participation' });
      }
      
      res.status(200).json(metrics);
    } catch (error) {
      console.error(`Error getting latest metrics for participation ${req.params.participationId}:`, error);
      res.status(500).json({ error: 'Failed to retrieve latest participation metrics' });
    }
  }
}