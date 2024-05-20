import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Knex } from 'knex';
import { Resend } from 'resend';
import { render } from '@react-email/render';
import InvitationEmail from './invitation';
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

export class Person {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  company: string;
  position: string;
  memberId: string;
}

export class Invitation {
  id: string;
  personId: string;
  eventId: string;
  ticketType: string;
  orderId: string;
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
        organizer: event.organizer,
        location: event.location,
        url: event.url,
      });
    } else {
      await this.knex('event').insert({
        id: event.id,
        name: event.name,
        description: event.description,
        startDate: event.startDate,
        endDate: event.endDate,
        organizer: event.organizer,
        location: event.location,
        url: event.url,
      });
    }
  }

  async getEvents(): Promise<Event[]> {
    return this.knex('event').select('*');
  }

  async createOrUpdatePerson(person: Person): Promise<void> {
    const existingPerson = await this.knex('person')
      .where('id', person.id)
      .first();

    if (existingPerson) {
      await this.knex('person').where('id', person.id).update({
        firstName: person.firstName,
        lastName: person.lastName,
        email: person.email,
        company: person.company,
        position: person.position,
        memberId: person.memberId,
      });
    } else {
      await this.knex('person').insert({
        id: person.id,
        firstName: person.firstName,
        lastName: person.lastName,
        email: person.email,
        company: person.company,
        position: person.position,
        memberId: person.memberId,
      });
    }
  }

  async createOrUpdateInvitation(invitation: Invitation): Promise<void> {
    const existingInvitation = await this.knex('invitation')
      .where('id', invitation.id)
      .first();

    if (existingInvitation) {
      await this.knex('invitation').where('id', invitation.id).update({
        personId: invitation.personId,
        eventId: invitation.eventId,
        ticketType: invitation.ticketType,
        orderId: invitation.orderId,
      });
    } else {
      await this.knex('invitation').insert({
        id: invitation.id,
        personId: invitation.personId,
        eventId: invitation.eventId,
        ticketType: invitation.ticketType,
        orderId: invitation.orderId,
      });

      await this.sendConfirmationEmail(invitation);
    }
  }

  async getInvitationByOrderId(
    orderId: string,
    poll: boolean,
  ): Promise<Invitation> {
    let invitation;

    this.logger.log('Polling for invitation with order Id %s.', orderId);

    const invitees = await this.knex('invitation').select('*');
    this.logger.log('Invitations: %o', invitees);

    if (poll) {
      try {
        invitation = await backOff(async () => {
          const result = await this.knex('invitation')
            .where('orderId', orderId)
            .first();

          if (!result) {
            throw new Error('Invitation not found');
          }

          return result;
        });
      } catch (error) {
        this.logger.error(
          'Invitation not found after exponential backoff. Order Id %s.',
          orderId,
        );
        return null;
      }
    }

    invitation = await this.knex('invitation')
      .where('orderId', orderId)
      .first();

    return invitation;
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

  async sendConfirmationEmail(invitation: Invitation): Promise<void> {
    const resend = new Resend(this.configService.getOrThrow('RESEND_API_KEY'));

    const person = await this.getPersonById(invitation.personId);
    const event = await this.getEventById(invitation.eventId);

    const result = await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: person.email,
      subject: 'Aquí está tu invitación',
      text: `Hola ${person.firstName} ${person.lastName}, aquí está tu invitación para el evento ${event.name}: https://example.com/invite/${invitation.id}`,
      html: render(
        InvitationEmail({
          url: `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${invitation.id}`,
        }),
      ),
    });
  }

  async getEventById(id: string): Promise<Event> {
    return this.knex('event').where('id', id).first();
  }

  async getPersonById(id: string): Promise<Person> {
    return this.knex('person').where('id', id).first();
  }

  async getInvitationById(id: string): Promise<Invitation> {
    return this.knex('invitation').where('id', id).first();
  }

  async getInvitationsByEventId(eventId: string): Promise<Invitation[]> {
    return this.knex('invitation').where('eventId', eventId);
  }

  async getOrdersByEventId(eventId: string): Promise<Order[]> {
    return this.knex('order').where('eventId', eventId);
  }

  async clearTables(): Promise<void> {
    await this.knex('invitation').truncate();
    await this.knex('person').truncate();
    await this.knex('order').truncate();
    await this.knex('event').truncate();
  }
}