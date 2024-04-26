import { Controller, Get, Post } from '@nestjs/common';
import { Event, EventsService } from './events.service';

@Controller('events')
export class EventsController {
  constructor(private eventsService: EventsService) {}

  @Get('/')
  async getEvents(): Promise<Event[]> {
    const events = await this.eventsService.getEvents();
    return events;
  }
}
