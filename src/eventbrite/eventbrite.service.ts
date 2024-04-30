import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Invitee, Event, EventsService, Order } from '../events/events.service';

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
    question_id: string;
    answer: string;
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

@Injectable()
export class EventbriteService {
  private readonly logger = new Logger(EventbriteService.name);

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
    return attendee;
  }

  async syncOrder(apiUrl: string): Promise<Order> {
    const order = await this.getOrder(apiUrl);
    await this.eventsService.createOrUpdateOrder(order);
    return order;
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

    const questions =
      json.questions?.reduce((acc, question) => {
        acc[question.id] = question.label.toLowerCase();
        return acc;
      }, {}) || {};

    const answers =
      json.answers?.reduce((acc, answer) => {
        const question = questions[answer.question_id];
        acc[question] = answer.answer;
        return acc;
      }, {}) || {};

    return {
      id: attendee.id,
      firstName: attendee.profile.first_name,
      lastName: attendee.profile.last_name,
      email: attendee.profile.email,
      eventId: attendee.event_id,
      orderId: attendee.order_id,
      ticketType: attendee.ticket_class_name,
      companyName: answers['empresa'],
    };
  }
}
