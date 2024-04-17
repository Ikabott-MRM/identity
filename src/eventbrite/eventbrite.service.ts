import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Invitee, Event, EventsService } from '../events/events.service';

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

class EventbriteAttendee {
  id: string;
  profile: {
    first_name: string;
    last_name: string;
    email: string;
  };
  event_id: string;
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

  async syncAttendee(apiUrl: string): Promise<Invitee> {
    const attendee = await this.getAttendee(apiUrl);
    await this.eventsService.createOrUpdateInvitee(attendee);
    return attendee;
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

  async getAttendee(apiUrl: string): Promise<Invitee> {
    const res = await fetch(apiUrl, {
      headers: {
        Authorization: `Bearer ${this.configService.getOrThrow('EVENTBRITE_PRIVATE_TOKEN')}`,
      },
    });

    const data = (await res.json()) as EventbriteAttendee;

    return {
      id: data.id,
      firstName: data.profile.first_name,
      lastName: data.profile.last_name,
      email: data.profile.email,
      eventId: data.event_id,
    };
  }
}
