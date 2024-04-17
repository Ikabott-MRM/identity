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
    return null;
  }

  @Post(':eventId/invite')
  async createInvitation(): Promise<void> {
    return null;
  }
}
