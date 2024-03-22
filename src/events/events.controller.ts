import { Controller, Get, Post } from '@nestjs/common';

@Controller('events')
export class EventsController {
  @Get('/')
  async getEvents(): Promise<void> {
    // Return all active events
    return null;
  }

  @Post('/')
  async createEvent(): Promise<void> {
    // Create a new event
    return null;
  }

  @Post(':eventId/assistance')
  async createAttendanceProof(): Promise<void> {
    // Validate VC for member from DID (from req)
    // If VC is of invitation type -> invalidate VC
    // Generate a new assistance VC for the event and assign to member
    return null;
  }

  // /events/{eventId}/invite
  // create invitation (VC) for member
  @Post(':eventId/invite')
  async createInvitation(): Promise<void> {
    return null;
  }
}
