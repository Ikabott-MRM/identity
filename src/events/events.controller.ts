import { Controller, Get, Post } from '@nestjs/common';

@Controller('events')
export class EventsController {
  @Get('/')
  async getEvents(): Promise<void> {
    return null;
  }

  @Post('/')
  async createEvent(): Promise<void> {
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
