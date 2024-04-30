import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Knex } from 'knex';
import { Resend } from 'resend';
import { render } from '@react-email/render';
import Invitation from './invitation';
import { backOff } from 'exponential-backoff';

export class Event {
  id: string;
  name: string;
  description: string;
  startDate: string;
  location: string;
  endDate: string;
  url: string;
  organizer: string;
}

export class Invitee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  eventId: string;
  orderId: string;
  ticketType: string;
  companyName: string;
}

export class Order {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  eventId: string;
  status: string;
  createdAt: string;
}

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  constructor(
    @Inject('KnexConnection') private readonly knex: Knex,
    private configService: ConfigService,
  ) {}

  async createEvent(event: Event): Promise<void> {
    await this.knex('event').insert({
      id: event.id,
      name: event.name,
      description: event.description,
      startDate: event.startDate,
      endDate: event.endDate,
      url: event.url,
    });
  }

  async getEvents(): Promise<Event[]> {
    return this.knex('event').select('*');
  }

  async getEventById(id: string): Promise<Event> {
    return this.knex('event').where('id', id).first();
  }

  async getInviteeByOrderId(orderId: string, poll: boolean): Promise<Invitee> {
    let invitee;

    this.logger.log('Polling for invitee with order Id %s.', orderId);

    const invitees = await this.knex('invitee').select('*');
    this.logger.log('Invitees: %o', invitees);

    if (poll) {
      try {
        invitee = await backOff(async () => {
          const result = await this.knex('invitee')
            .where('orderId', orderId)
            .first();

          if (!result) {
            throw new Error('Invitee not found');
          }

          return result;
        });
      } catch (error) {
        this.logger.error(
          'Invitee not found after exponential backoff. Order Id %s.',
          orderId,
        );
        return null;
      }
    }

    invitee = await this.knex('invitee').where('orderId', orderId).first();

    return invitee;
  }

  async getOrdersByEventId(eventId: string): Promise<Order[]> {
    return this.knex('order').where('eventId', eventId);
  }

  async getInviteesByEventId(eventId: string): Promise<Invitee[]> {
    return this.knex('invitee').where('eventId', eventId);
  }

  async createOrUpdateEvent(event: Event): Promise<void> {
    const existingEvent = await this.knex('event')
      .where('id', event.id)
      .first();

    if (existingEvent) {
      await this.knex('event').where('id', event.id).update({
        name: event.name,
        description: event.description,
        startDate: event.startDate,
        endDate: event.endDate,
        url: event.url,
        location: event.location,
        organizer: event.organizer,
      });
    } else {
      await this.knex('event').insert({
        id: event.id,
        name: event.name,
        description: event.description,
        startDate: event.startDate,
        endDate: event.endDate,
        url: event.url,
        location: event.location,
        organizer: event.organizer,
      });
    }
  }

  async createOrUpdateOrder(order: Order): Promise<void> {
    const existingOrder = await this.knex('order')
      .where('id', order.id)
      .first();

    if (existingOrder) {
      await this.knex('order').where('id', order.id).update({
        firstName: order.firstName,
        lastName: order.lastName,
        email: order.email,
        eventId: order.eventId,
        status: order.status,
        createdAt: order.createdAt,
      });
    } else {
      await this.knex('order').insert({
        id: order.id,
        firstName: order.firstName,
        lastName: order.lastName,
        email: order.email,
        eventId: order.eventId,
        status: order.status,
        createdAt: order.createdAt,
      });
    }
  }

  async createOrUpdateInvitee(invitee: Invitee): Promise<void> {
    const existingInvitee = await this.knex('invitee')
      .where('id', invitee.id)
      .first();

    this.logger.debug('Creating invitee %o', invitee);
    if (existingInvitee) {
      this.logger.debug('Updating invitee %o', invitee);
      await this.knex('invitee').where('id', invitee.id).update({
        firstName: invitee.firstName,
        lastName: invitee.lastName,
        email: invitee.email,
        eventId: invitee.eventId,
        company: invitee.companyName,
        orderId: invitee.orderId,
        ticketType: invitee.ticketType,
      });
    } else {
      this.logger.debug('Inserting invitee %o', invitee);
      await this.knex('invitee').insert({
        id: invitee.id,
        firstName: invitee.firstName,
        lastName: invitee.lastName,
        email: invitee.email,
        company: invitee.companyName,
        eventId: invitee.eventId,
        orderId: invitee.orderId,
        ticketType: invitee.ticketType,
      });

      await this.sendConfirmationEmail(invitee);
    }
  }

  async sendConfirmationEmail(invitee: Invitee): Promise<void> {
    const resend = new Resend(this.configService.getOrThrow('RESEND_API_KEY'));

    const result = await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: 'vbermudez@infuy.com',
      subject: 'Aquí está tu invitación',
      text: `Hola ${invitee.firstName} ${invitee.lastName}, aquí está tu invitación: https://example.com/invite/${invitee.id}`,
      html: render(
        Invitation({
          url: `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${invitee.id}`,
        }),
      ),
    });
  }

  async getInviteeById(id: string): Promise<Invitee> {
    return this.knex('invitee').where('id', id).first();
  }

  async clearTables(): Promise<void> {
    await this.knex('invitee').truncate();
    await this.knex('order').truncate();
    await this.knex('event').truncate();
  }
}
