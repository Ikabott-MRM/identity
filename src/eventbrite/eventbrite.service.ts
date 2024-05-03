import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Invitee, Event, EventsService, Order } from '../events/events.service';

class EventbriteEvent {
  id: string;
  name: {
    text: string;
    html: string;
  };
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
  venue_id: string;
}

class EventbriteAttendee {
  id: string;
  order_id: string;
  profile: {
    first_name: string;
    last_name: string;
    email: string;
  };
  event_id: string;
  questions: {
    id: string;
    label: string;
  }[];
  answers: {
    question: string;
    answer: string;
    type: string;
    question_id: string;
  }[];
  ticket_class_name: string;
}

class EventbriteTicket {
  description: string;
  name: string;
  display_name: string;
}

class EventbriteOrder {
  id: string;
  name: string;
  first_name: string;
  last_name: string;
  created: string;
  event_id: string;
  status: string;
  email: string;
}

class EventbriteVenue {
  name: string;
  address: {
    address_1: string;
    address_2: string;
    city: string;
    region: string;
    postal_code: string;
    country: string;
    latitude: string;
    longitude: string;
  };
}

@Injectable()
export class EventbriteService {
  private readonly logger = new Logger(EventbriteService.name);
  private readonly url = 'https://www.eventbriteapi.com/v3';

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
    await this.syncEvents(`${this.url}/events/${attendee.eventId}/`);
    return attendee;
  }

  async syncOrder(apiUrl: string): Promise<Order> {
    const order = await this.getOrder(apiUrl);
    await this.eventsService.createOrUpdateOrder(order);
    return order;
  }

  async getEvent(apiUrl: string): Promise<Event> {
    const eventRes = await fetch(apiUrl, {
      headers: {
        Authorization: `Bearer ${this.configService.getOrThrow('EVENTBRITE_PRIVATE_TOKEN')}`,
      },
    });

    const event = (await eventRes.json()) as EventbriteEvent;

    const venueRes = await fetch(`${this.url}/venues/${event.venue_id}/`, {
      headers: {
        Authorization: `Bearer ${this.configService.getOrThrow('EVENTBRITE_PRIVATE_TOKEN')}`,
      },
    });

    const venue = (await venueRes.json()) as EventbriteVenue;

    return {
      id: event.id,
      name: event.name.text,
      description: event.description.text,
      startDate: event.start.utc,
      endDate: event.end.utc,
      url: event.url,
      location: venue.name,
      organizer: 'CACE',
    };
  }

  async getTicketType(eventId: string, ticketId: string): Promise<string> {
    const res = await fetch(
      `https://www.eventbriteapi.com/v3/events/${eventId}/ticket_classes/${ticketId}`,
      {
        headers: {
          Authorization: `Bearer ${this.configService.getOrThrow('EVENTBRITE_PRIVATE_TOKEN')}`,
        },
      },
    );

    const data = (await res.json()) as EventbriteTicket;

    return data.name;
  }

  async getOrder(apiUrl: string): Promise<Order> {
    const res = await fetch(apiUrl, {
      headers: {
        Authorization: `Bearer ${this.configService.getOrThrow('EVENTBRITE_PRIVATE_TOKEN')}`,
      },
    });

    const data = (await res.json()) as EventbriteOrder;

    return {
      id: data.id,
      firstName: data.name,
      lastName: data.last_name,
      createdAt: data.created,
      email: data.email,
      eventId: data.event_id,
      status: data.status,
    };
  }

  async getAttendee(apiUrl: string): Promise<Invitee> {
    const res = await fetch(apiUrl, {
      headers: {
        Authorization: `Bearer ${this.configService.getOrThrow('EVENTBRITE_PRIVATE_TOKEN')}`,
      },
    });

    if (!res.ok) {
      this.logger.error(
        `Failed to fetch attendee from ${apiUrl}. Response: ${JSON.stringify(await res.text())}`,
      );

      throw new Error('Failed to fetch attendee');
    }

    const json = await res.json();

    this.logger.log(
      `Fetched attendee from ${apiUrl}. Response: ${JSON.stringify(json)}`,
    );

    const attendee = json as EventbriteAttendee;

    // Find the answer for the "Empresa" question
    const empresaAnswer = attendee.answers.find(
      (answer) => answer.question.toLocaleLowerCase() === 'empresa',
    )?.answer;

    this.logger.log(`Empresa answer: ${empresaAnswer}`);

    return {
      id: attendee.id,
      firstName: attendee.profile.first_name,
      lastName: attendee.profile.last_name,
      email: attendee.profile.email,
      eventId: attendee.event_id,
      orderId: attendee.order_id,
      ticketType: attendee.ticket_class_name,
      companyName: empresaAnswer || '',
    };
  }
}
