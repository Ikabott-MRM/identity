import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Event, EventsService } from '../events/events.service';

class EventbriteEvent {
  id: string;
  name: string;
  description: {
    text: string;
  };
  start: {
    utc: string;
  };
  end: {
    utc: string;
  };
  url: string;
}

@Injectable()
export class EventbriteService {
  constructor(
    private configService: ConfigService,
    private eventsService: EventsService,
  ) {}

  async syncEvents(apiUrl: string): Promise<Event> {
    const event = await this.getEvent(apiUrl);
    await this.eventsService.createOrUpdateEvent(event);
    return event;
  }

  async getEvent(apiUrl: string): Promise<Event> {
    const res = await fetch(apiUrl, {
      headers: {
        Authorization: `Bearer ${this.configService.getOrThrow('EVENTBRITE_PRIVATE_TOKEN')}`,
      },
    });

    const data = (await res.json()) as EventbriteEvent;

    return {
      id: data.id,
      name: data.name,
      description: data.description.text,
      startDate: data.start.utc,
      endDate: data.end.utc,
      url: data.url,
    };
  }
}
